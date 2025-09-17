#!/usr/bin/env node

/**
 * Master validation script that runs all project validations
 * Returns exit code 1 if any validation fails
 */

import { execSync } from 'child_process';
import path from 'path';

const validations = [
  {
    name: 'Forbidden shared/ folder references',
    script: 'validate-no-shared-refs.js',
    critical: true
  },
  {
    name: 'Frontend consistency rules',
    script: 'validate-frontend-rules.js',
    critical: true
  },
  {
    name: 'Schema import paths',
    script: 'validate-schema-imports.js',
    critical: true
  },
  {
    name: 'HR system completeness',
    script: 'validate-hr-system.js',
    critical: true
  },
  {
    name: 'Console statements',
    script: 'validate-no-console.js',
    critical: false // Warning only
  }
];

console.log('🔍 Running W3 Suite validation checks...\n');
console.log('=' .repeat(60));

let hasFailures = false;
const results = [];

validations.forEach((validation, index) => {
  console.log(`\n[${index + 1}/${validations.length}] ${validation.name}`);
  console.log('-'.repeat(40));
  
  try {
    execSync(`node scripts/${validation.script}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    results.push({ 
      name: validation.name, 
      status: '✅ PASSED' 
    });
  } catch (error) {
    if (validation.critical) {
      results.push({ 
        name: validation.name, 
        status: '❌ FAILED' 
      });
      hasFailures = true;
    } else {
      results.push({ 
        name: validation.name, 
        status: '⚠️ WARNING' 
      });
    }
  }
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

results.forEach(result => {
  console.log(`${result.status} ${result.name}`);
});

console.log('='.repeat(60));

if (hasFailures) {
  console.error('\n❌ VALIDATION FAILED! Please fix the violations above before committing.\n');
  console.error('💡 Tips:');
  console.error('  • Run individual validation scripts for detailed error messages');
  console.error('  • Use "git commit --no-verify" to bypass checks (not recommended)');
  console.error('  • See .github/workflows/code-quality.yml for CI/CD configuration\n');
  process.exit(1);
} else {
  console.log('\n✅ All validations passed! Your code is ready to commit.\n');
  process.exit(0);
}