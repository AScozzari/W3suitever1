-- W3 Suite CRM Complete Demo Data (Single Transaction)
SET search_path TO w3suite;

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001';
  v_store_id UUID;
  v_user_id UUID;
  v_person_id UUID;
  v_pipeline_fisso UUID;
  v_pipeline_mobile UUID;
  v_pipeline_device UUID;
  v_pipeline_accessori UUID;
  v_campaign_fibra UUID;
  v_campaign_mobile UUID;
  v_campaign_smartphone UUID;
  v_campaign_smart_home UUID;
BEGIN
  -- Get first available store
  SELECT id INTO v_store_id FROM stores WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No store found for tenant';
  END IF;
  RAISE NOTICE 'Using store: %', v_store_id;
  
  -- Get or create admin-user (check first, then insert if not exists)
  SELECT id INTO v_user_id FROM users WHERE tenant_id = v_tenant_id AND email = 'admin-user';
  IF v_user_id IS NULL THEN
    INSERT INTO users (tenant_id, email, first_name, last_name, status)
    VALUES (v_tenant_id, 'admin-user', 'Admin', 'User', 'active')
    RETURNING id INTO v_user_id;
    RAISE NOTICE 'Created user: %', v_user_id;
  ELSE
    RAISE NOTICE 'Using existing user: %', v_user_id;
  END IF;

  -- ======== CAMPAIGNS ========
  INSERT INTO crm_campaigns (tenant_id, name, type, status, start_date, end_date)
  VALUES 
    (v_tenant_id, 'Promo Fibra Natale 2024', 'inbound_media', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
    (v_tenant_id, 'WindTre 5G Unlimited', 'outbound_crm', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
    (v_tenant_id, 'Smartphone Days - iPhone 16', 'inbound_media', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
    (v_tenant_id, 'Smart Home Weekend', 'retention', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days');

  SELECT id INTO v_campaign_fibra FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Promo Fibra Natale 2024';
  SELECT id INTO v_campaign_mobile FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'WindTre 5G Unlimited';
  SELECT id INTO v_campaign_smartphone FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smartphone Days - iPhone 16';
  SELECT id INTO v_campaign_smart_home FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smart Home Weekend';

  -- ======== PIPELINES ========
  INSERT INTO crm_pipelines (tenant_id, name, domain, is_active, stages_config)
  VALUES 
    (v_tenant_id, 'Pipeline Fibra & ADSL', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Mobile 5G', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Smartphone & Tablet', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Accessori Tech', 'sales', true, '{}'::jsonb');

  SELECT id INTO v_pipeline_fisso FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Fibra & ADSL';
  SELECT id INTO v_pipeline_mobile FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Mobile 5G';
  SELECT id INTO v_pipeline_device FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Smartphone & Tablet';
  SELECT id INTO v_pipeline_accessori FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Accessori Tech';

  -- ======== PIPELINE STAGES ========
  -- Fisso
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pipeline_fisso, 'Richiesta Info', 'starter', 1, '#9333EA', true),
  (v_pipeline_fisso, 'Verifica Copertura', 'progress', 2, '#3B82F6', true),
  (v_pipeline_fisso, 'Preventivo Inviato', 'pending', 3, '#10B981', true),
  (v_pipeline_fisso, 'Contratto Firmato', 'purchase', 4, '#F59E0B', true);

  -- Mobile
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pipeline_mobile, 'Contatto Iniziale', 'starter', 1, '#9333EA', true),
  (v_pipeline_mobile, 'Piano Proposto', 'progress', 2, '#3B82F6', true),
  (v_pipeline_mobile, 'Attivazione', 'purchase', 3, '#10B981', true);

  -- Device
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pipeline_device, 'Interesse Dispositivo', 'starter', 1, '#9333EA', true),
  (v_pipeline_device, 'Demo/Prova', 'progress', 2, '#3B82F6', true),
  (v_pipeline_device, 'Ordine Confermato', 'purchase', 3, '#10B981', true);

  -- Accessori
  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pipeline_accessori, 'Richiesta Accessorio', 'starter', 1, '#9333EA', true),
  (v_pipeline_accessori, 'Acquisto', 'purchase', 2, '#10B981', true);

  -- ======== LEADS + PERSON IDENTITIES ========
  -- Lead 1: Mario Rossi
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'mario.rossi@email.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 75, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', true, true);

  -- Lead 2: Giulia Bianchi
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'giulia.bianchi@gmail.com');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'contacted', 60, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', true, true);

  -- Lead 3: Paolo Marchetti (B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'info@techsolutions.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 85, 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', true, true);

  -- Lead 4: Luca Ferrari
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'luca.ferrari@yahoo.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'new', 45, 'Luca', 'Ferrari', 'luca.ferrari@yahoo.it', '+393389876543', true, false);

  -- Lead 5: Sara Romano
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'sara.romano@outlook.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 70, 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', true, true);

  -- Lead 6: Francesca Galli (B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'commerciale@retailstore.com');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'contacted', 80, 'Francesca', 'Galli', 'commerciale@retailstore.com', '+390221234567', true, true);

  -- Lead 7: Andrea Conti
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'andrea.conti@libero.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 90, 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', true, true);

  -- Lead 8: Roberto Martini (B2B)
  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'direzione@studioblu.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'new', 55, 'Roberto', 'Martini', 'direzione@studioblu.it', '+390657890123', true, false);

  -- ======== CUSTOMERS B2C ========
  -- Mario Rossi
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'mario.rossi@email.it';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01',
    '[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI"}]'::jsonb, 'active');

  -- Giulia Bianchi
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'giulia.bianchi@gmail.com';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
    '[{"type":"billing","street":"Corso Vittorio 88","city":"Roma","zip":"00186","province":"RM"}]'::jsonb, 'active');

  -- Luca Ferrari
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'luca.ferrari@yahoo.it';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Luca', 'Ferrari', 'FRRLCU92C15L736W', 'luca.ferrari@yahoo.it', '+393389876543', '1992-03-15',
    '[{"type":"billing","street":"Viale dei Pini 42","city":"Torino","zip":"10138","province":"TO"}]'::jsonb, 'active');

  -- Sara Romano
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'sara.romano@outlook.it';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
    '[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE"}]'::jsonb, 'active');

  -- ======== CUSTOMERS B2B ========
  -- Tech Solutions SRL
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'info@techsolutions.it';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
    '[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"}]'::jsonb, 'active');

  -- Retail Store SPA
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'commerciale@retailstore.com';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Retail Store SPA', 'spa', 'IT98765432109', 'retailstore@legalmail.it', 'XYZ1234', '47.71.10', 'Francesca Galli',
    '[{"type":"sede_legale","address":"Corso Commercio 150","city":"Roma","zip":"00100","province":"RM"}]'::jsonb, 'active');

  -- Studio Blu Associati
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'direzione@studioblu.it';
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Studio Blu Associati', 'snc', 'IT55667788990', 'studioblu@pec.it', 'MNOP567', '69.20.30', 'Roberto Martini',
    '[{"type":"sede_legale","address":"Piazza Repubblica 8","city":"Firenze","zip":"50123","province":"FI"}]'::jsonb, 'prospect');

  -- ======== DEALS ========
  -- Deal 1: Mario - Fibra
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'mario.rossi@email.it';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_fisso, 'Preventivo Inviato', 'open', v_campaign_fibra, 450.00, 60);

  -- Deal 2: Tech Solutions - Fibra Business
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'info@techsolutions.it';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_fisso, 'Contratto Firmato', 'open', v_campaign_fibra, 2500.00, 90);

  -- Deal 3: Giulia - Mobile
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'giulia.bianchi@gmail.com';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_mobile, 'Piano Proposto', 'open', v_campaign_mobile, 300.00, 40);

  -- Deal 4: Retail Store - Mobile Fleet
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'commerciale@retailstore.com';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_mobile, 'Attivazione', 'open', v_campaign_mobile, 1250.00, 80);

  -- Deal 5: Sara - Smartphone
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'sara.romano@outlook.it';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_device, 'Demo/Prova', 'open', v_campaign_smartphone, 1299.00, 50);

  -- Deal 6: Andrea - Accessorio (WON)
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'andrea.conti@libero.it';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, won_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_accessori, 'Acquisto', 'won', v_campaign_smart_home, 89.00, 100, NOW() - INTERVAL '2 days');

  -- Deal 7: Luca - Mobile (WON)
  SELECT person_id INTO v_person_id FROM crm_person_identities WHERE tenant_id = v_tenant_id AND identifier_value = 'luca.ferrari@yahoo.it';
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, won_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_mobile, 'Attivazione', 'won', v_campaign_mobile, 350.00, 100, NOW() - INTERVAL '5 days');

  -- SUMMARY
  RAISE NOTICE '===== CRM DEMO DATA CREATED =====';
  RAISE NOTICE 'Campaigns: %', (SELECT COUNT(*) FROM crm_campaigns WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Pipelines: %', (SELECT COUNT(*) FROM crm_pipelines WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Pipeline Stages: %', (SELECT COUNT(*) FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE tenant_id = v_tenant_id));
  RAISE NOTICE 'Leads: %', (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Customers: %', (SELECT COUNT(*) FROM crm_customers WHERE tenant_id = v_tenant_id);
  RAISE NOTICE 'Deals: %', (SELECT COUNT(*) FROM crm_deals WHERE tenant_id = v_tenant_id);
  RAISE NOTICE '================================';
END $$;
