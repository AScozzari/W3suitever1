#!/bin/bash
# =============================================================================
# W3 SUITE - System Monitoring Dashboard
# Quick overview of system and application status
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}           W3 SUITE - Production Monitoring Dashboard            ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}           $(date '+%Y-%m-%d %H:%M:%S')                              ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# System Resources
# =============================================================================
echo -e "${BLUE}▓▓▓ SYSTEM RESOURCES ▓▓▓${NC}"
echo ""

# CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
echo -e "CPU Usage:      ${YELLOW}${CPU_USAGE}%${NC}"

# Memory
MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
MEM_USED=$(free -h | awk '/^Mem:/ {print $3}')
MEM_PERCENT=$(free | awk '/^Mem:/ {printf("%.1f"), $3/$2 * 100}')
echo -e "Memory:         ${YELLOW}${MEM_USED}${NC} / ${MEM_TOTAL} (${MEM_PERCENT}%)"

# Disk
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo -e "Disk Usage:     ${YELLOW}${DISK_USAGE}${NC} used, ${DISK_AVAIL} available"

# Load Average
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
echo -e "Load Average:   ${YELLOW}${LOAD}${NC}"

# Uptime
UPTIME=$(uptime -p)
echo -e "Uptime:         ${GREEN}${UPTIME}${NC}"
echo ""

# =============================================================================
# Service Status
# =============================================================================
echo -e "${BLUE}▓▓▓ SERVICE STATUS ▓▓▓${NC}"
echo ""

check_service() {
    if systemctl is-active --quiet $1; then
        echo -e "  $1: ${GREEN}● Running${NC}"
    else
        echo -e "  $1: ${RED}○ Stopped${NC}"
    fi
}

check_service "nginx"
check_service "postgresql"
check_service "redis-server"
echo ""

# =============================================================================
# PM2 Process Status
# =============================================================================
echo -e "${BLUE}▓▓▓ APPLICATION PROCESSES ▓▓▓${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for proc in data:
        name = proc.get('name', 'unknown')
        status = proc.get('pm2_env', {}).get('status', 'unknown')
        cpu = proc.get('monit', {}).get('cpu', 0)
        mem = proc.get('monit', {}).get('memory', 0) / 1024 / 1024
        restarts = proc.get('pm2_env', {}).get('restart_time', 0)
        
        if status == 'online':
            status_color = '\033[0;32m●\033[0m'
        else:
            status_color = '\033[0;31m○\033[0m'
        
        print(f'  {status_color} {name:<25} CPU: {cpu:>5.1f}%  MEM: {mem:>6.1f}MB  Restarts: {restarts}')
except:
    print('  Unable to parse PM2 status')
" 2>/dev/null || echo "  PM2 not running or not installed"
else
    echo "  PM2 not installed"
fi
echo ""

# =============================================================================
# Health Checks
# =============================================================================
echo -e "${BLUE}▓▓▓ HEALTH CHECKS ▓▓▓${NC}"
echo ""

# Backend API
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/api/health | grep -q "200"; then
    echo -e "  Backend API:    ${GREEN}● Healthy${NC} (port 3004)"
else
    echo -e "  Backend API:    ${RED}○ Unhealthy${NC} (port 3004)"
fi

# Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "  Frontend:       ${GREEN}● Healthy${NC} (port 3000)"
else
    echo -e "  Frontend:       ${RED}○ Unhealthy${NC} (port 3000)"
fi

# Brand Backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/brand-api/health 2>/dev/null | grep -q "200"; then
    echo -e "  Brand API:      ${GREEN}● Healthy${NC} (port 3002)"
else
    echo -e "  Brand API:      ${YELLOW}○ Not running${NC} (port 3002)"
fi

# PostgreSQL
if pg_isready -q; then
    echo -e "  PostgreSQL:     ${GREEN}● Accepting connections${NC}"
else
    echo -e "  PostgreSQL:     ${RED}○ Not accepting connections${NC}"
fi

# Redis
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "  Redis:          ${GREEN}● Responding${NC}"
else
    echo -e "  Redis:          ${RED}○ Not responding${NC}"
fi
echo ""

# =============================================================================
# Recent Errors
# =============================================================================
echo -e "${BLUE}▓▓▓ RECENT ERRORS (last 5) ▓▓▓${NC}"
echo ""

if [ -f /var/log/w3suite/backend-error.log ]; then
    tail -5 /var/log/w3suite/backend-error.log 2>/dev/null | while read line; do
        echo -e "  ${RED}$line${NC}"
    done
else
    echo -e "  ${GREEN}No error log found (good!)${NC}"
fi
echo ""

# =============================================================================
# Network Connections
# =============================================================================
echo -e "${BLUE}▓▓▓ NETWORK CONNECTIONS ▓▓▓${NC}"
echo ""
echo -e "  Port 80 (HTTP):   $(netstat -an 2>/dev/null | grep -c ':80.*ESTABLISHED' || echo '0') connections"
echo -e "  Port 443 (HTTPS): $(netstat -an 2>/dev/null | grep -c ':443.*ESTABLISHED' || echo '0') connections"
echo -e "  Port 3004 (API):  $(netstat -an 2>/dev/null | grep -c ':3004.*ESTABLISHED' || echo '0') connections"
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "  Press Ctrl+C to exit | Refresh: ./monitoring.sh"
echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
echo ""
