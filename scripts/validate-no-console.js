#!/usr/bin/env node

/**
 * Validation script to detect console.log statements in production code
 */

import fs from 'fs';
import path from 'path';

const violations = [];
let hasViolations = false;

const CONSOLE_PATTERNS = [
  /console\.(log|info|warn|error|debug|trace)\(/g,
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'scripts', 'test', '__tests__'];
const EXCLUDE_FILES = ['validate-no-console.js', 'logger.ts', 'logger.js'];

function scanFile(filePath) {
  // Skip test files and config files
  if (filePath.includes('.test.') || filePath.includes('.spec.') || 
      filePath.includes('webpack.config') || filePath.includes('vite.config') ||
      EXCLUDE_FILES.some(file => filePath.endsWith(file))) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    CONSOLE_PATTERNS.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        violations.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          type: matches[0]
        });
        hasViolations = true;
      }
    });
  });
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
      const ext = path.extname(filePath);
      if (FILE_EXTENSIONS.includes(ext)) {
        scanFile(filePath);
      }
    }
  });
}

console.log('🔍 Scanning for console statements in production code...\n');

// Scan application directories
['apps/backend', 'apps/frontend', 'packages'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

if (hasViolations) {
  console.error('⚠️  CONSOLE STATEMENTS FOUND IN PRODUCTION CODE:\n');
  
  violations.forEach(v => {
    console.error(`⚠️  File: ${v.file}`);
    console.error(`   Line: ${v.line}`);
    console.error(`   Statement: ${v.type}`);
    console.error(`   Code: ${v.code}`);
    console.error(`   Fix: Use proper logging service or remove`);
    console.error('');
  });
  
  console.error(`\nTotal console statements found: ${violations.length}`);
  console.error('\nConsider using:');
  console.error('  • Winston or similar logger for backend');
  console.error('  • Debug library for development logging');
  console.error('  • Remove or comment out for production\n');
  
  // This is a warning, not a hard failure for now
  console.warn('⚠️  Warning: Console statements should be removed before production deployment.\n');
  process.exit(0); // Exit with success but show warnings
} else {
  console.log('✅ No console statements found in production code!\n');
  process.exit(0);
}