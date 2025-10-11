-- W3 Suite CRM Demo Data for Tenant "staging" - FIXED SCHEMA
-- WindTre Realistic Demo Dataset

SET search_path TO w3suite;

-- ============================================
-- 1. CRM CAMPAIGNS (4 campagne WindTre)
-- ============================================
INSERT INTO crm_campaigns (id, tenant_id, name, type, status, budget, start_date, end_date, total_leads, total_deals, total_revenue, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Promo Fibra Natale 2024', 'inbound', 'active', 150000, '2024-11-15', '2024-12-31', 15, 3, 2500, NOW() - INTERVAL '20 days', NOW()),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'WindTre 5G Unlimited', 'inbound', 'active', 200000, '2024-10-01', '2025-03-31', 25, 5, 1350, NOW() - INTERVAL '40 days', NOW()),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Smartphone Days - iPhone 16', 'outbound', 'active', 80000, '2024-09-20', '2025-01-31', 12, 2, 1300, NOW() - INTERVAL '50 days', NOW()),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Smart Home Weekend', 'partner', 'active', 35000, '2024-11-01', '2024-12-20', 8, 1, 90, NOW() - INTERVAL '10 days', NOW());

-- ============================================
-- 2. CRM PIPELINES (4 pipeline per driver)
-- ============================================
INSERT INTO crm_pipelines (id, tenant_id, name, domain, is_active, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Pipeline Fibra & ADSL', 'sales', true, NOW() - INTERVAL '60 days', NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Pipeline Mobile 5G', 'sales', true, NOW() - INTERVAL '60 days', NOW()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Pipeline Smartphone & Tablet', 'sales', true, NOW() - INTERVAL '60 days', NOW()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Pipeline Accessori Tech', 'sales', true, NOW() - INTERVAL '60 days', NOW());

-- ============================================
-- 3. CRM PIPELINE STAGES (stages per pipeline)
-- ============================================
INSERT INTO crm_pipeline_stages (id, pipeline_id, name, category, order_index, color, is_active, created_at, updated_at) VALUES
-- Stages FISSO Pipeline
('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Richiesta Info', 'new', 1, '#9333EA', true, NOW(), NOW()),
('f2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Verifica Copertura', 'qualified', 2, '#3B82F6', true, NOW(), NOW()),
('f3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Preventivo Inviato', 'proposal', 3, '#10B981', true, NOW(), NOW()),
('f4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contratto Firmato', 'negotiation', 4, '#F59E0B', true, NOW(), NOW()),

-- Stages MOBILE Pipeline
('m1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Contatto Iniziale', 'new', 1, '#9333EA', true, NOW(), NOW()),
('m2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Piano Proposto', 'qualified', 2, '#3B82F6', true, NOW(), NOW()),
('m3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Attivazione', 'negotiation', 3, '#10B981', true, NOW(), NOW()),

-- Stages DEVICE Pipeline
('d1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Interesse Dispositivo', 'new', 1, '#9333EA', true, NOW(), NOW()),
('d2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo/Prova', 'qualified', 2, '#3B82F6', true, NOW(), NOW()),
('d3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ordine Confermato', 'negotiation', 3, '#10B981', true, NOW(), NOW()),

-- Stages ACCESSORI Pipeline
('a1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Richiesta Accessorio', 'new', 1, '#9333EA', true, NOW(), NOW()),
('a2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Acquisto', 'negotiation', 2, '#10B981', true, NOW(), NOW());

-- ============================================
-- 4. CRM LEADS (10 leads realistici)
-- ============================================
INSERT INTO crm_leads (id, tenant_id, campaign_id, status, lead_score, first_name, last_name, email, phone, company_name, notes, privacy_policy_accepted, marketing_consent, profiling_consent, consent_timestamp, created_at, updated_at) VALUES
-- Leads FISSO
('lead0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'qualified', 75, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', NULL, 'Interessato a fibra ultra veloce', true, true, true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW()),
('lead0002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'contacted', 60, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', NULL, NULL, true, true, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
('lead0003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'qualified', 85, 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', 'Tech Solutions SRL', 'Necessità fibra aziendale per ufficio', true, true, true, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW()),

-- Leads MOBILE
('lead0004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'new', 45, 'Luca', 'Ferrari', 'luca.ferrari@yahoo.it', '+393389876543', NULL, 'Provenienza: social media', true, false, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
('lead0005-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'qualified', 70, 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', NULL, NULL, true, true, true, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW()),
('lead0006-0006-0006-0006-000000000006', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'contacted', 80, 'Francesca', 'Galli', 'commerciale@retailstore.com', '+390221234567', 'Retail Store SPA', 'Richiesta piano aziendale 50 SIM', true, true, true, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW()),

-- Leads DEVICE
('lead0007-0007-0007-0007-000000000007', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'qualified', 90, 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', NULL, 'Interessato iPhone 16 Pro', true, true, true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW()),
('lead0008-0008-0008-0008-000000000008', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'new', 55, 'Roberto', 'Martini', 'direzione@studioblu.it', '+390657890123', 'Studio Blu Associati', NULL, true, false, false, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW()),

-- Leads ACCESSORI
('lead0009-0009-0009-0009-000000000009', '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'contacted', 65, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', NULL, 'Cross-sell modem WiFi 6', true, true, true, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW()),
('lead0010-0010-0010-0010-000000000010', '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'new', 40, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', NULL, NULL, true, true, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW());

-- ============================================
-- 5. CRM CUSTOMERS (8 clienti - 4 B2B, 4 B2C)
-- ============================================

-- Customers B2C (4 privati)
INSERT INTO crm_customers (id, tenant_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, notes, created_at, updated_at) VALUES
('c0000001-c001-c001-c001-c00000000001', '00000000-0000-0000-0000-000000000001', 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01', 
'[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI","country":"IT"}]'::jsonb, 
'active', 'Cliente da 3 anni, sempre puntuale nei pagamenti', NOW() - INTERVAL '40 days', NOW()),

('c0000002-c002-c002-c002-c00000000002', '00000000-0000-0000-0000-000000000001', 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
'[{"type":"billing","street":"Corso Vittorio Emanuele 88","city":"Roma","zip":"00186","province":"RM","country":"IT"}]'::jsonb,
'active', 'Passata da piano Basic a Premium', NOW() - INTERVAL '28 days', NOW()),

('c0000003-c003-c003-c003-c00000000003', '00000000-0000-0000-0000-000000000001', 'b2c', 'Luca', 'Ferrari', 'FRRLCU92C15L736W', 'luca.ferrari@yahoo.it', '+393389876543', '1992-03-15',
'[{"type":"billing","street":"Viale dei Pini 42","city":"Torino","zip":"10138","province":"TO","country":"IT"}]'::jsonb,
'active', NULL, NOW() - INTERVAL '20 days', NOW()),

('c0000004-c004-c004-c004-c00000000004', '00000000-0000-0000-0000-000000000001', 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
'[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE","country":"IT"}]'::jsonb,
'active', 'Interessata a pacchetto famiglia', NOW() - INTERVAL '15 days', NOW());

-- Customers B2B (4 aziende)
INSERT INTO crm_customers (id, tenant_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, secondary_contacts, status, notes, created_at, updated_at) VALUES
('c1000001-c101-c101-c101-c10000000001', '00000000-0000-0000-0000-000000000001', 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
'[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"},{"type":"sede_operativa","address":"Viale Tecnologia 88","city":"Milano","zip":"20139","province":"MI"}]'::jsonb,
'[{"name":"Laura Esposito","role":"CTO","email":"laura.esposito@techsolutions.it","phone":"+390294567891"}]'::jsonb,
'active', 'Contratto enterprise - 50 linee mobile + fibra aziendale', NOW() - INTERVAL '48 days', NOW()),

('c1000002-c102-c102-c102-c10000000002', '00000000-0000-0000-0000-000000000001', 'b2b', 'Retail Store SPA', 'spa', 'IT98765432109', 'retailstore@legalmail.it', 'XYZ1234', '47.71.10', 'Francesca Galli',
'[{"type":"sede_legale","address":"Corso del Commercio 150","city":"Roma","zip":"00100","province":"RM"}]'::jsonb,
'[{"name":"Giovanni Riva","role":"IT Manager","email":"g.riva@retailstore.com","phone":"+390221234568"}]'::jsonb,
'active', 'Catena retail - necessità connettività multi-sede', NOW() - INTERVAL '38 days', NOW()),

('c1000003-c103-c103-c103-c10000000003', '00000000-0000-0000-0000-000000000001', 'b2b', 'Studio Blu Associati', 'snc', 'IT55667788990', 'studioblu@pec.it', 'MNOP567', '69.20.30', 'Roberto Martini',
'[{"type":"sede_legale","address":"Piazza della Repubblica 8","city":"Firenze","zip":"50123","province":"FI"}]'::jsonb,
NULL,
'active', 'Studio professionale - 10 linee VoIP', NOW() - INTERVAL '33 days', NOW()),

('c1000004-c104-c104-c104-c10000000004', '00000000-0000-0000-0000-000000000001', 'b2b', 'Digital Agency SRLS', 'srls', 'IT11223344556', 'digitalagency@postacert.it', 'QRST890', '73.11.01', 'Paolo Marchetti',
'[{"type":"sede_legale","address":"Via Digitale 42","city":"Bologna","zip":"40100","province":"BO"}]'::jsonb,
'[{"name":"Chiara Vitali","role":"CEO","email":"chiara@digitalagency.it","phone":"+390511234567"}]'::jsonb,
'prospect', 'Lead qualificato - in trattativa per contratto Business', NOW() - INTERVAL '10 days', NOW());

-- ============================================
-- 6. CRM DEALS (8 deals distribuiti)
-- ============================================
INSERT INTO crm_deals (id, tenant_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at) VALUES
-- Deals FISSO Pipeline
('deal0001-0001-0001-0001-d00000000001', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Preventivo Inviato', 'open', '11111111-1111-1111-1111-111111111111', 45.00, 50, NOW() - INTERVAL '10 days', NOW()),
('deal0002-0002-0002-0002-d00000000002', '00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Contratto Firmato', 'open', '11111111-1111-1111-1111-111111111111', 2500.00, 90, NOW() - INTERVAL '30 days', NOW()),

-- Deals MOBILE Pipeline
('deal0003-0003-0003-0003-d00000000003', '00000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Piano Proposto', 'open', '22222222-2222-2222-2222-222222222222', 25.00, 40, NOW() - INTERVAL '8 days', NOW()),
('deal0004-0004-0004-0004-d00000000004', '00000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Attivazione', 'open', '22222222-2222-2222-2222-222222222222', 1250.00, 80, NOW() - INTERVAL '25 days', NOW()),

-- Deals DEVICE Pipeline
('deal0005-0005-0005-0005-d00000000005', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo/Prova', 'open', '33333333-3333-3333-3333-333333333333', 1299.00, 50, NOW() - INTERVAL '7 days', NOW()),
('deal0006-0006-0006-0006-d00000000006', '00000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Interesse Dispositivo', 'open', '33333333-3333-3333-3333-333333333333', 4500.00, 20, NOW() - INTERVAL '15 days', NOW()),

-- Deals ACCESSORI Pipeline
('deal0007-0007-0007-0007-d00000000007', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Acquisto', 'open', '44444444-4444-4444-4444-444444444444', 89.00, 90, NOW() - INTERVAL '4 days', NOW()),

-- Deal Won
('deal0008-0008-0008-0008-d00000000008', '00000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Attivazione', 'won', '22222222-2222-2222-2222-222222222222', 35.00, 100, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days');
