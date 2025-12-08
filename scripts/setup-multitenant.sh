#!/bin/bash

# ============================================================================
# W3 SUITE - MULTITENANT SETUP SCRIPT
# Setup completo dell'architettura multitenant enterprise
# ============================================================================

echo "🚀 W3 Suite Multitenant Setup"
echo "=============================="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per logging
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

title() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Verifica prerequisiti
title "Verifying prerequisites..."

if [ ! -f "package.json" ]; then
    error "package.json not found. Run this script from project root."
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable not set"
    exit 1
fi

log "Prerequisites OK"

# Step 1: Database Schema Push
title "1/4 - Pushing database schema..."
npm run db:push
if [ $? -ne 0 ]; then
    error "Database schema push failed"
    exit 1
fi
log "Database schema updated"

# Step 2: Setup Row Level Security  
title "2/4 - Setting up Row Level Security (RLS)..."
npx tsx apps/backend/api/src/db/setup-rls.ts
if [ $? -ne 0 ]; then
    error "RLS setup failed"
    exit 1
fi
log "Row Level Security configured"

# Step 3: Seed Multitenant Data
title "3/4 - Seeding multitenant data..."
npx tsx apps/backend/api/src/db/seed/multitenant-seed.ts
if [ $? -ne 0 ]; then
    error "Multitenant seed failed"
    exit 1
fi
log "Multitenant data populated"

# Step 4: Verification
title "4/4 - Verifying setup..."

# Verifica che RLS sia attivo
echo "Checking RLS status..."
npx tsx -e "
import { db } from './apps/backend/api/src/core/db.js';
import { sql } from 'drizzle-orm';

async function checkRLS() {
  try {
    const result = await db.execute(sql\`
      SELECT COUNT(*) as rls_tables 
      FROM rls_status 
      WHERE rls_enabled = true;
    \`);
    console.log(\`✅ RLS enabled on \${result.rows[0].rls_tables} tables\`);
    
    const tenants = await db.execute(sql\`
      SELECT COUNT(*) as tenant_count 
      FROM tenants;
    \`);
    console.log(\`✅ \${tenants.rows[0].tenant_count} tenants configured\`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

checkRLS();"

if [ $? -ne 0 ]; then
    error "Setup verification failed"
    exit 1
fi

log "Setup verification passed"

# Riepilogo finale
echo ""
echo "🎉 W3 Suite Multitenant Setup Complete!"
echo "======================================"
echo ""
echo "✅ Database schema synchronized"
echo "✅ Row Level Security (RLS) enabled"
echo "✅ Multitenant data seeded"
echo "✅ Security verified"
echo ""
echo "🌐 Available tenants:"
echo "   • http://localhost:3004/staging (Development)"
echo "   • http://localhost:3004/demo    (Showcase)" 
echo "   • http://localhost:3004/acme    (Enterprise)"
echo "   • http://localhost:3004/tech    (Solutions)"
echo ""
echo "🔐 Login credentials:"
echo "   • Email: admin@w3suite.com"
echo "   • Password: admin123"
echo ""
echo "📚 Next steps:"
echo "   • npm run dev (start development server)"
echo "   • Open browser to any tenant URL above"
echo "   • Login and start using W3 Suite!"
echo ""