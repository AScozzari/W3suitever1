#!/bin/bash

# Script per eseguire drizzle-kit push in modalità completamente non-interattiva
# Risponde automaticamente ai prompt per rendere il sistema autonomo

echo "Starting non-interactive Drizzle database push..."

cd apps/backend/api

# Usa printf per rispondere automaticamente ai prompt:
# - Prima risposta: conferma creazione/rinomina tabelle
# - Seconda risposta: aggiunta constraint senza truncate
printf "create table\nNo, add the constraint without truncating the table\n" | npx drizzle-kit push

echo "Non-interactive database push completed!"