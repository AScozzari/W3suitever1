# W3 Suite - VPS Deploy Guide

## Quick Reference

### Deploy Commands

```bash
# Deploy ONLY backend
./deploy/deploy-be.sh

# Deploy ONLY frontend
./deploy/deploy-fe.sh

# Deploy BOTH backend and frontend
./deploy/deploy-all.sh

# Deploy with options
./deploy/deploy-all.sh --be-only   # Same as deploy-be.sh
./deploy/deploy-all.sh --fe-only   # Same as deploy-fe.sh
./deploy/deploy-all.sh --skip-be   # Skip backend
./deploy/deploy-all.sh --skip-fe   # Skip frontend
```

---

## ⚠️ REGOLE FONDAMENTALI

### ❌ MAI fare
- `npm run build` per VPS (produce file sbagliato)
- Sovrascrivere `.env.production` 
- Sovrascrivere `.env`
- Sovrascrivere `ecosystem.config.cjs`
- Modificare configurazioni PM2 sul VPS

### ✅ SEMPRE fare
- Usare gli script `deploy/*.sh`
- Verificare health check dopo deploy
- Testare con Ctrl+F5 dopo deploy frontend

---

## Dettagli Tecnici

### Backend Deploy

**Build command:**
```bash
npx esbuild apps/backend/api/src/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --external:pg-native \
  --external:sharp \
  --external:canvas \
  --outfile=dist/server.cjs
```

**Output:** `dist/server.cjs` (~81MB)

**VPS paths:**
- Releases: `/var/www/w3suite/releases/YYYYMMDD_HHMMSS/`
- Current: `/var/www/w3suite/current/` (symlink)
- Script: `/var/www/w3suite/current/server.cjs`

### Frontend Deploy

**Build command:**
```bash
cd apps/frontend/web
npx vite build
```

**Output:** `apps/frontend/web/dist/` (~91 files)

**VPS path:** `/var/www/w3suite/apps/frontend/web/dist/`

---

## SSH Access

**Key:** `~/.ssh/vps_deploy`

```bash
# Connect to VPS
ssh -i ~/.ssh/vps_deploy root@82.165.16.223

# Check PM2 status
pm2 status

# View API logs
pm2 logs w3-api --lines 50

# Restart API
pm2 restart w3-api
```

---

## File Protetti sul VPS

Questi file NON vengono MAI sovrascritti dagli script:

| File | Contenuto |
|------|-----------|
| `.env.production` | Secrets, DATABASE_URL, REDIS_URL, JWT_SECRET |
| `.env` | Override locali |
| `ecosystem.config.cjs` | Configurazione PM2 |

---

## Troubleshooting

### Backend non parte
```bash
ssh -i ~/.ssh/vps_deploy root@82.165.16.223
pm2 logs w3-api --lines 100
```

### Frontend non si aggiorna
- Fai Ctrl+F5 nel browser
- Verifica che i file siano stati caricati:
```bash
ssh -i ~/.ssh/vps_deploy root@82.165.16.223 "ls -la /var/www/w3suite/apps/frontend/web/dist/assets/ | head -10"
```

### Health check fallisce
```bash
# Test manuale
ssh -i ~/.ssh/vps_deploy root@82.165.16.223 "curl http://localhost:3004/api/tenants/resolve?slug=staging"
```

### Rollback backend
```bash
ssh -i ~/.ssh/vps_deploy root@82.165.16.223
cd /var/www/w3suite
# Lista releases
ls -la releases/
# Trova quella precedente e aggiorna symlink
rm current
ln -s releases/YYYYMMDD_HHMMSS current
pm2 restart w3-api
```

---

## Deploy History

Il file `DEPLOY_HISTORY.log` sul VPS contiene lo storico di tutti i deploy:
```bash
ssh -i ~/.ssh/vps_deploy root@82.165.16.223 "tail -20 /var/www/w3suite/DEPLOY_HISTORY.log"
```

---

## Checklist Pre-Deploy

- [ ] Codice testato su Replit
- [ ] Nessun errore TypeScript critico
- [ ] SSH key configurata (`~/.ssh/vps_deploy`)
- [ ] VPS raggiungibile

## Checklist Post-Deploy

- [ ] Health check passato
- [ ] Login page carica (http://82.165.16.223/staging/login)
- [ ] CSS caricato correttamente
- [ ] Funzionalità testate
