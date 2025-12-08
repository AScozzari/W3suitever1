-- W3 Suite CRM Minimal Demo Data - Schema Aligned
SET search_path TO w3suite;

-- ============= CAMPAIGNS =============
INSERT INTO crm_campaigns (tenant_id, name, type, status, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'Promo Fibra Natale 2024', 'inbound_media', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'WindTre 5G Unlimited', 'outbound_crm', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'Smartphone Days - iPhone 16', 'inbound_media', 'active', NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'Smart Home Weekend', 'retention', 'active', NOW(), NOW());

-- ============= PIPELINES =============
INSERT INTO crm_pipelines (tenant_id, name, domain, is_active, stages_config, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'Pipeline Fibra & ADSL', 'sales', true, '{}'::jsonb, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'Pipeline Mobile 5G', 'sales', true, '{}'::jsonb, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'Pipeline Smartphone & Tablet', 'sales', true, '{}'::jsonb, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', 'Pipeline Accessori Tech', 'sales', true, '{}'::jsonb, NOW(), NOW());

-- ============= PIPELINE STAGES =============
-- Get pipeline IDs first, then create stages
DO $$
DECLARE
  pid_fisso UUID;
  pid_mobile UUID;
  pid_device UUID;
  pid_accessori UUID;
BEGIN
  SELECT id INTO pid_fisso FROM crm_pipelines WHERE name = 'Pipeline Fibra & ADSL' LIMIT 1;
  SELECT id INTO pid_mobile FROM crm_pipelines WHERE name = 'Pipeline Mobile 5G' LIMIT 1;
  SELECT id INTO pid_device FROM crm_pipelines WHERE name = 'Pipeline Smartphone & Tablet' LIMIT 1;
  SELECT id INTO pid_accessori FROM crm_pipelines WHERE name = 'Pipeline Accessori Tech' LIMIT 1;

  -- Stages FISSO
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (pid_fisso, 'Richiesta Info', 'starter', 1, '#9333EA', true),
  (pid_fisso, 'Verifica Copertura', 'progress', 2, '#3B82F6', true),
  (pid_fisso, 'Preventivo Inviato', 'pending', 3, '#10B981', true),
  (pid_fisso, 'Contratto Firmato', 'purchase', 4, '#F59E0B', true);

  -- Stages MOBILE
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (pid_mobile, 'Contatto Iniziale', 'starter', 1, '#9333EA', true),
  (pid_mobile, 'Piano Proposto', 'progress', 2, '#3B82F6', true),
  (pid_mobile, 'Attivazione', 'purchase', 3, '#10B981', true);

  -- Stages DEVICE
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (pid_device, 'Interesse Dispositivo', 'starter', 1, '#9333EA', true),
  (pid_device, 'Demo/Prova', 'progress', 2, '#3B82F6', true),
  (pid_device, 'Ordine Confermato', 'purchase', 3, '#10B981', true);

  -- Stages ACCESSORI
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (pid_accessori, 'Richiesta Accessorio', 'starter', 1, '#9333EA', true),
  (pid_accessori, 'Acquisto', 'purchase', 2, '#10B981', true);
END $$;

-- ============= LEADS =============
INSERT INTO crm_leads (tenant_id, store_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'qualified', 75, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'contacted', 60, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'qualified', 85, 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'new', 45, 'Luca', 'Ferrari', 'luca.ferrari@yahoo.it', '+393389876543', true, false, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'qualified', 70, 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'contacted', 80, 'Francesca', 'Galli', 'commerciale@retailstore.com', '+390221234567', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'qualified', 90, 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', true, true, NOW(), NOW()),
('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', 'new', 55, 'Roberto', 'Martini', 'direzione@studioblu.it', '+390657890123', true, false, NOW(), NOW());

-- ============= PERSON IDENTITIES (for customers) =============
-- Create person identities with random UUIDs
DO $$
BEGIN
  -- B2C Persons
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'mario.rossi@email.it'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'giulia.bianchi@gmail.com'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'luca.ferrari@yahoo.it'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'sara.romano@outlook.it'),
  
  -- B2B Persons
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'info@techsolutions.it'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'commerciale@retailstore.com'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'direzione@studioblu.it'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'email', 'contact@digitalagency.it');
END $$;

-- ============= CUSTOMERS =============
DO $$
DECLARE
  pid_mario UUID;
  pid_giulia UUID;
  pid_luca UUID;
  pid_sara UUID;
  pid_tech UUID;
  pid_retail UUID;
  pid_studio UUID;
  pid_digital UUID;
BEGIN
  -- Get person IDs
  SELECT person_id INTO pid_mario FROM crm_person_identities WHERE identifier_value = 'mario.rossi@email.it' LIMIT 1;
  SELECT person_id INTO pid_giulia FROM crm_person_identities WHERE identifier_value = 'giulia.bianchi@gmail.com' LIMIT 1;
  SELECT person_id INTO pid_luca FROM crm_person_identities WHERE identifier_value = 'luca.ferrari@yahoo.it' LIMIT 1;
  SELECT person_id INTO pid_sara FROM crm_person_identities WHERE identifier_value = 'sara.romano@outlook.it' LIMIT 1;
  SELECT person_id INTO pid_tech FROM crm_person_identities WHERE identifier_value = 'info@techsolutions.it' LIMIT 1;
  SELECT person_id INTO pid_retail FROM crm_person_identities WHERE identifier_value = 'commerciale@retailstore.com' LIMIT 1;
  SELECT person_id INTO pid_studio FROM crm_person_identities WHERE identifier_value = 'direzione@studioblu.it' LIMIT 1;
  SELECT person_id INTO pid_digital FROM crm_person_identities WHERE identifier_value = 'contact@digitalagency.it' LIMIT 1;

  -- B2C Customers
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status) VALUES
  ('00000000-0000-0000-0000-000000000001', pid_mario, 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01', 
   '[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_giulia, 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
   '[{"type":"billing","street":"Corso Vittorio 88","city":"Roma","zip":"00186","province":"RM"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_luca, 'b2c', 'Luca', 'Ferrari', 'FRRLCU92C15L736W', 'luca.ferrari@yahoo.it', '+393389876543', '1992-03-15',
   '[{"type":"billing","street":"Viale dei Pini 42","city":"Torino","zip":"10138","province":"TO"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_sara, 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
   '[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE"}]'::jsonb, 'active');

  -- B2B Customers
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status) VALUES
  ('00000000-0000-0000-0000-000000000001', pid_tech, 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
   '[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_retail, 'b2b', 'Retail Store SPA', 'spa', 'IT98765432109', 'retailstore@legalmail.it', 'XYZ1234', '47.71.10', 'Francesca Galli',
   '[{"type":"sede_legale","address":"Corso Commercio 150","city":"Roma","zip":"00100","province":"RM"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_studio, 'b2b', 'Studio Blu Associati', 'snc', 'IT55667788990', 'studioblu@pec.it', 'MNOP567', '69.20.30', 'Roberto Martini',
   '[{"type":"sede_legale","address":"Piazza Repubblica 8","city":"Firenze","zip":"50123","province":"FI"}]'::jsonb, 'active'),
  
  ('00000000-0000-0000-0000-000000000001', pid_digital, 'b2b', 'Digital Agency SRLS', 'srls', 'IT11223344556', 'digitalagency@postacert.it', 'QRST890', '73.11.01', 'Paolo Marchetti',
   '[{"type":"sede_legale","address":"Via Digitale 42","city":"Bologna","zip":"40100","province":"BO"}]'::jsonb, 'prospect');
END $$;

-- ============= DEALS =============
DO $$
DECLARE
  pid_fisso UUID;
  pid_mobile UUID;
  pid_device UUID;
  pid_accessori UUID;
  cid_fibra UUID;
  cid_mobile UUID;
BEGIN
  -- Get pipeline IDs
  SELECT id INTO pid_fisso FROM crm_pipelines WHERE name = 'Pipeline Fibra & ADSL' LIMIT 1;
  SELECT id INTO pid_mobile FROM crm_pipelines WHERE name = 'Pipeline Mobile 5G' LIMIT 1;
  SELECT id INTO pid_device FROM crm_pipelines WHERE name = 'Pipeline Smartphone & Tablet' LIMIT 1;
  SELECT id INTO pid_accessori FROM crm_pipelines WHERE name = 'Pipeline Accessori Tech' LIMIT 1;
  
  -- Get campaign IDs
  SELECT id INTO cid_fibra FROM crm_campaigns WHERE name = 'Promo Fibra Natale 2024' LIMIT 1;
  SELECT id INTO cid_mobile FROM crm_campaigns WHERE name = 'WindTre 5G Unlimited' LIMIT 1;

  -- Create deals
  INSERT INTO crm_deals (tenant_id, store_id, pipeline_id, stage, status, campaign_id, estimated_value, probability) VALUES
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_fisso, 'Preventivo Inviato', 'open', cid_fibra, 45.00, 50),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_fisso, 'Contratto Firmato', 'open', cid_fibra, 2500.00, 90),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_mobile, 'Piano Proposto', 'open', cid_mobile, 25.00, 40),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_mobile, 'Attivazione', 'open', cid_mobile, 1250.00, 80),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_device, 'Demo/Prova', 'open', cid_mobile, 1299.00, 50),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_accessori, 'Acquisto', 'open', cid_fibra, 89.00, 90),
  ('00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', pid_mobile, 'Attivazione', 'won', cid_mobile, 35.00, 100);
END $$;
