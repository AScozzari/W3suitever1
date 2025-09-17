#!/usr/bin/env node

/**
 * Validation script to ensure correct schema import paths
 */

import fs from 'fs';
import path from 'path';

const violations = [];
let hasViolations = false;

// Correct import patterns
const CORRECT_PATTERNS = {
  backend: /from ['"]\.\.\/.*\/db\/schema/,
  backendAbsolute: /from ['"]apps\/backend\/api\/src\/db\/schema/,
  backendAlias: /from ['"]@\/db\/schema/,
};

// Incorrect patterns
const INCORRECT_PATTERNS = [
  /from ['"].*shared\/schema/,
  /from ['"]@shared\/schema/,
  /from ['"]\.\.\/shared\//,
  /from ['"].*\/schema\.ts['"]/, // Direct schema.ts imports instead of specific schema files
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'attached_assets'];

function checkSchemaImports(filePath, content, lines) {
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Check for schema imports
    if (line.includes('schema') && line.includes('import')) {
      let isCorrect = false;
      let isIncorrect = false;
      
      // Check against correct patterns
      Object.values(CORRECT_PATTERNS).forEach(pattern => {
        if (pattern.test(line)) {
          isCorrect = true;
        }
      });
      
      // Check against incorrect patterns
      INCORRECT_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          isIncorrect = true;
        }
      });
      
      if (isIncorrect || (!isCorrect && line.includes('from'))) {
        violations.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          reason: detectReason(line)
        });
        hasViolations = true;
      }
    }
  });
}

function detectReason(line) {
  if (line.includes('shared/schema')) {
    return 'References non-existent shared/ folder';
  }
  if (line.includes('/schema.ts')) {
    return 'Direct import of schema.ts instead of specific schema file';
  }
  if (line.includes('@shared')) {
    return 'Uses @shared alias which doesn\'t exist';
  }
  return 'Schema import path not following project conventions';
}

function getCorrectImportExample(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('apps/backend')) {
    return `import { users, tenants } from '@/db/schema/w3suite';`;
  }
  
  if (normalizedPath.includes('apps/frontend')) {
    return `import type { User, Store } from 'apps/backend/api/src/db/schema/w3suite';`;
  }
  
  if (normalizedPath.includes('packages/')) {
    return `import type { User } from '../../apps/backend/api/src/db/schema/w3suite';`;
  }
  
  return `import { users } from 'apps/backend/api/src/db/schema/w3suite';`;
}

function scanFile(filePath) {
  if (!FILE_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  checkSchemaImports(filePath, content, lines);
}

function walkDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walkDirectory(filePath);
      }
    } else {
      scanFile(filePath);
    }
  });
}

console.log('🔍 Validating schema import paths...\n');

// Start scanning from project root
walkDirectory('.');

if (hasViolations) {
  console.error('❌ SCHEMA IMPORT VIOLATIONS FOUND!\n');
  
  violations.forEach(v => {
    console.error(`❌ File: ${v.file}`);
    console.error(`   Line: ${v.line}`);
    console.error(`   Code: ${v.code}`);
    console.error(`   Reason: ${v.reason}`);
    console.error(`   Fix: ${getCorrectImportExample(v.file)}`);
    console.error('');
  });
  
  console.error('\n📚 CORRECT SCHEMA IMPORT PATTERNS:\n');
  console.error('   Backend files: import from "@/db/schema/w3suite" or "@/db/schema/public"');
  console.error('   Frontend files: import types from "apps/backend/api/src/db/schema/w3suite"');
  console.error('   Never import from "shared/" folder - it doesn\'t exist!');
  console.error('');
  
  console.error(`Total violations: ${violations.length}\n`);
  process.exit(1);
} else {
  console.log('✅ All schema imports are correctly structured!\n');
  process.exit(0);
}