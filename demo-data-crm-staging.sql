-- W3 Suite CRM Demo Data for Tenant "staging"
-- WindTre Realistic Demo Dataset
-- Includes: Campaigns, Pipelines, Leads, Customers (B2B/B2C), Deals

SET search_path TO w3suite;

-- ============================================
-- 1. CRM CAMPAIGNS (4 campagne WindTre)
-- ============================================
INSERT INTO crm_campaigns (id, tenant_id, name, description, driver, status, budget, actual_spent, start_date, end_date, created_at) VALUES
-- Campaign 1: Fibra Natale
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Promo Fibra Natale 2024', 'Offerta speciale fibra ottica per le festività natalizie - velocità fino a 2.5 Gbps', 'FISSO', 'active', 150000.00, 87500.00, '2024-11-15', '2024-12-31', NOW() - INTERVAL '20 days'),

-- Campaign 2: 5G Unlimited
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'WindTre 5G Unlimited', 'Piano mobile 5G con giga illimitati e minuti senza limiti', 'MOBILE', 'active', 200000.00, 145000.00, '2024-10-01', '2025-03-31', NOW() - INTERVAL '40 days'),

-- Campaign 3: Smartphone Days
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Smartphone Days - iPhone 16', 'Vendita smartphone ultimo modello con rateizzazione a tasso zero', 'DEVICE', 'active', 80000.00, 52000.00, '2024-09-20', '2025-01-31', NOW() - INTERVAL '50 days'),

-- Campaign 4: Accessori Smart Home
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Smart Home Weekend', 'Accessori smart home: modem WiFi 6, repeater, smart speaker', 'ACCESSORI', 'active', 35000.00, 18500.00, '2024-11-01', '2024-12-20', NOW() - INTERVAL '10 days');

-- ============================================
-- 2. CRM PIPELINES (4 pipeline per driver)
-- ============================================
INSERT INTO crm_pipelines (id, tenant_id, name, description, driver, is_default, created_at) VALUES
-- Pipeline FISSO
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Pipeline Fibra & ADSL', 'Vendita servizi fissi: fibra ottica, ADSL, VoIP', 'FISSO', true, NOW() - INTERVAL '60 days'),

-- Pipeline MOBILE
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Pipeline Mobile 5G', 'Vendita SIM, abbonamenti mobile, piani dati', 'MOBILE', true, NOW() - INTERVAL '60 days'),

-- Pipeline DEVICE
('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Pipeline Smartphone & Tablet', 'Vendita dispositivi: smartphone, tablet, smartwatch', 'DEVICE', true, NOW() - INTERVAL '60 days'),

-- Pipeline ACCESSORI
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Pipeline Accessori Tech', 'Vendita accessori: cover, cavi, modem, repeater', 'ACCESSORI', true, NOW() - INTERVAL '60 days');

-- ============================================
-- 3. CRM PIPELINE STAGES (stages per pipeline)
-- ============================================
INSERT INTO crm_pipeline_stages (id, pipeline_id, tenant_id, name, stage_order, probability, color, created_at) VALUES
-- Stages FISSO Pipeline
('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Richiesta Info', 1, 10, '#9333EA', NOW() - INTERVAL '60 days'),
('f2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Verifica Copertura', 2, 30, '#3B82F6', NOW() - INTERVAL '60 days'),
('f3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Preventivo Inviato', 3, 50, '#10B981', NOW() - INTERVAL '60 days'),
('f4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'Contratto Firmato', 4, 90, '#F59E0B', NOW() - INTERVAL '60 days'),

-- Stages MOBILE Pipeline
('m1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Contatto Iniziale', 1, 10, '#9333EA', NOW() - INTERVAL '60 days'),
('m2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Piano Proposto', 2, 40, '#3B82F6', NOW() - INTERVAL '60 days'),
('m3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Attivazione', 3, 80, '#10B981', NOW() - INTERVAL '60 days'),

-- Stages DEVICE Pipeline
('d1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Interesse Dispositivo', 1, 20, '#9333EA', NOW() - INTERVAL '60 days'),
('d2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Demo/Prova', 2, 50, '#3B82F6', NOW() - INTERVAL '60 days'),
('d3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Ordine Confermato', 3, 95, '#10B981', NOW() - INTERVAL '60 days'),

-- Stages ACCESSORI Pipeline
('a1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Richiesta Accessorio', 1, 30, '#9333EA', NOW() - INTERVAL '60 days'),
('a2222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Acquisto', 2, 90, '#10B981', NOW() - INTERVAL '60 days');

-- ============================================
-- 4. CRM PERSON IDENTITIES (base identità)
-- ============================================
INSERT INTO crm_person_identities (person_id, tenant_id, email, phone, social_id, first_name, last_name, created_at) VALUES
-- Persons B2C
('p0000001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'mario.rossi@email.it', '+393401234567', NULL, 'Mario', 'Rossi', NOW() - INTERVAL '45 days'),
('p0000002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'giulia.bianchi@gmail.com', '+393457891234', NULL, 'Giulia', 'Bianchi', NOW() - INTERVAL '30 days'),
('p0000003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'luca.ferrari@yahoo.it', '+393389876543', NULL, 'Luca', 'Ferrari', NOW() - INTERVAL '25 days'),
('p0000004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'sara.romano@outlook.it', '+393472345678', NULL, 'Sara', 'Romano', NOW() - INTERVAL '18 days'),
('p0000005-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000001', 'andrea.conti@libero.it', '+393391234567', NULL, 'Andrea', 'Conti', NOW() - INTERVAL '12 days'),

-- Persons B2B (referenti aziendali)
('p1000001-1001-1001-1001-100000000001', '00000000-0000-0000-0000-000000000001', 'info@techsolutions.it', '+390294567890', NULL, 'Paolo', 'Marchetti', NOW() - INTERVAL '50 days'),
('p1000002-1002-1002-1002-100000000002', '00000000-0000-0000-0000-000000000001', 'commerciale@retailstore.com', '+390221234567', NULL, 'Francesca', 'Galli', NOW() - INTERVAL '40 days'),
('p1000003-1003-1003-1003-100000000003', '00000000-0000-0000-0000-000000000001', 'direzione@studioblu.it', '+390657890123', NULL, 'Roberto', 'Martini', NOW() - INTERVAL '35 days');

-- ============================================
-- 5. CRM LEADS (15 leads distribuiti)
-- ============================================
INSERT INTO crm_leads (id, tenant_id, person_id, first_name, last_name, email, phone, company, driver, status, source, campaign_id, lead_score, gdpr_consent, gdpr_consent_date, created_at) VALUES
-- Leads FISSO (5 leads)
('lead0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000001-0001-0001-0001-000000000001', 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', NULL, 'FISSO', 'qualified', 'website', '11111111-1111-1111-1111-111111111111', 75, true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
('lead0002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'p0000002-0002-0002-0002-000000000002', 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', NULL, 'FISSO', 'contacted', 'referral', '11111111-1111-1111-1111-111111111111', 60, true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('lead0003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'p1000001-1001-1001-1001-100000000001', 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', 'Tech Solutions SRL', 'FISSO', 'qualified', 'outbound_call', '11111111-1111-1111-1111-111111111111', 85, true, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),

-- Leads MOBILE (5 leads)
('lead0004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'p0000003-0003-0003-0003-000000000003', 'Luca', 'Ferrari', 'luca.ferrari@yahoo.it', '+393389876543', NULL, 'MOBILE', 'new', 'social_media', '22222222-2222-2222-2222-222222222222', 45, true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('lead0005-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000001', 'p0000004-0004-0004-0004-000000000004', 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', NULL, 'MOBILE', 'qualified', 'website', '22222222-2222-2222-2222-222222222222', 70, true, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('lead0006-0006-0006-0006-000000000006', '00000000-0000-0000-0000-000000000001', 'p1000002-1002-1002-1002-100000000002', 'Francesca', 'Galli', 'commerciale@retailstore.com', '+390221234567', 'Retail Store SPA', 'MOBILE', 'contacted', 'email_campaign', '22222222-2222-2222-2222-222222222222', 80, true, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),

-- Leads DEVICE (3 leads)
('lead0007-0007-0007-0007-000000000007', '00000000-0000-0000-0000-000000000001', 'p0000005-0005-0005-0005-000000000005', 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', NULL, 'DEVICE', 'qualified', 'store_visit', '33333333-3333-3333-3333-333333333333', 90, true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('lead0008-0008-0008-0008-000000000008', '00000000-0000-0000-0000-000000000001', 'p1000003-1003-1003-1003-100000000003', 'Roberto', 'Martini', 'direzione@studioblu.it', '+390657890123', 'Studio Blu Associati', 'DEVICE', 'new', 'partner', '33333333-3333-3333-3333-333333333333', 55, true, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),

-- Leads ACCESSORI (2 leads)  
('lead0009-0009-0009-0009-000000000009', '00000000-0000-0000-0000-000000000001', 'p0000001-0001-0001-0001-000000000001', 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', NULL, 'ACCESSORI', 'contacted', 'cross_sell', '44444444-4444-4444-4444-444444444444', 65, true, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('lead0010-0010-0010-0010-000000000010', '00000000-0000-0000-0000-000000000001', 'p0000002-0002-0002-0002-000000000002', 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', NULL, 'ACCESSORI', 'new', 'website', '44444444-4444-4444-4444-444444444444', 40, true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

-- ============================================
-- 6. CRM CUSTOMERS (8 clienti - 4 B2B, 4 B2C)
-- ============================================

-- Customers B2C (4 privati)
INSERT INTO crm_customers (id, tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, notes, created_at) VALUES
('cust0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000001-0001-0001-0001-000000000001', 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01', 
'[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI","country":"IT"}]'::jsonb, 
'active', 'Cliente da 3 anni, sempre puntuale nei pagamenti', NOW() - INTERVAL '40 days'),

('cust0002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'p0000002-0002-0002-0002-000000000002', 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
'[{"type":"billing","street":"Corso Vittorio Emanuele 88","city":"Roma","zip":"00186","province":"RM","country":"IT"}]'::jsonb,
'active', 'Passata da piano Basic a Premium', NOW() - INTERVAL '28 days'),

('cust0003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'p0000003-0003-0003-0003-000000000003', 'b2c', 'Luca', 'Ferrari', 'FRRLCU92C15L736W', 'luca.ferrari@yahoo.it', '+393389876543', '1992-03-15',
'[{"type":"billing","street":"Viale dei Pini 42","city":"Torino","zip":"10138","province":"TO","country":"IT"}]'::jsonb,
'active', NULL, NOW() - INTERVAL '20 days'),

('cust0004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'p0000004-0004-0004-0004-000000000004', 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
'[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE","country":"IT"}]'::jsonb,
'active', 'Interessata a pacchetto famiglia', NOW() - INTERVAL '15 days');

-- Customers B2B (4 aziende)
INSERT INTO crm_customers (id, tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, secondary_contacts, status, notes, created_at) VALUES
('cust1001-1001-1001-1001-100000000001', '00000000-0000-0000-0000-000000000001', 'p1000001-1001-1001-1001-100000000001', 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
'[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"},{"type":"sede_operativa","address":"Viale Tecnologia 88","city":"Milano","zip":"20139","province":"MI"}]'::jsonb,
'[{"name":"Laura Esposito","role":"CTO","email":"laura.esposito@techsolutions.it","phone":"+390294567891"}]'::jsonb,
'active', 'Contratto enterprise - 50 linee mobile + fibra aziendale', NOW() - INTERVAL '48 days'),

('cust1002-1002-1002-1002-100000000002', '00000000-0000-0000-0000-000000000001', 'p1000002-1002-1002-1002-100000000002', 'b2b', 'Retail Store SPA', 'spa', 'IT98765432109', 'retailstore@legalmail.it', 'XYZ1234', '47.71.10', 'Francesca Galli',
'[{"type":"sede_legale","address":"Corso del Commercio 150","city":"Roma","zip":"00100","province":"RM"}]'::jsonb,
'[{"name":"Giovanni Riva","role":"IT Manager","email":"g.riva@retailstore.com","phone":"+390221234568"}]'::jsonb,
'active', 'Catena retail - necessità connettività multi-sede', NOW() - INTERVAL '38 days'),

('cust1003-1003-1003-1003-100000000003', '00000000-0000-0000-0000-000000000001', 'p1000003-1003-1003-1003-100000000003', 'b2b', 'Studio Blu Associati', 'snc', 'IT55667788990', 'studioblu@pec.it', 'MNOP567', '69.20.30', 'Roberto Martini',
'[{"type":"sede_legale","address":"Piazza della Repubblica 8","city":"Firenze","zip":"50123","province":"FI"}]'::jsonb,
NULL,
'active', 'Studio professionale - 10 linee VoIP', NOW() - INTERVAL '33 days'),

('cust1004-1004-1004-1004-100000000004', '00000000-0000-0000-0000-000000000001', 'p1000001-1001-1001-1001-100000000001', 'b2b', 'Digital Agency SRLS', 'srls', 'IT11223344556', 'digitalagency@postacert.it', 'QRST890', '73.11.01', 'Paolo Marchetti',
'[{"type":"sede_legale","address":"Via Digitale 42","city":"Bologna","zip":"40100","province":"BO"}]'::jsonb,
'[{"name":"Chiara Vitali","role":"CEO","email":"chiara@digitalagency.it","phone":"+390511234567"}]'::jsonb,
'prospect', 'Lead qualificato - in trattativa per contratto Business', NOW() - INTERVAL '10 days');

-- ============================================
-- 7. CRM DEALS (10 deals in varie fasi)
-- ============================================
INSERT INTO crm_deals (id, tenant_id, person_id, pipeline_id, stage_id, title, description, value, probability, expected_close_date, status, driver, source_lead_id, assigned_to_user_id, created_at, updated_at) VALUES
-- Deals FISSO Pipeline
('deal0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'p0000001-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f3333333-3333-3333-3333-333333333333', 'Fibra 2.5 Gbps - Mario Rossi', 'Attivazione fibra ultra veloce per abitazione privata', 45.00, 50, NOW() + INTERVAL '15 days', 'open', 'FISSO', 'lead0001-0001-0001-0001-000000000001', 'admin-user', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),

('deal0002-0002-0002-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'p1000001-1001-1001-1001-100000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f4444444-4444-4444-4444-444444444444', 'Fibra Business + VoIP - Tech Solutions', 'Contratto aziendale: fibra dedicata 1 Gbps + 30 linee VoIP', 2500.00, 90, NOW() + INTERVAL '7 days', 'open', 'FISSO', 'lead0003-0003-0003-0003-000000000003', 'admin-user', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),

-- Deals MOBILE Pipeline
('deal0003-0003-0003-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'p0000004-0004-0004-0004-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'm2222222-2222-2222-2222-222222222222', 'Piano 5G Unlimited - Sara Romano', 'Abbonamento mobile 5G con giga illimitati', 25.00, 40, NOW() + INTERVAL '20 days', 'open', 'MOBILE', 'lead0005-0005-0005-0005-000000000005', 'admin-user', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),

('deal0004-0004-0004-0004-000000000004', '00000000-0000-0000-0000-000000000001', 'p1000002-1002-1002-1002-100000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'm3333333-3333-3333-3333-333333333333', 'Mobile Fleet 50 SIM - Retail Store', 'Contratto mobile aziendale per 50 dipendenti', 1250.00, 80, NOW() + INTERVAL '10 days', 'open', 'MOBILE', 'lead0006-0006-0006-0006-000000000006', 'admin-user', NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),

-- Deals DEVICE Pipeline
('deal0005-0005-0005-0005-000000000005', '00000000-0000-0000-0000-000000000001', 'p0000005-0005-0005-0005-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd2222222-2222-2222-2222-222222222222', 'iPhone 16 Pro - Andrea Conti', 'Vendita smartphone con rateizzazione 24 mesi', 1299.00, 50, NOW() + INTERVAL '12 days', 'open', 'DEVICE', 'lead0007-0007-0007-0007-000000000007', 'admin-user', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),

('deal0006-0006-0006-0006-000000000006', '00000000-0000-0000-0000-000000000001', 'p1000003-1003-1003-1003-100000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd1111111-1111-1111-1111-111111111111', 'Tablet Business x10 - Studio Blu', 'Fornitura 10 tablet per studio professionale', 4500.00, 20, NOW() + INTERVAL '30 days', 'open', 'DEVICE', 'lead0008-0008-0008-0008-000000000008', 'admin-user', NOW() - INTERVAL '15 days', NOW() - INTERVAL '4 days'),

-- Deals ACCESSORI Pipeline
('deal0007-0007-0007-0007-000000000007', '00000000-0000-0000-0000-000000000001', 'p0000001-0001-0001-0001-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'a2222222-2222-2222-2222-222222222222', 'Modem WiFi 6 - Mario Rossi', 'Vendita modem WiFi 6 per fibra ottica', 89.00, 90, NOW() + INTERVAL '5 days', 'open', 'ACCESSORI', 'lead0009-0009-0009-0009-000000000009', 'admin-user', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),

-- Deals Won (chiusi vinti)
('deal0008-0008-0008-0008-000000000008', '00000000-0000-0000-0000-000000000001', 'p0000002-0002-0002-0002-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f4444444-4444-4444-4444-444444444444', 'Fibra 1 Gbps - Giulia Bianchi', 'Contratto fibra completato', 35.00, 100, NOW() - INTERVAL '5 days', 'won', 'FISSO', 'lead0002-0002-0002-0002-000000000002', 'admin-user', NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),

('deal0009-0009-0009-0009-000000000009', '00000000-0000-0000-0000-000000000001', 'p0000003-0003-0003-0003-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'm3333333-3333-3333-3333-333333333333', 'Piano Mobile 100GB - Luca Ferrari', 'Abbonamento mobile attivato', 18.00, 100, NOW() - INTERVAL '10 days', 'won', 'MOBILE', 'lead0004-0004-0004-0004-000000000004', 'admin-user', NOW() - INTERVAL '20 days', NOW() - INTERVAL '10 days'),

-- Deal Lost
('deal0010-0010-0010-0010-000000000010', '00000000-0000-0000-0000-000000000001', 'p0000002-0002-0002-0002-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'a1111111-1111-1111-1111-111111111111', 'Cover iPhone - Giulia Bianchi', 'Cliente ha scelto concorrente', 25.00, 0, NOW() - INTERVAL '8 days', 'lost', 'ACCESSORI', 'lead0010-0010-0010-0010-000000000010', 'admin-user', NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days');
