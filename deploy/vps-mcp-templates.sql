-- Create WMS_LIST_SERIALS query template
INSERT INTO w3suite.mcp_query_templates (
  id, code, name, description, department, action_type,
  sql_template, available_variables, required_variables, involved_tables,
  is_active, is_system_template
) VALUES (
  '6fb47d02-3551-480c-b048-e899a96cf964',
  'WMS_LIST_SERIALS',
  'Lista Seriali Inventario',
  'Elenca tutti i numeri seriali in inventario con filtri per magazzino, prodotto, stato logistico e range temporale.',
  'wms',
  'read',
  $SQL$
SELECT 
  ps.serial_value AS serial_number,
  ps.serial_type,
  pi.id AS item_id,
  pi.product_id,
  p.sku,
  p.name AS product_name,
  p.product_type,
  p.brand,
  pi.logistic_status,
  pi.condition,
  s.id AS warehouse_id,
  s.nome AS warehouse_name,
  s.code AS warehouse_code,
  pi.warehouse_location,
  pi.last_purchase_cost,
  pi.last_purchase_date,
  pi.created_at AS item_created_at,
  pi.updated_at AS item_updated_at
FROM w3suite.product_serials ps
JOIN w3suite.product_items pi ON ps.product_item_id = pi.id
JOIN w3suite.wms_products p ON pi.product_id = p.product_id
LEFT JOIN w3suite.stores s ON pi.store_id = s.id
WHERE pi.tenant_id = current_setting('app.tenant_id')::uuid
  AND ($1::uuid IS NULL OR pi.store_id = $1::uuid)
  AND ($2::text IS NULL OR pi.product_id = $2::text)
  AND ($3::text IS NULL OR p.sku ILIKE '%' || $3::text || '%')
  AND ($4::text IS NULL OR pi.logistic_status::text = $4::text)
  AND ($5::text IS NULL OR pi.condition::text = $5::text)
  AND ($6::timestamp IS NULL OR pi.updated_at >= $6::timestamp)
  AND ($7::timestamp IS NULL OR pi.updated_at <= $7::timestamp)
  AND ($8::text IS NULL OR ps.serial_value ILIKE '%' || $8::text || '%')
ORDER BY 
  CASE WHEN $9::text = 'serial_asc' THEN ps.serial_value END ASC,
  CASE WHEN $9::text = 'serial_desc' THEN ps.serial_value END DESC,
  CASE WHEN $9::text = 'updated_asc' THEN pi.updated_at END ASC,
  CASE WHEN $9::text = 'updated_desc' OR $9::text IS NULL THEN pi.updated_at END DESC
LIMIT COALESCE($10::integer, 100)
OFFSET COALESCE($11::integer, 0)
$SQL$,
  ARRAY['warehouse_id', 'product_id', 'sku', 'logistic_status', 'condition', 'date_from', 'date_to', 'serial_search', 'sort_by', 'limit', 'offset'],
  ARRAY[]::text[],
  ARRAY['product_serials', 'product_items', 'wms_products', 'stores'],
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create WMS_SERIAL_HISTORY query template
INSERT INTO w3suite.mcp_query_templates (
  id, code, name, description, department, action_type,
  sql_template, available_variables, required_variables, involved_tables,
  is_active, is_system_template
) VALUES (
  'f2dd134c-c2db-4e61-bf84-d8cc060e3cb6',
  'WMS_SERIAL_HISTORY',
  'Storico Stati Seriale',
  'Mostra la cronologia dei cambiamenti di stato per i seriali.',
  'wms',
  'read',
  $SQL$
SELECT 
  ie.serial_number,
  ie.event_type,
  ie.previous_state,
  ie.new_state,
  ie.quantity_change,
  ie.document_ref,
  ie.reason,
  ie.caused_by,
  ie.user_id,
  ie.event_at,
  s.id AS warehouse_id,
  s.nome AS warehouse_name,
  p.sku,
  p.name AS product_name
FROM w3suite.wms_inventory_events ie
LEFT JOIN w3suite.stores s ON ie.store_id = s.id
LEFT JOIN w3suite.wms_products p ON ie.product_id = p.product_id
WHERE ie.tenant_id = current_setting('app.tenant_id')::uuid
  AND ie.serial_number IS NOT NULL
  AND ($1::text IS NULL OR ie.serial_number ILIKE '%' || $1::text || '%')
  AND ($2::uuid IS NULL OR ie.store_id = $2::uuid)
  AND ($3::text IS NULL OR ie.product_id = $3::text)
  AND ($4::text IS NULL OR ie.new_state::text = $4::text)
  AND ($5::text IS NULL OR ie.previous_state::text = $5::text)
  AND ($6::timestamp IS NULL OR ie.event_at >= $6::timestamp)
  AND ($7::timestamp IS NULL OR ie.event_at <= $7::timestamp)
ORDER BY ie.event_at DESC
LIMIT COALESCE($8::integer, 100)
OFFSET COALESCE($9::integer, 0)
$SQL$,
  ARRAY['serial_search', 'warehouse_id', 'product_id', 'new_state', 'previous_state', 'date_from', 'date_to', 'limit', 'offset'],
  ARRAY[]::text[],
  ARRAY['wms_inventory_events', 'stores', 'wms_products'],
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create action_definition for WMS_LIST_SERIALS
INSERT INTO w3suite.action_definitions (
  id, action_id, department, action_name, description, action_category,
  icon, color, direction, flow_type, requires_approval,
  is_mcp_enabled, mcp_action_type, is_active, display_order,
  tenant_id, exposed_via_mcp, source_table, source_id, query_template_id,
  mcp_input_schema, variable_config
) VALUES (
  'f6dc6cb6-3b57-43c2-97d0-d78696d234aa',
  'mcp_wms_list_serials',
  'wms',
  'Lista Seriali Inventario',
  'Elenca tutti i numeri seriali in inventario con filtri per magazzino, prodotto, stato logistico, condizione e range temporale.',
  'query',
  'list',
  '#3B82F6',
  'inbound',
  'none',
  false,
  true,
  'read',
  true,
  100,
  NULL,
  true,
  'mcp_query_templates',
  '6fb47d02-3551-480c-b048-e899a96cf964',
  '6fb47d02-3551-480c-b048-e899a96cf964',
  '{"type": "object", "properties": {"warehouse_id": {"type": "string", "format": "uuid", "description": "ID del magazzino"}, "product_id": {"type": "string", "description": "ID prodotto"}, "sku": {"type": "string", "description": "Cerca per SKU"}, "logistic_status": {"type": "string", "enum": ["in_stock", "reserved", "preparing", "shipping", "in_transfer", "customer_return", "supplier_return", "doa_return", "internal_use", "in_service"]}, "condition": {"type": "string", "enum": ["new", "used", "refurbished", "damaged"]}, "date_from": {"type": "string", "format": "date-time"}, "date_to": {"type": "string", "format": "date-time"}, "serial_search": {"type": "string"}, "sort_by": {"type": "string", "enum": ["serial_asc", "serial_desc", "updated_asc", "updated_desc"], "default": "updated_desc"}, "limit": {"type": "integer", "default": 100, "maximum": 500}, "offset": {"type": "integer", "default": 0}}}',
  '{"warehouse_id": {"position": 1, "type": "uuid"}, "product_id": {"position": 2, "type": "text"}, "sku": {"position": 3, "type": "text"}, "logistic_status": {"position": 4, "type": "text"}, "condition": {"position": 5, "type": "text"}, "date_from": {"position": 6, "type": "timestamp"}, "date_to": {"position": 7, "type": "timestamp"}, "serial_search": {"position": 8, "type": "text"}, "sort_by": {"position": 9, "type": "text"}, "limit": {"position": 10, "type": "integer"}, "offset": {"position": 11, "type": "integer"}}'
) ON CONFLICT (id) DO NOTHING;

-- Create action_definition for WMS_SERIAL_HISTORY
INSERT INTO w3suite.action_definitions (
  id, action_id, department, action_name, description, action_category,
  icon, color, direction, flow_type, requires_approval,
  is_mcp_enabled, mcp_action_type, is_active, display_order,
  tenant_id, exposed_via_mcp, source_table, source_id, query_template_id,
  mcp_input_schema, variable_config
) VALUES (
  'e4f7a790-316f-40ec-8c76-913bda28c8ef',
  'mcp_wms_serial_history',
  'wms',
  'Storico Stati Seriale',
  'Mostra la cronologia completa dei cambiamenti di stato per i numeri seriali.',
  'query',
  'history',
  '#8B5CF6',
  'inbound',
  'none',
  false,
  true,
  'read',
  true,
  101,
  NULL,
  true,
  'mcp_query_templates',
  'f2dd134c-c2db-4e61-bf84-d8cc060e3cb6',
  'f2dd134c-c2db-4e61-bf84-d8cc060e3cb6',
  '{"type": "object", "properties": {"serial_search": {"type": "string", "description": "Cerca per numero seriale"}, "warehouse_id": {"type": "string", "format": "uuid"}, "product_id": {"type": "string"}, "new_state": {"type": "string", "enum": ["in_stock", "reserved", "preparing", "shipping", "in_transfer", "customer_return", "supplier_return", "doa_return", "internal_use", "in_service"]}, "previous_state": {"type": "string", "enum": ["in_stock", "reserved", "preparing", "shipping", "in_transfer", "customer_return", "supplier_return", "doa_return", "internal_use", "in_service"]}, "date_from": {"type": "string", "format": "date-time"}, "date_to": {"type": "string", "format": "date-time"}, "limit": {"type": "integer", "default": 100, "maximum": 500}, "offset": {"type": "integer", "default": 0}}}',
  '{"serial_search": {"position": 1, "type": "text"}, "warehouse_id": {"position": 2, "type": "uuid"}, "product_id": {"position": 3, "type": "text"}, "new_state": {"position": 4, "type": "text"}, "previous_state": {"position": 5, "type": "text"}, "date_from": {"position": 6, "type": "timestamp"}, "date_to": {"position": 7, "type": "timestamp"}, "limit": {"position": 8, "type": "integer"}, "offset": {"position": 9, "type": "integer"}}'
) ON CONFLICT (id) DO NOTHING;
