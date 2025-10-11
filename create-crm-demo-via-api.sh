#!/bin/bash

API_BASE="http://localhost:3004/api/crm"
TENANT_ID="00000000-0000-0000-0000-000000000001"
HEADERS=(
  -H "X-Tenant-ID: $TENANT_ID"
  -H "Cookie: sessionAuth=authenticated; demoUser=admin-user"
  -H "Content-Type: application/json"
)

echo "🎯 Creating CRM Demo Data..."

# Create Campaign
CAMPAIGN_ID=$(curl -s "${HEADERS[@]}" -X POST "$API_BASE/campaigns" -d '{
  "name": "Promo Fibra 2024",
  "type": "inbound_media",
  "status": "active"
}' | jq -r '.data.id' 2>/dev/null || echo "")

if [ -n "$CAMPAIGN_ID" ]; then
  echo "✅ Campaign created: $CAMPAIGN_ID"
else
  echo "⚠️  Campaign creation failed or already exists"
fi

# Create Pipeline
PIPELINE_ID=$(curl -s "${HEADERS[@]}" -X POST "$API_BASE/pipelines" -d '{
  "name": "Pipeline Fibra",
  "domain": "sales"
}' | jq -r '.data.id' 2>/dev/null || echo "")

if [ -n "$PIPELINE_ID" ]; then
  echo "✅ Pipeline created: $PIPELINE_ID"
else
  echo "⚠️  Pipeline creation failed or already exists"
fi

# Create Leads (backend auto-creates personId)
curl -s "${HEADERS[@]}" -X POST "$API_BASE/leads" -d '{
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario.rossi@email.it",
  "phone": "+393401234567",
  "status": "qualified",
  "leadScore": 75,
  "privacyPolicyAccepted": true,
  "marketingConsent": true
}' > /dev/null && echo "✅ Lead 1 created: Mario Rossi"

curl -s "${HEADERS[@]}" -X POST "$API_BASE/leads" -d '{
  "firstName": "Giulia",
  "lastName": "Bianchi",
  "email": "giulia.bianchi@gmail.com",
  "phone": "+393457891234",
  "status": "contacted",
  "leadScore": 60,
  "privacyPolicyAccepted": true,
  "marketingConsent": true
}' > /dev/null && echo "✅ Lead 2 created: Giulia Bianchi"

curl -s "${HEADERS[@]}" -X POST "$API_BASE/leads" -d '{
  "firstName": "Paolo",
  "lastName": "Marchetti",
  "email": "info@techsolutions.it",
  "phone": "+390294567890",
  "status": "qualified",
  "leadScore": 85,
  "privacyPolicyAccepted": true,
  "marketingConsent": true
}' > /dev/null && echo "✅ Lead 3 created: Paolo Marchetti (B2B)"

# Create Customers
curl -s "${HEADERS[@]}" -X POST "$API_BASE/customers" -d '{
  "customerType": "b2c",
  "firstName": "Mario",
  "lastName": "Rossi",
  "fiscalCode": "RSSMRA85M01H501Z",
  "email": "mario.rossi@email.it",
  "phone": "+393401234567",
  "status": "active"
}' > /dev/null && echo "✅ Customer B2C created: Mario Rossi"

curl -s "${HEADERS[@]}" -X POST "$API_BASE/customers" -d '{
  "customerType": "b2c",
  "firstName": "Giulia",
  "lastName": "Bianchi",
  "fiscalCode": "BNCGLI90A41F205X",
  "email": "giulia.bianchi@gmail.com",
  "phone": "+393457891234",
  "status": "active"
}' > /dev/null && echo "✅ Customer B2C created: Giulia Bianchi"

curl -s "${HEADERS[@]}" -X POST "$API_BASE/customers" -d '{
  "customerType": "b2b",
  "companyName": "Tech Solutions SRL",
  "legalForm": "srl",
  "vatNumber": "IT12345678901",
  "email": "info@techsolutions.it",
  "phone": "+390294567890",
  "primaryContactName": "Paolo Marchetti",
  "status": "active"
}' > /dev/null && echo "✅ Customer B2B created: Tech Solutions SRL"

echo "🎉 CRM Demo Data Creation Complete!"
