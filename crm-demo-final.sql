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
  SELECT id INTO v_store_id FROM stores WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No store found';
  END IF;
  
  SELECT id INTO v_user_id FROM users WHERE tenant_id = v_tenant_id AND email = 'admin-user';
  IF v_user_id IS NULL THEN
    INSERT INTO users (tenant_id, email, first_name, last_name, status)
    VALUES (v_tenant_id, 'admin-user', 'Admin', 'User', 'active')
    RETURNING id INTO v_user_id;
  END IF;

  INSERT INTO crm_campaigns (tenant_id, name, type, status) VALUES 
    (v_tenant_id, 'Promo Fibra Natale 2024', 'inbound_media', 'active'),
    (v_tenant_id, 'WindTre 5G', 'outbound_crm', 'active'),
    (v_tenant_id, 'Smartphone Days', 'inbound_media', 'active'),
    (v_tenant_id, 'Smart Home', 'retention', 'active');

  SELECT id INTO v_campaign_fibra FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Promo Fibra Natale 2024';
  SELECT id INTO v_campaign_mobile FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'WindTre 5G';
  SELECT id INTO v_campaign_smartphone FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smartphone Days';
  SELECT id INTO v_campaign_smart_home FROM crm_campaigns WHERE tenant_id = v_tenant_id AND name = 'Smart Home';

  INSERT INTO crm_pipelines (tenant_id, name, domain, is_active, stages_config) VALUES 
    (v_tenant_id, 'Pipeline Fibra ADSL', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Mobile', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Smartphone', 'sales', true, '{}'::jsonb),
    (v_tenant_id, 'Pipeline Accessori', 'sales', true, '{}'::jsonb');

  SELECT id INTO v_pipeline_fisso FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Fibra ADSL';
  SELECT id INTO v_pipeline_mobile FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Mobile';
  SELECT id INTO v_pipeline_device FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Smartphone';
  SELECT id INTO v_pipeline_accessori FROM crm_pipelines WHERE tenant_id = v_tenant_id AND name = 'Pipeline Accessori';

  INSERT INTO crm_pipeline_stages (pipeline_id, name, category, order_index, color, is_active) VALUES
  (v_pipeline_fisso, 'Richiesta Info', 'starter', 1, '#9333EA', true),
  (v_pipeline_fisso, 'Verifica Copertura', 'progress', 2, '#3B82F6', true),
  (v_pipeline_fisso, 'Preventivo Inviato', 'pending', 3, '#10B981', true),
  (v_pipeline_fisso, 'Contratto Firmato', 'purchase', 4, '#F59E0B', true),
  (v_pipeline_mobile, 'Contatto Iniziale', 'starter', 1, '#9333EA', true),
  (v_pipeline_mobile, 'Piano Proposto', 'progress', 2, '#3B82F6', true),
  (v_pipeline_mobile, 'Attivazione', 'purchase', 3, '#10B981', true),
  (v_pipeline_device, 'Interesse Dispositivo', 'starter', 1, '#9333EA', true),
  (v_pipeline_device, 'Demo Prova', 'progress', 2, '#3B82F6', true),
  (v_pipeline_device, 'Ordine Confermato', 'purchase', 3, '#10B981', true),
  (v_pipeline_accessori, 'Richiesta Accessorio', 'starter', 1, '#9333EA', true),
  (v_pipeline_accessori, 'Acquisto', 'purchase', 2, '#10B981', true);

  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'mario.rossi@email.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 75, 'Mario', 'Rossi', 'mario.rossi@email.it', '+393401234567', true, true);
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Mario', 'Rossi', 'RSSMRA85M01H501Z', 'mario.rossi@email.it', '+393401234567', '1985-08-01',
    '[{"type":"billing","street":"Via Roma 15","city":"Milano","zip":"20121","province":"MI"}]'::jsonb, 'active');
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_fisso, 'Preventivo Inviato', 'open', v_campaign_fibra, 450.00, 60);

  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'giulia.bianchi@gmail.com');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'contacted', 60, 'Giulia', 'Bianchi', 'giulia.bianchi@gmail.com', '+393457891234', true, true);
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Giulia', 'Bianchi', 'BNCGLI90A41F205X', 'giulia.bianchi@gmail.com', '+393457891234', '1990-01-01',
    '[{"type":"billing","street":"Corso Vittorio 88","city":"Roma","zip":"00186","province":"RM"}]'::jsonb, 'active');
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_mobile, 'Piano Proposto', 'open', v_campaign_mobile, 300.00, 40);

  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'info@techsolutions.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 85, 'Paolo', 'Marchetti', 'info@techsolutions.it', '+390294567890', true, true);
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, company_name, legal_form, vat_number, pec_email, sdi_code, ateco_code, primary_contact_name, sedi, status)
  VALUES (v_tenant_id, v_person_id, 'b2b', 'Tech Solutions SRL', 'srl', 'IT12345678901', 'techsolutions@pec.it', 'ABCDEFG', '62.01.00', 'Paolo Marchetti',
    '[{"type":"sede_legale","address":"Via Innovazione 25","city":"Milano","zip":"20100","province":"MI"}]'::jsonb, 'active');
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_fisso, 'Contratto Firmato', 'open', v_campaign_fibra, 2500.00, 90);

  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'sara.romano@outlook.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 70, 'Sara', 'Romano', 'sara.romano@outlook.it', '+393472345678', true, true);
  INSERT INTO crm_customers (tenant_id, person_id, customer_type, first_name, last_name, fiscal_code, email, phone, birth_date, addresses, status)
  VALUES (v_tenant_id, v_person_id, 'b2c', 'Sara', 'Romano', 'RMNSAR88D50D612K', 'sara.romano@outlook.it', '+393472345678', '1988-04-10',
    '[{"type":"billing","street":"Via Garibaldi 120","city":"Genova","zip":"16121","province":"GE"}]'::jsonb, 'active');
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_device, 'Demo Prova', 'open', v_campaign_smartphone, 1299.00, 50);

  v_person_id := gen_random_uuid();
  INSERT INTO crm_person_identities (person_id, tenant_id, identifier_type, identifier_value)
  VALUES (v_person_id, v_tenant_id, 'email', 'andrea.conti@libero.it');
  INSERT INTO crm_leads (tenant_id, store_id, person_id, status, lead_score, first_name, last_name, email, phone, privacy_policy_accepted, marketing_consent)
  VALUES (v_tenant_id, v_store_id, v_person_id, 'qualified', 90, 'Andrea', 'Conti', 'andrea.conti@libero.it', '+393391234567', true, true);
  INSERT INTO crm_deals (tenant_id, store_id, owner_user_id, person_id, pipeline_id, stage, status, campaign_id, estimated_value, probability, won_at)
  VALUES (v_tenant_id, v_store_id, v_user_id, v_person_id, v_pipeline_accessori, 'Acquisto', 'won', v_campaign_smart_home, 89.00, 100, NOW());

  RAISE NOTICE 'CRM Demo Data Created Successfully!';
  RAISE NOTICE 'Campaigns: %, Pipelines: %, Leads: %, Customers: %, Deals: %',
    (SELECT COUNT(*) FROM crm_campaigns WHERE tenant_id = v_tenant_id),
    (SELECT COUNT(*) FROM crm_pipelines WHERE tenant_id = v_tenant_id),
    (SELECT COUNT(*) FROM crm_leads WHERE tenant_id = v_tenant_id),
    (SELECT COUNT(*) FROM crm_customers WHERE tenant_id = v_tenant_id),
    (SELECT COUNT(*) FROM crm_deals WHERE tenant_id = v_tenant_id);
END $$;
