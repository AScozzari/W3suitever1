/**
 * Fallback descriptions for common MCP tools
 * Used when tool descriptions are not available from the server
 */

export const TOOL_DESCRIPTION_FALLBACKS: Record<string, string> = {
  // WhatsApp Tools
  'send_message': 'Invia un messaggio WhatsApp a un contatto o gruppo',
  'edit_message': 'Modifica un messaggio WhatsApp già inviato',
  'delete_message': 'Elimina un messaggio WhatsApp precedentemente inviato',
  'search_chats': 'Cerca conversazioni, contatti o messaggi in WhatsApp',
  'get_chat_history': 'Recupera la cronologia dei messaggi di una chat specifica',
  'download_media': 'Scarica file multimediali (foto, video, documenti) da WhatsApp',
  'create_draft': 'Crea una bozza di messaggio da inviare successivamente',
  'manage_groups': 'Gestisci gruppi WhatsApp (crea, modifica, aggiungi/rimuovi membri)',
  
  // Telegram Tools
  'telegram_send_message': 'Invia un messaggio su Telegram',
  'telegram_edit_message': 'Modifica un messaggio Telegram già inviato',
  'telegram_delete_message': 'Elimina un messaggio Telegram',
  'telegram_get_updates': 'Recupera aggiornamenti e nuovi messaggi da Telegram',
  'telegram_send_photo': 'Invia una foto su Telegram',
  'telegram_send_document': 'Invia un documento su Telegram',
  
  // Facebook Pages Tools
  'create_facebook_post': 'Crea e pubblica un post sulla tua pagina Facebook',
  'read_posts': 'Leggi i post pubblicati sulla pagina Facebook',
  'moderate_comments': 'Modera i commenti sui post della pagina (approva, nascondi, elimina)',
  'fetch_post_insights': 'Recupera statistiche e insights sui post pubblicati',
  'filter_negative_feedback': 'Filtra e gestisci feedback negativi sui post',
  'get_page_analytics': 'Ottieni analytics e metriche della pagina Facebook',
  'schedule_posts': 'Programma post da pubblicare in futuro',
  
  // Instagram Tools
  'mcp_ig_post_photo': 'Pubblica una foto su Instagram',
  'mcp_ig_post_story': 'Pubblica una storia su Instagram',
  'mcp_ig_get_media': 'Recupera media pubblicati sul profilo Instagram',
  'mcp_ig_get_insights': 'Ottieni insights e statistiche del profilo Instagram',
  'mcp_ig_moderate_comments': 'Modera commenti sui post Instagram',
  'mcp_ig_search_hashtags': 'Cerca hashtag popolari su Instagram',
  'mcp_ig_get_followers': 'Recupera lista follower del profilo',
  'mcp_ig_schedule_post': 'Programma un post Instagram per pubblicazione futura',
  
  // Meta Ads Tools
  'mcp_meta_ads_get_ad_accounts': 'Recupera gli account pubblicitari Meta disponibili',
  'mcp_meta_ads_get_campaigns': 'Elenca le campagne pubblicitarie attive',
  'mcp_meta_ads_create_campaign': 'Crea una nuova campagna pubblicitaria Meta',
  'mcp_meta_ads_get_adsets': 'Recupera i gruppi di inserzioni (adsets) di una campagna',
  'mcp_meta_ads_search': 'Cerca inserzioni, campagne o audience specifiche',
  'mcp_meta_ads_get_insights': 'Ottieni metriche e performance delle campagne pubblicitarie',
  'mcp_meta_ads_optimize_budget': 'Ottimizza la distribuzione del budget tra le campagne',
  
  // Google Workspace Tools
  'gmail_send_email': 'Invia un\'email tramite Gmail',
  'gmail_read_emails': 'Leggi le email dalla casella Gmail',
  'gmail_search_emails': 'Cerca email nella casella Gmail',
  'gmail_create_draft': 'Crea una bozza email in Gmail',
  'calendar_create_event': 'Crea un nuovo evento in Google Calendar',
  'calendar_list_events': 'Elenca gli eventi dal Google Calendar',
  'drive_upload_file': 'Carica un file su Google Drive',
  'drive_list_files': 'Elenca i file su Google Drive',
  'drive_share_file': 'Condividi un file Google Drive con altri utenti',
  
  // Google Tag Manager Tools
  'gtm_create_container': 'Crea un nuovo container Google Tag Manager',
  'gtm_list_tags': 'Elenca i tag configurati nel container GTM',
  'gtm_create_tag': 'Crea un nuovo tag in Google Tag Manager',
  'gtm_update_tag': 'Aggiorna la configurazione di un tag esistente',
  'gtm_publish_version': 'Pubblica una versione del container GTM',
  'gtm_create_trigger': 'Crea un nuovo trigger per attivare i tag',
  
  // AWS Tools
  'aws_s3_upload': 'Carica un file su AWS S3',
  'aws_s3_list_objects': 'Elenca gli oggetti in un bucket S3',
  'aws_s3_download': 'Scarica un file da AWS S3',
  'aws_lambda_invoke': 'Invoca una funzione AWS Lambda',
  'aws_dynamodb_query': 'Esegui una query su DynamoDB',
  'aws_sns_publish': 'Pubblica un messaggio su AWS SNS',
  'aws_sqs_send': 'Invia un messaggio a una coda AWS SQS',
  
  // Microsoft 365 Tools
  'outlook_send_email': 'Invia un\'email tramite Outlook',
  'outlook_read_emails': 'Leggi le email dalla casella Outlook',
  'teams_send_message': 'Invia un messaggio su Microsoft Teams',
  'teams_create_channel': 'Crea un nuovo canale in Teams',
  'onedrive_upload': 'Carica un file su OneDrive',
  'onedrive_list_files': 'Elenca i file su OneDrive',
  'sharepoint_create_list': 'Crea una nuova lista SharePoint',
  
  // Generic/Common Tools
  'send': 'Invia dati o messaggi',
  'receive': 'Ricevi dati o messaggi',
  'create': 'Crea una nuova risorsa',
  'read': 'Leggi dati esistenti',
  'update': 'Aggiorna dati esistenti',
  'delete': 'Elimina una risorsa',
  'list': 'Elenca risorse disponibili',
  'search': 'Cerca tra le risorse disponibili',
  'upload': 'Carica file o dati',
  'download': 'Scarica file o dati',
};

/**
 * Get fallback description for a tool based on its name
 */
export function getToolDescriptionFallback(toolName: string): string | null {
  // Exact match
  if (TOOL_DESCRIPTION_FALLBACKS[toolName]) {
    return TOOL_DESCRIPTION_FALLBACKS[toolName];
  }
  
  // Try lowercase match
  const lowerName = toolName.toLowerCase();
  if (TOOL_DESCRIPTION_FALLBACKS[lowerName]) {
    return TOOL_DESCRIPTION_FALLBACKS[lowerName];
  }
  
  // Try to infer from common patterns
  if (lowerName.includes('send')) return 'Invia dati o messaggi';
  if (lowerName.includes('get') || lowerName.includes('fetch') || lowerName.includes('read')) {
    return 'Recupera dati o informazioni';
  }
  if (lowerName.includes('create')) return 'Crea una nuova risorsa';
  if (lowerName.includes('update') || lowerName.includes('edit') || lowerName.includes('modify')) {
    return 'Modifica dati esistenti';
  }
  if (lowerName.includes('delete') || lowerName.includes('remove')) {
    return 'Elimina una risorsa';
  }
  if (lowerName.includes('list') || lowerName.includes('all')) {
    return 'Elenca risorse disponibili';
  }
  if (lowerName.includes('search') || lowerName.includes('find')) {
    return 'Cerca tra le risorse disponibili';
  }
  if (lowerName.includes('upload')) return 'Carica file o dati';
  if (lowerName.includes('download')) return 'Scarica file o dati';
  
  return null;
}
