#!/bin/bash
set -e

echo "================================================"
echo "🐘 W3 Suite Database Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Database configuration
DB_NAME="w3suite_prod"
DB_USER="w3suite"
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo "📦 Creating PostgreSQL database and user..."

# Create database and user
sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to database and setup schemas
\c ${DB_NAME}

-- Create schemas
CREATE SCHEMA IF NOT EXISTS w3suite AUTHORIZATION ${DB_USER};
CREATE SCHEMA IF NOT EXISTS brand_interface AUTHORIZATION ${DB_USER};

-- Grant schema access
GRANT ALL ON SCHEMA w3suite TO ${DB_USER};
GRANT ALL ON SCHEMA brand_interface TO ${DB_USER};
GRANT ALL ON SCHEMA public TO ${DB_USER};

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

EOF

log_success "Database created successfully"

# Save credentials
CREDENTIALS_FILE="/var/www/w3suite/.db-credentials"
cat > ${CREDENTIALS_FILE} <<EOF
# W3 Suite Database Credentials
# Generated: $(date)
# KEEP THIS FILE SECURE!

DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Full connection string for .env file:
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
EOF

chmod 600 ${CREDENTIALS_FILE}
chown w3suite:w3suite ${CREDENTIALS_FILE}

log_success "Credentials saved to ${CREDENTIALS_FILE}"

echo ""
echo "================================================"
echo "✅ DATABASE SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Password: Saved in ${CREDENTIALS_FILE}"
echo ""
echo "Connection string for .env:"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
