#!/usr/bin/env node

/**
 * File Guardian - Protects HRDashboard.tsx from HTML entity corruption
 * 
 * This script monitors HRDashboard.tsx and immediately fixes any HTML entities
 * that get introduced by the HTML Language Server treating TSX as HTML.
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = 'apps/frontend/web/src/pages/HRDashboard.tsx';
const CHECK_INTERVAL = 500; // Check every 500ms

console.log('🛡️  File Guardian started - Protecting HRDashboard.tsx');
console.log(`📁 Monitoring: ${TARGET_FILE}`);
console.log(`⏱️  Check interval: ${CHECK_INTERVAL}ms`);

let lastModified = null;
let fixCount = 0;

function fixHtmlEntities(content) {
  let fixed = content;
  let changes = 0;
  
  // Fix arrow function entities - the main culprits
  const beforeArrows = fixed.match(/=&gt;/g)?.length || 0;
  fixed = fixed.replace(/=&gt;/g, '=>');
  changes += beforeArrows;
  
  // Fix other HTML entities if present
  const beforeLt = fixed.match(/&lt;/g)?.length || 0;
  fixed = fixed.replace(/&lt;/g, '<');
  changes += beforeLt;
  
  const beforeGt = fixed.match(/&gt;/g)?.length || 0;
  // Only replace standalone &gt; not part of =&gt; (already handled)
  fixed = fixed.replace(/(?<!=)&gt;/g, '>');
  changes += beforeGt;
  
  return { content: fixed, changes };
}

function checkAndFix() {
  try {
    if (!fs.existsSync(TARGET_FILE)) {
      console.log('❌ Target file not found:', TARGET_FILE);
      return;
    }
    
    const stats = fs.statSync(TARGET_FILE);
    const currentModified = stats.mtime.getTime();
    
    // Only check content if file was modified or first run
    if (lastModified === null || currentModified !== lastModified) {
      lastModified = currentModified;
      
      const content = fs.readFileSync(TARGET_FILE, 'utf8');
      const result = fixHtmlEntities(content);
      
      if (result.changes > 0) {
        // HTML entities detected - fix immediately!
        fs.writeFileSync(TARGET_FILE, result.content, 'utf8');
        fixCount++;
        console.log(`🚨 CORRUPTION DETECTED & FIXED! Changes: ${result.changes}, Total fixes: ${fixCount}`);
        console.log(`   Time: ${new Date().toISOString()}`);
        
        // Additional protection - make file read-only briefly to slow down re-corruption
        setTimeout(() => {
          try {
            fs.chmodSync(TARGET_FILE, 0o644); // Restore write permissions after brief protection
          } catch (e) {
            // Ignore permission errors
          }
        }, 1000);
      } else {
        // File is clean
        process.stdout.write('.');
      }
    }
  } catch (error) {
    console.error('❌ Error checking file:', error.message);
  }
}

// Start monitoring
console.log('🚀 Starting file monitoring...\n');
setInterval(checkAndFix, CHECK_INTERVAL);

// Initial check
checkAndFix();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n🛡️  File Guardian shutting down`);
  console.log(`📊 Total fixes applied: ${fixCount}`);
  console.log('👋 Goodbye!');
  process.exit(0);
});