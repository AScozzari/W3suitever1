#!/usr/bin/env node

/**
 * Script to set up Husky git hooks for the project
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Setting up Husky git hooks...\n');

try {
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this from the project root.');
    process.exit(1);
  }
  
  // Install husky as dev dependency
  console.log('📦 Installing Husky...');
  execSync('npm install --save-dev husky', { stdio: 'inherit' });
  
  // Initialize husky
  console.log('🎣 Initializing Husky...');
  execSync('npx husky install', { stdio: 'inherit' });
  
  // Add prepare script to package.json
  console.log('📝 Adding prepare script to package.json...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.prepare = 'husky install';
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  // Create pre-commit hook
  console.log('🪝 Creating pre-commit hook...');
  execSync('npx husky add .husky/pre-commit "npm run validate"', { stdio: 'inherit' });
  
  // Add validation script to package.json
  packageJson.scripts.validate = 'node scripts/run-all-validations.js';
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  console.log('\n✅ Husky setup complete!');
  console.log('\nThe following git hooks have been configured:');
  console.log('  • pre-commit: Runs all validation scripts');
  console.log('\nTo skip hooks temporarily, use: git commit --no-verify');
  
} catch (error) {
  console.error('❌ Error setting up Husky:', error.message);
  process.exit(1);
}