#!/usr/bin/env node

/**
 * Validation script to detect references to non-existent shared/ folder
 */

import fs from 'fs';
import path from 'path';

const FORBIDDEN_PATTERNS = [
  /import\s+.*\s+from\s+['"].*shared\/.*['"]/g,
  /from\s+['"]@shared\/.*['"]/g,
  /require\s*\(\s*['"].*shared\/.*['"]\s*\)/g,
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];

let violationsFound = false;
const violations = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          pattern: pattern.toString()
        });
        violationsFound = true;
      }
    });
  });
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walkDirectory(filePath);
      }
    } else {
      const ext = path.extname(filePath);
      if (FILE_EXTENSIONS.includes(ext)) {
        scanFile(filePath);
      }
    }
  });
}

console.log('🔍 Scanning for forbidden shared/ folder references...\n');

// Start scanning from project root
walkDirectory('.');

if (violationsFound) {
  console.error('❌ VIOLATIONS FOUND!\n');
  console.error('The following files contain references to non-existent shared/ folder:\n');
  
  violations.forEach(violation => {
    console.error(`❌ VIOLATION FOUND: Reference to shared/ folder`);
    console.error(`   File: ${violation.file}`);
    console.error(`   Line: ${violation.line}`);
    console.error(`   Code: ${violation.code}`);
    console.error(`   Rule: NEVER reference shared/ folder (doesn't exist)`);
    console.error(`   Fix: Use correct import paths:`);
    console.error(`        - For schema: import from 'apps/backend/api/src/db/schema'`);
    console.error(`        - For types: define locally or in appropriate package`);
    console.error('');
  });
  
  console.error(`\nTotal violations: ${violations.length}`);
  process.exit(1);
} else {
  console.log('✅ No shared/ folder references found. All imports are valid!\n');
  process.exit(0);
}