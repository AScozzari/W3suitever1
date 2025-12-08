-- W3 Suite CRM Complete Demo Data
-- Tenant: staging (00000000-0000-0000-0000-000000000001)
-- Store: First available store
-- User: admin-user (created if not exists)

SET search_path TO w3suite;

-- ============= SETUP: Get store_id and create/get admin-user =============
DO $$
DECLARE
  v_store_id UUID;
  v_user_id UUID;
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get first available store
  SELECT id INTO v_store_id FROM stores WHERE tenant_id = v_tenant_id LIMIT 1;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No store found for tenant %', v_tenant_id;
  END IF;
  
  RAISE NOTICE 'Using store: %', v_store_id;
  
  -- Create or get admin-user
  INSERT INTO users (id, tenant_id, email, first_name, last_name, status)
  VALUES (gen_random_uuid(), v_tenant_id, 'admin-user', 'Admin', 'User', 'active')
  ON CONFLICT (tenant_id, email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_user_id;
  
  RAISE NOTICE 'Using user: %', v_user_id;
  
  -- Store IDs in temporary table for later use
  CREATE TEMP TABLE IF NOT EXISTS demo_context (
    store_id UUID,
    user_id UUID,
    tenant_id UUID
  );
  DELETE FROM demo_context;
  INSERT INTO demo_context VALUES (v_store_id, v_user_id, v_tenant_id);
END $$;

-- ============= CAMPAIGNS =============
INSERT INTO crm_campaigns (tenant_id, name, type, status, start_date, end_date, created_at, updated_at)
SELECT 
  tenant_id,
  name,
  type,
  'active'::crm_campaign_status,
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '60 days',
  NOW(),
  NOW()
FROM demo_context, (VALUES
  ('Promo Fibra Natale 2024', 'inbound_media'::crm_campaign_type),
  ('WindTre 5G Unlimited', 'outbound_crm'::crm_campaign_type),
  ('Smartphone Days - iPhone 16', 'inbound_media'::crm_campaign_type),
  ('Smart Home Weekend', 'retention'::crm_campaign_type)
) AS campaigns(name, type);

-- ============= PIPELINES =============
INSERT INTO crm_pipelines (tenant_id, name, domain, is_active, stages_config, created_at, updated_at)
SELECT 
  tenant_id,
  name,
  'sales'::crm_pipeline_domain,
  true,
  '{}'::jsonb,
  NOW(),
  NOW()
FROM demo_context, (VALUES
  ('Pipeline Fibra & ADSL'),
  ('Pipeline Mobile 5G'),
  ('Pipeline Smartphone & Tablet'),
  ('Pipeline Accessori Tech')
) AS pipelines(name);

-- ============= PIPELINE STAGES =============
DO $$
DECLARE
  v_tenant_id UUID;
  v_pid_fisso UUID;
  v_pid_mobile UUID;
  v_pid_device UUID;
  v_pid_accessori UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM demo_context LIMIT 1;
  
  -- Get pipeline IDs
  SELECT id INTO v_pid_fisso FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Fibra & ADSL';
  SELECT id INTO v_pid_mobile FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Mobile 5G';
  SELECT id INTO v_pid_device FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Smartphone & Tablet';
  SELECT id INTO v_pid_accessori FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Accessori Tech';

  -- Stages FISSO
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pid_fisso, 'Richiesta Info', 'starter', 1, '#9333EA', true),
  (v_pid_fisso, 'Verifica Copertura', 'progress', 2, '#3B82F6', true),
  (v_pid_fisso, 'Preventivo Inviato', 'pending', 3, '#10B981', true),
  (v_pid_fisso, 'Contratto Firmato', 'purchase', 4, '#F59E0B', true);

  -- Stages MOBILE
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pid_mobile, 'Contatto Iniziale', 'starter', 1, '#9333EA', true),
  (v_pid_mobile, 'Piano Proposto', 'progress', 2, '#3B82F6', true),
  (v_pid_mobile, 'Attivazione', 'purchase', 3, '#10B981', true);

  -- Stages DEVICE
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pid_device, 'Interesse Dispositivo', 'starter', 1, '#9333EA', true),
  (v_pid_device, 'Demo/Prova', 'progress', 2, '#3B82F6', true),
  (v_pid_device, 'Ordine Confermato', 'purchase', 3, '#10B981', true);

  -- Stages ACCESSORI
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pid_accessori, 'Richiesta Accessorio', 'starter', 1, '#9333EA', true),
  (v_pid_accessori, 'Acquisto', 'purchase', 2, '#10B981', true);
END $$;

-- ============= PERSON IDENTITIES & LEADS =============
DO $$
DECLARE
  v_tenant_id UUID;
  v_store_id UUID;
  v_user_id UUID;
  v_person_id UUID;
BEGIN
  SELECT tenant_id, store_id, user_id INTO v_tenant_id, v_store_id, v_user_id FROM demo_context LIMIT 1;
  
  -- Lead 1: Mario Rossi (Qualified)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'mario.rossi@email.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 75, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', true, true, NOW(), NOW());

  -- Lead 2: Giulia Bianchi (Contacted)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'giulia.bianchi@gmail.com');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'contacted', 60, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', true, true, NOW(), NOW());

  -- Lead 3: Paolo Marchetti (Qualified - B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'info@techsolutions.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 85, 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', true, true, NOW(), NOW());

  -- Lead 4: Luca Ferrari (New)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'luca.ferrari@yahoo.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'new', 45, 'Luca', 'Ferrari', 'luca.ferrari@yahoo.it', '+393389876543', true, false, NOW(), NOW());

  -- Lead 5: Sara Romano (Qualified)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'sara.romano@outlook.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 70, 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', true, true, NOW(), NOW());

  -- Lead 6: Francesca Galli (Contacted - B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'commerciale@retailstore.com');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'contacted', 80, 'Francesca', 'Galli', 'commerciale@retailstore.com', '+390221234567', true, true, NOW(), NOW());

  -- Lead 7: Andrea Conti (Qualified)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'andrea.conti@libero.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 90, 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', true, true, NOW(), NOW());

  -- Lead 8: Roberto Martini (New - B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'direzione@studioblu.it');
  
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'new', 55, 'Roberto', 'Martini', 'direzione@studioblu.it', '+390657890123', true, false, NOW(), NOW());
END $$;

-- ============= CUSTOMERS (B2C) =============
DO $$
DECLARE
  v_tenant_id UUID;
  v_store_id UUID;
  v_person_id UUID;
BEGIN
  SELECT tenant_id, store_id INTO v_tenant_id, v_store_id FROM demo_context LIMIT 1;

  -- Customer 1: Mario Rossi (from lead)
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'mario.rossi@email.it' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01',
    '[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI"}]'::jsonb, 'active', NOW(), NOW());

  -- Customer 2: Giulia Bianchi
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'giulia.bianchi@gmail.com' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
    '[{"type":"billing","street":"Corso Vittorio 88","city":"Roma","zip":"00186","province":"RM"}]'::jsonb, 'active', NOW(), NOW());

  -- Customer 3: Luca Ferrari
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'luca.ferrari@yahoo.it' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Luca', 'Ferrari', 'FRRLCU92C15L736W', 'luca.ferrari@yahoo.it', '+393389876543', '1992-03-15',
    '[{"type":"billing","street":"Viale dei Pini 42","city":"Torino","zip":"10138","province":"TO"}]'::jsonb, 'active', NOW(), NOW());

  -- Customer 4: Sara Romano
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'sara.romano@outlook.it' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
    '[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE"}]'::jsonb, 'active', NOW(), NOW());
END $$;

-- ============= CUSTOMERS (B2B) =============
DO $$
DECLARE
  v_tenant_id UUID;
  v_store_id UUID;
  v_person_id UUID;
BEGIN
  SELECT tenant_id, store_id INTO v_tenant_id, v_store_id FROM demo_context LIMIT 1;

  -- Customer B2B 1: Tech Solutions SRL
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'info@techsolutions.it' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
    '[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"}]'::jsonb, 'active', NOW(), NOW());

  -- Customer B2B 2: Retail Store SPA
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'commerciale@retailstore.com' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Retail Store SPA', 'spa', 'IT98765432109', 'retailstore@legalmail.it', 'XYZ1234', '47.71.10', 'Francesca Galli',
    '[{"type":"sede_legale","address":"Corso Commercio 150","city":"Roma","zip":"00100","province":"RM"}]'::jsonb, 'active', NOW(), NOW());

  -- Customer B2B 3: Studio Blu Associati
  SELECT person_id INTO v_person_id FROM crm_person_identities 
  WHERE tenant_id = v_tenant_id AND identifier_value = 'direzione@studioblu.it' LIMIT 1;
  
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status, created_at, updated_at)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Studio Blu Associati', 'snc', 'IT55667788990', 'studioblu@pec.it', 'MNOP567', '69.20.30', 'Roberto Martini',
    '[{"type":"sede_legale","address":"Piazza Repubblica 8","city":"Firenze","zip":"50123","province":"FI"}]'::jsonb, 'prospect', NOW(), NOW());
END $$;

-- ============= DEALS =============
DO $$
DECLARE
  v_tenant_id UUID;
  v_store_id UUID;
  v_user_id UUID;
  v_person_id UUID;
  v_pipeline_id UUID;
  v_campaign_id UUID;
BEGIN
  SELECT tenant_id, store_id, user_id INTO v_tenant_id, v_store_id, v_user_id FROM demo_context LIMIT 1;
  
  -- Get campaign IDs
  SELECT id INTO v_campaign_id FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Promo Fibra Natale 2024';
  
  -- Deal 1: Mario Rossi - Fibra
  SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Fibra & ADSL';
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'mario.rossi@email.it';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Preventivo Inviato', 'open', v_campaign_id, 450.00, 60, NOW(), NOW());

  -- Deal 2: Tech Solutions - Fibra Business
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'info@techsolutions.it';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Contratto Firmato', 'open', v_campaign_id, 2500.00, 90, NOW(), NOW());

  -- Deal 3: Giulia - Mobile
  SELECT id INTO v_campaign_id FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'WindTre 5G Unlimited';
  SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Mobile 5G';
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'giulia.bianchi@gmail.com';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Piano Proposto', 'open', v_campaign_id, 300.00, 40, NOW(), NOW());

  -- Deal 4: Retail Store - Mobile Fleet
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'commerciale@retailstore.com';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Attivazione', 'open', v_campaign_id, 1250.00, 80, NOW(), NOW());

  -- Deal 5: Sara - Smartphone
  SELECT id INTO v_campaign_id FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smartphone Days - iPhone 16';
  SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Smartphone & Tablet';
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'sara.romano@outlook.it';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Demo/Prova', 'open', v_campaign_id, 1299.00, 50, NOW(), NOW());

  -- Deal 6: Andrea - Accessorio (WON)
  SELECT id INTO v_campaign_id FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smart Home Weekend';
  SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Accessori Tech';
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'andrea.conti@libero.it';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, won_at, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Acquisto', 'won', v_campaign_id, 89.00, 100, NOW(), NOW() - INTERVAL '2 days', NOW());

  -- Deal 7: Luca - Mobile (WON)
  SELECT id INTO v_campaign_id FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'WindTre 5G Unlimited';
  SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Mobile 5G';
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'luca.ferrari@yahoo.it';
  
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, won_at, created_at, updated_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_id, 'Attivazione', 'won', v_campaign_id, 350.00, 100, NOW(), NOW() - INTERVAL '5 days', NOW());
END $$;

-- ============= CLEANUP =============
DROP TABLE IF EXISTS demo_context;

-- ============= SUMMARY =============
DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  RAISE NOTICE '===== CRM DEMO DATA CREATED =====';
  RAISE NOTICE 'Campaigns: %', (SELECT COUNT(*) FROM crm_campaigns WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Pipelines: %', (SELECT COUNT(*) FROM crm_pipelines WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Pipeline Stages: %', (SELECT COUNT(*) FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE tenant_id = v_tenant_id));
  RAISE NOTICE 'Leads: %', (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Customers: %', (SELECT COUNT(*) FROM crm_customers WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Deals: %', (SELECT COUNT(*) FROM crm_deals WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '================================';
END $$;
