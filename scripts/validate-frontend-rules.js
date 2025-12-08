#!/usr/bin/env node

/**
 * Validation script for frontend consistency rules
 */

import fs from 'fs';
import path from 'path';

const violations = {
  inlineColors: [],
  missingLayout: [],
  notUsingShadcn: [],
  notUsingFrontendKit: []
};

let hasViolations = false;

// Patterns to detect
const INLINE_HEX_COLOR_PATTERN = /#[0-9A-Fa-f]{3,6}(?![0-9A-Fa-f])/g;
const INLINE_RGB_PATTERN = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
const LAYOUT_IMPORT_PATTERN = /import\s+.*Layout.*\s+from/;
const LAYOUT_USAGE_PATTERN = /<Layout[>\s]/;
const SHADCN_IMPORT = /@\/components\/ui\//;
const FRONTEND_KIT_IMPORT = /@w3suite\/frontend-kit/;

// Custom component patterns that should use shadcn/ui
const CUSTOM_COMPONENT_PATTERNS = {
  Button: /@\/components\/ui\/button/,
  Card: /@\/components\/ui\/card/,
  Dialog: /@\/components\/ui\/dialog/,
  Form: /@\/components\/ui\/form/,
  Table: /@\/components\/ui\/table/,
  Toast: /@\/hooks\/use-toast/,
};

const FILE_EXTENSIONS = ['.jsx', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'attached_assets'];
const PAGE_DIRS = ['pages', 'app'];

function isPageFile(filePath) {
  // Check if file is in a pages directory
  const normalizedPath = filePath.replace(/\\/g, '/');
  return PAGE_DIRS.some(dir => 
    normalizedPath.includes(`/${dir}/`) && 
    !normalizedPath.includes('_app') && 
    !normalizedPath.includes('_document')
  );
}

function checkInlineColors(filePath, content, lines) {
  // Skip CSS files for color checking
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
    return;
  }
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Check for hex colors
    const hexMatches = line.match(INLINE_HEX_COLOR_PATTERN);
    if (hexMatches) {
      // Filter out common false positives (IDs, etc)
      hexMatches.forEach(match => {
        // Skip if it's likely an ID or within a string that's not a style
        if (!line.includes('color') && !line.includes('background') && 
            !line.includes('border') && !line.includes('style')) {
          return;
        }
        
        violations.inlineColors.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          color: match
        });
        hasViolations = true;
      });
    }
    
    // Check for RGB colors
    const rgbMatches = line.match(INLINE_RGB_PATTERN);
    if (rgbMatches && (line.includes('style') || line.includes('sx'))) {
      violations.inlineColors.push({
        file: filePath,
        line: index + 1,
        code: line.trim(),
        color: rgbMatches[0]
      });
      hasViolations = true;
    }
  });
}

function checkLayoutUsage(filePath, content) {
  if (!isPageFile(filePath)) {
    return;
  }
  
  const hasLayoutImport = LAYOUT_IMPORT_PATTERN.test(content);
  const hasLayoutUsage = LAYOUT_USAGE_PATTERN.test(content);
  
  if (!hasLayoutImport || !hasLayoutUsage) {
    violations.missingLayout.push({
      file: filePath,
      hasImport: hasLayoutImport,
      hasUsage: hasLayoutUsage
    });
    hasViolations = true;
  }
}

function checkComponentUsage(filePath, content, lines) {
  // Check if custom components are used instead of shadcn
  const customComponentUsed = [];
  
  lines.forEach((line, index) => {
    // Check for custom Button, Card, etc implementations
    if (line.includes('const Button = ') || line.includes('function Button')) {
      customComponentUsed.push({ component: 'Button', line: index + 1 });
    }
    if (line.includes('const Card = ') || line.includes('function Card')) {
      customComponentUsed.push({ component: 'Card', line: index + 1 });
    }
  });
  
  if (customComponentUsed.length > 0) {
    // Check if shadcn components are imported
    let usingShadcn = false;
    Object.entries(CUSTOM_COMPONENT_PATTERNS).forEach(([comp, pattern]) => {
      if (pattern.test(content)) {
        usingShadcn = true;
      }
    });
    
    if (!usingShadcn) {
      violations.notUsingShadcn.push({
        file: filePath,
        components: customComponentUsed
      });
      hasViolations = true;
    }
  }
  
  // Check for frontend-kit usage in appropriate files
  if (filePath.includes('Dashboard') || filePath.includes('Settings') || 
      filePath.includes('List') || filePath.includes('Detail')) {
    if (!FRONTEND_KIT_IMPORT.test(content)) {
      violations.notUsingFrontendKit.push({
        file: filePath,
        suggestedTemplate: detectSuggestedTemplate(filePath)
      });
      // This is a warning, not a hard failure
    }
  }
}

function detectSuggestedTemplate(filePath) {
  if (filePath.includes('Dashboard')) return 'DashboardTemplate';
  if (filePath.includes('Settings')) return 'SettingsPageTemplate';
  if (filePath.includes('List')) return 'ListPageTemplate';
  if (filePath.includes('Detail')) return 'DetailPageTemplate';
  if (filePath.includes('Form')) return 'FormPageTemplate';
  return 'SafePageShell';
}

function scanFile(filePath) {
  if (!FILE_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  checkInlineColors(filePath, content, lines);
  checkLayoutUsage(filePath, content);
  checkComponentUsage(filePath, content, lines);
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

console.log('🔍 Validating frontend consistency rules...\n');

// Scan all frontend directories
['apps/frontend/web', 'apps/frontend/brand-web'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDirectory(dir);
  }
});

// Report violations
if (violations.inlineColors.length > 0) {
  console.error('❌ INLINE COLOR VIOLATIONS FOUND!\n');
  violations.inlineColors.forEach(v => {
    console.error(`❌ File: ${v.file}`);
    console.error(`   Line: ${v.line}`);
    console.error(`   Color: ${v.color}`);
    console.error(`   Code: ${v.code}`);
    console.error(`   Fix: Use CSS variables or Tailwind classes instead`);
    console.error(`        Example: className="text-primary" or style={{ color: 'var(--primary)' }}`);
    console.error('');
  });
}

if (violations.missingLayout.length > 0) {
  console.error('❌ MISSING LAYOUT VIOLATIONS FOUND!\n');
  violations.missingLayout.forEach(v => {
    console.error(`❌ Page without Layout: ${v.file}`);
    console.error(`   Has import: ${v.hasImport}`);
    console.error(`   Has usage: ${v.hasUsage}`);
    console.error(`   Fix: Import and wrap page content with <Layout> component`);
    console.error('');
  });
}

if (violations.notUsingShadcn.length > 0) {
  console.error('⚠️  CUSTOM COMPONENTS INSTEAD OF SHADCN/UI:\n');
  violations.notUsingShadcn.forEach(v => {
    console.error(`⚠️  File: ${v.file}`);
    v.components.forEach(comp => {
      console.error(`   Custom ${comp.component} at line ${comp.line}`);
    });
    console.error(`   Recommendation: Use shadcn/ui components from @/components/ui/`);
    console.error('');
  });
}

if (violations.notUsingFrontendKit.length > 0) {
  console.log('\n💡 FRONTEND-KIT USAGE SUGGESTIONS:\n');
  violations.notUsingFrontendKit.forEach(v => {
    console.log(`💡 File: ${v.file}`);
    console.log(`   Could use: ${v.suggestedTemplate} from @w3suite/frontend-kit`);
    console.log('');
  });
}

if (hasViolations) {
  console.error('\n❌ Frontend validation failed! Please fix the violations above.\n');
  process.exit(1);
} else {
  console.log('✅ All frontend rules validated successfully!\n');
  process.exit(0);
}