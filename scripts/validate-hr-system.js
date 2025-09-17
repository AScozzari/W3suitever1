#!/usr/bin/env node

/**
 * Validation script to check HR system completeness
 */

import fs from 'fs';
import path from 'path';

const violations = {
  missingTables: [],
  missingEndpoints: [],
  missingFrontendPages: [],
  inconsistencies: []
};

let hasViolations = false;

// Required HR tables in schema
const REQUIRED_HR_TABLES = [
  'calendarEvents',
  'timeTrackings', 
  'timeTrackingEdits',
  'leaveRequests',
  'leaveBalances',
  'shifts',
  'shiftTemplates',
  'shiftAssignments',
  'hrDocuments',
  'hrDocumentShares',
  'expenseReports',
  'expenseItems',
  'expensePolicies',
  'hrAnnouncements',
  'hrAnnouncementReadStatus'
];

// Required HR API endpoints
const REQUIRED_HR_ENDPOINTS = [
  '/api/calendar',
  '/api/time-tracking',
  '/api/leave',
  '/api/shifts',
  '/api/hr-documents',
  '/api/expenses',
  '/api/hr-announcements',
  '/api/hr-analytics',
  '/api/hr-reports'
];

// Required HR frontend pages/components
const REQUIRED_HR_PAGES = [
  'CalendarPage',
  'TimeTrackingPage',
  'LeaveManagementPage',
  'ShiftPlanningPage',
  'DocumentDrivePage',
  'ExpenseManagementPage',
  'HRDashboard',
  'HRAnalyticsPage',
  'HRReports'
];

function checkHRTables() {
  const schemaPath = 'apps/backend/api/src/db/schema/w3suite.ts';
  
  if (!fs.existsSync(schemaPath)) {
    violations.missingTables.push({
      error: 'Schema file not found',
      path: schemaPath
    });
    hasViolations = true;
    return;
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  REQUIRED_HR_TABLES.forEach(table => {
    const tablePattern = new RegExp(`export\\s+const\\s+${table}\\s*=`, 'i');
    if (!tablePattern.test(schemaContent)) {
      violations.missingTables.push({
        table: table,
        expected: `export const ${table} = w3suiteSchema.table("${table}", { ... })`
      });
      hasViolations = true;
    }
  });
  
  // Check for proper enum definitions
  const requiredEnums = [
    'calendarEventTypeEnum',
    'trackingMethodEnum',
    'leaveTypeEnum',
    'shiftTypeEnum',
    'hrDocumentTypeEnum',
    'expenseReportStatusEnum'
  ];
  
  requiredEnums.forEach(enumName => {
    if (!schemaContent.includes(enumName)) {
      violations.missingTables.push({
        enum: enumName,
        expected: `export const ${enumName} = pgEnum(...)`
      });
      hasViolations = true;
    }
  });
}

function checkHREndpoints() {
  const routesPath = 'apps/backend/api/src/core/routes.ts';
  
  if (!fs.existsSync(routesPath)) {
    violations.missingEndpoints.push({
      error: 'Routes file not found',
      path: routesPath
    });
    hasViolations = true;
    return;
  }
  
  const routesContent = fs.readFileSync(routesPath, 'utf-8');
  
  REQUIRED_HR_ENDPOINTS.forEach(endpoint => {
    const endpointPattern = new RegExp(`(app\\.(get|post|put|patch|delete)\\(['"]${endpoint}|router\\.(get|post|put|patch|delete)\\(['"]${endpoint.replace('/api/', '')})`, 'i');
    
    if (!endpointPattern.test(routesContent)) {
      violations.missingEndpoints.push({
        endpoint: endpoint,
        suggestion: `Add route handler for ${endpoint}`
      });
      hasViolations = true;
    }
  });
}

function checkHRFrontendPages() {
  const pagesDir = 'apps/frontend/web/src/pages';
  
  if (!fs.existsSync(pagesDir)) {
    violations.missingFrontendPages.push({
      error: 'Pages directory not found',
      path: pagesDir
    });
    hasViolations = true;
    return;
  }
  
  const existingPages = fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.tsx'))
    .map(file => file.replace('.tsx', ''));
  
  REQUIRED_HR_PAGES.forEach(page => {
    if (!existingPages.includes(page)) {
      // Also check with .tsx extension
      const pageFile = path.join(pagesDir, `${page}.tsx`);
      if (!fs.existsSync(pageFile)) {
        violations.missingFrontendPages.push({
          page: page,
          expectedPath: pageFile
        });
        hasViolations = true;
      }
    }
  });
  
  // Check for HR components
  const componentsDir = 'apps/frontend/web/src/components';
  const requiredComponentDirs = [
    'Calendar',
    'TimeTracking',
    'Leave',
    'Shifts',
    'Documents',
    'Expenses',
    'Analytics'
  ];
  
  requiredComponentDirs.forEach(dir => {
    const componentPath = path.join(componentsDir, dir);
    if (!fs.existsSync(componentPath)) {
      violations.missingFrontendPages.push({
        component: dir,
        expectedPath: componentPath,
        type: 'component_directory'
      });
      hasViolations = true;
    }
  });
}

function checkConsistency() {
  // Check if storage interface has HR methods
  const storagePath = 'apps/backend/api/src/core/storage.ts';
  
  if (fs.existsSync(storagePath)) {
    const storageContent = fs.readFileSync(storagePath, 'utf-8');
    
    const requiredMethods = [
      'getCalendarEvents',
      'createTimeTracking',
      'getLeaveRequests',
      'getShifts',
      'uploadHRDocument',
      'createExpenseReport'
    ];
    
    requiredMethods.forEach(method => {
      if (!storageContent.includes(method)) {
        violations.inconsistencies.push({
          file: 'storage.ts',
          missing: method,
          type: 'storage_method'
        });
        hasViolations = true;
      }
    });
  }
  
  // Check if hooks exist for HR features
  const hooksDir = 'apps/frontend/web/src/hooks';
  const requiredHooks = [
    'useTimeTracking.ts',
    'useLeaveManagement.ts',
    'useShiftPlanning.ts',
    'useExpenseManagement.ts',
    'useHRAnalytics.ts'
  ];
  
  if (fs.existsSync(hooksDir)) {
    requiredHooks.forEach(hook => {
      const hookPath = path.join(hooksDir, hook);
      if (!fs.existsSync(hookPath)) {
        violations.inconsistencies.push({
          file: hook,
          type: 'missing_hook',
          expectedPath: hookPath
        });
        hasViolations = true;
      }
    });
  }
}

console.log('🔍 Validating HR system completeness...\n');

// Run all checks
checkHRTables();
checkHREndpoints();
checkHRFrontendPages();
checkConsistency();

// Report violations
if (violations.missingTables.length > 0) {
  console.error('❌ MISSING HR TABLES IN SCHEMA:\n');
  violations.missingTables.forEach(v => {
    if (v.error) {
      console.error(`   ❌ ${v.error}: ${v.path}`);
    } else if (v.table) {
      console.error(`   ❌ Missing table: ${v.table}`);
      console.error(`      Expected: ${v.expected}`);
    } else if (v.enum) {
      console.error(`   ❌ Missing enum: ${v.enum}`);
      console.error(`      Expected: ${v.expected}`);
    }
  });
  console.error('');
}

if (violations.missingEndpoints.length > 0) {
  console.error('❌ MISSING HR API ENDPOINTS:\n');
  violations.missingEndpoints.forEach(v => {
    if (v.error) {
      console.error(`   ❌ ${v.error}: ${v.path}`);
    } else {
      console.error(`   ❌ Missing endpoint: ${v.endpoint}`);
      console.error(`      ${v.suggestion}`);
    }
  });
  console.error('');
}

if (violations.missingFrontendPages.length > 0) {
  console.error('❌ MISSING HR FRONTEND COMPONENTS:\n');
  violations.missingFrontendPages.forEach(v => {
    if (v.error) {
      console.error(`   ❌ ${v.error}: ${v.path}`);
    } else if (v.type === 'component_directory') {
      console.error(`   ❌ Missing component directory: ${v.component}`);
      console.error(`      Expected at: ${v.expectedPath}`);
    } else {
      console.error(`   ❌ Missing page: ${v.page}`);
      console.error(`      Expected at: ${v.expectedPath}`);
    }
  });
  console.error('');
}

if (violations.inconsistencies.length > 0) {
  console.error('⚠️  HR SYSTEM INCONSISTENCIES:\n');
  violations.inconsistencies.forEach(v => {
    if (v.type === 'storage_method') {
      console.error(`   ⚠️  Missing storage method: ${v.missing} in ${v.file}`);
    } else if (v.type === 'missing_hook') {
      console.error(`   ⚠️  Missing React hook: ${v.file}`);
      console.error(`      Expected at: ${v.expectedPath}`);
    }
  });
  console.error('');
}

if (hasViolations) {
  console.error('❌ HR system validation failed!\n');
  console.error('The HR system is incomplete. Please implement all required tables, endpoints, and pages.\n');
  console.error('Required components:');
  console.error('  • 15 HR tables in w3suite schema');
  console.error('  • 9 HR API endpoints');  
  console.error('  • 9 HR frontend pages');
  console.error('  • Supporting hooks and storage methods\n');
  process.exit(1);
} else {
  console.log('✅ HR system is complete and properly structured!\n');
  process.exit(0);
}