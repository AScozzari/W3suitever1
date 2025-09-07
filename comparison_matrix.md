# 🔍 MERGE ANALYSIS - Entità Punto Vendita

## 📊 MATRICE DI CONFRONTO TRA LAYER

| Campo | Database Schema | API Payload | Frontend Modal | Stato |
|---|---|---|---|---|
| **IDENTIFICATORI** |
| `id` | uuid (PK) | ✅ | ❌ (non serve) | ✅ CORRETTO |
| `tenant_id` | uuid (FK) | ✅ | ❌ (automatico) | ✅ CORRETTO |
| `legal_entity_id` | uuid (FK) | ✅ | ✅ | ✅ ALLINEATO |
| **CODICI E NOMI** |
| `code` | varchar(50) | ✅ | ✅ | ✅ ALLINEATO |
| `nome` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| **RELAZIONI BUSINESS** |
| `channel_id` | uuid (FK) | ✅ | ✅ | ✅ ALLINEATO |
| `commercial_area_id` | uuid (FK) | ✅ | ✅ | ✅ ALLINEATO |
| **INDIRIZZI** |
| `address` | text | ✅ | ✅ | ✅ ALLINEATO |
| `citta` | varchar(100) | ✅ | ✅ | ✅ ALLINEATO |
| `provincia` | varchar(10) | ✅ | ✅ | ✅ ALLINEATO |
| `cap` | varchar(10) | ✅ | ✅ | ✅ ALLINEATO |
| `region` | varchar(100) | ✅ | ✅ | ✅ ALLINEATO |
| `geo` | jsonb | ✅ | ❌ | ⚠️ MANCANTE |
| **CONTATTI** |
| `phone` | varchar(50) | ✅ | ✅ | ✅ ALLINEATO |
| `email` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| `whatsapp1` | varchar(20) | ✅ | ✅ | ✅ ALLINEATO |
| `whatsapp2` | varchar(20) | ✅ | ✅ | ✅ ALLINEATO |
| **SOCIAL MEDIA** |
| `facebook` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| `instagram` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| `tiktok` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| `google_maps_url` | text | ✅ | ✅ | ✅ ALLINEATO |
| `telegram` | varchar(255) | ✅ | ✅ | ✅ ALLINEATO |
| **STATO E DATE** |
| `status` | varchar(50) | ✅ | ✅ | ✅ ALLINEATO |
| `opened_at` | date | ✅ | ✅ | ✅ ALLINEATO |
| `closed_at` | date | ✅ | ✅ | ✅ ALLINEATO |
| **CAMPI SISTEMA** |
| `billing_override_id` | uuid | ✅ | ❌ (interno) | ✅ CORRETTO |
| `created_at` | timestamp | ✅ | ❌ (automatico) | ✅ CORRETTO |
| `updated_at` | timestamp | ✅ | ❌ (automatico) | ✅ CORRETTO |
| `archived_at` | timestamp | ✅ | ❌ (interno) | ✅ CORRETTO |
| **CAMPI DERIVATI (API)** |
| `channel_name` | ❌ | ✅ (JOIN) | ❌ (display only) | ✅ CORRETTO |
| `commercial_area_name` | ❌ | ✅ (JOIN) | ❌ (display only) | ✅ CORRETTO |
| `legal_entity_name` | ❌ | ✅ (JOIN) | ❌ (display only) | ✅ CORRETTO |
| **CAMPI BUSINESS (Frontend)** |
| `brands` | ❌ | ❌ | ✅ (M:N relation) | ✅ CORRETTO |

## 🚨 PROBLEMI IDENTIFICATI:

1. **Campo `geo` mancante nel Frontend Modal** - Dovrebbe permettere inserimento coordinate
2. **Possibili campi mancanti** - Verificare se serve altro

## ✅ PUNTI DI FORZA:
- Perfetto allineamento nomi campi core
- Logica corretta per campi automatici vs user input
- Gestione appropriata campi derivati