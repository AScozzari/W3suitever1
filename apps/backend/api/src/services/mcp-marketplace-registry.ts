/**
 * 🏪 MCP MARKETPLACE REGISTRY
 * Registry of available MCP servers with installation metadata
 */

export interface MCPServerTemplate {
  id: string;
  name: string; // e.g., 'google-workspace'
  displayName: string;
  description: string;
  category: 'productivity' | 'communication' | 'storage' | 'database' | 'payment' | 'analytics' | 'other';
  language: 'typescript' | 'python';
  packageManager: 'npm' | 'pip';
  packageName: string; // e.g., '@modelcontextprotocol/server-google-workspace'
  version?: string;
  authType: 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'none';
  iconUrl?: string;
  officialSupport: boolean; // true for official @modelcontextprotocol packages
  transport: 'stdio' | 'http-sse';
  
  // Installation hints
  installHints?: {
    envVars?: string[]; // Required environment variables
    dependencies?: string[]; // Additional dependencies
    postInstallNotes?: string; // Special instructions after install
  };
  
  // OAuth configuration (if applicable)
  oauthConfig?: {
    scopes: string[];
    provider: 'google' | 'microsoft' | 'meta' | 'aws' | 'stripe' | 'github';
  };
  
  // Tools preview (will be discovered after installation)
  exampleTools?: string[]; // e.g., ['gmail-send', 'gmail-search', 'calendar-create-event']
}

export class MCPMarketplaceRegistry {
  private static templates: MCPServerTemplate[] = [
    // ==================== GOOGLE WORKSPACE ====================
    {
      id: 'google-workspace',
      name: 'google-workspace',
      displayName: 'Google Workspace',
      description: 'Access Gmail, Calendar, Drive, Docs, and Sheets. Send emails, manage events, upload files, and more.',
      category: 'productivity',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-google-workspace',
      authType: 'oauth2',
      iconUrl: 'https://www.gstatic.com/images/branding/product/1x/workspace_48dp.png',
      officialSupport: true,
      transport: 'stdio',
      oauthConfig: {
        scopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/drive.file'
        ],
        provider: 'google'
      },
      exampleTools: [
        'gmail-send',
        'gmail-search',
        'calendar-create-event',
        'calendar-list-events',
        'drive-upload-file',
        'drive-list-files',
        'sheets-read-range',
        'sheets-write-range'
      ]
    },
    
    // ==================== SLACK ====================
    {
      id: 'slack',
      name: 'slack',
      displayName: 'Slack',
      description: 'Send messages, create channels, manage users, and interact with Slack workspaces.',
      category: 'communication',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-slack',
      authType: 'oauth2',
      iconUrl: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
      officialSupport: true,
      transport: 'stdio',
      oauthConfig: {
        scopes: [
          'chat:write',
          'channels:read',
          'channels:manage',
          'users:read'
        ],
        provider: 'github' // Slack uses GitHub-style OAuth
      },
      exampleTools: [
        'slack-send-message',
        'slack-create-channel',
        'slack-list-channels',
        'slack-get-user'
      ]
    },
    
    // ==================== GITHUB ====================
    {
      id: 'github',
      name: 'github',
      displayName: 'GitHub',
      description: 'Manage repositories, issues, pull requests, and workflows. Search code, create issues, and more.',
      category: 'productivity',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-github',
      authType: 'oauth2',
      iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      officialSupport: true,
      transport: 'stdio',
      oauthConfig: {
        scopes: [
          'repo',
          'read:org',
          'workflow'
        ],
        provider: 'github'
      },
      exampleTools: [
        'github-create-issue',
        'github-search-code',
        'github-create-pr',
        'github-list-repos'
      ]
    },
    
    // ==================== STRIPE ====================
    {
      id: 'stripe',
      name: 'stripe',
      displayName: 'Stripe',
      description: 'Process payments, manage customers, create subscriptions, and handle invoices.',
      category: 'payment',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-stripe',
      authType: 'api_key',
      iconUrl: 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg',
      officialSupport: true,
      transport: 'stdio',
      installHints: {
        envVars: ['STRIPE_SECRET_KEY'],
        postInstallNotes: 'Get your API key from https://dashboard.stripe.com/apikeys'
      },
      exampleTools: [
        'stripe-create-payment',
        'stripe-create-customer',
        'stripe-create-subscription',
        'stripe-create-invoice'
      ]
    },
    
    // ==================== AWS ====================
    {
      id: 'aws',
      name: 'aws',
      displayName: 'AWS',
      description: 'Interact with Amazon Web Services: S3, Lambda, DynamoDB, SNS, SQS, and more.',
      category: 'storage',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-aws',
      authType: 'api_key',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
      officialSupport: true,
      transport: 'stdio',
      installHints: {
        envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
        postInstallNotes: 'Configure IAM credentials with appropriate permissions'
      },
      exampleTools: [
        's3-upload-file',
        's3-list-buckets',
        'lambda-invoke',
        'dynamodb-query',
        'sns-publish',
        'sqs-send-message'
      ]
    },
    
    // ==================== POSTGRESQL ====================
    {
      id: 'postgres',
      name: 'postgres',
      displayName: 'PostgreSQL',
      description: 'Query and manage PostgreSQL databases. Run SQL, create tables, and analyze data.',
      category: 'database',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-postgres',
      authType: 'basic_auth',
      iconUrl: 'https://www.postgresql.org/media/img/about/press/elephant.png',
      officialSupport: true,
      transport: 'stdio',
      installHints: {
        envVars: ['POSTGRES_CONNECTION_STRING'],
        postInstallNotes: 'Use format: postgresql://user:password@host:port/database'
      },
      exampleTools: [
        'postgres-query',
        'postgres-execute',
        'postgres-list-tables',
        'postgres-describe-table'
      ]
    },
    
    // ==================== GOOGLE ANALYTICS / GTM ====================
    {
      id: 'google-analytics',
      name: 'google-analytics',
      displayName: 'Google Analytics & GTM',
      description: 'Track events, manage tags, analyze data, and configure Google Tag Manager.',
      category: 'analytics',
      language: 'python',
      packageManager: 'pip',
      packageName: 'mcp-google-analytics',
      authType: 'oauth2',
      iconUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
      officialSupport: false,
      transport: 'stdio',
      oauthConfig: {
        scopes: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/tagmanager.edit.containers'
        ],
        provider: 'google'
      },
      exampleTools: [
        'ga4-get-realtime-data',
        'ga4-run-report',
        'gtm-create-tag',
        'gtm-publish-version'
      ]
    },
    
    // ==================== META / INSTAGRAM ====================
    {
      id: 'meta-instagram',
      name: 'meta-instagram',
      displayName: 'Meta & Instagram',
      description: 'Manage Facebook Pages, Instagram Business accounts, post content, and analyze insights.',
      category: 'communication',
      language: 'python',
      packageManager: 'pip',
      packageName: 'mcp-meta-instagram',
      authType: 'oauth2',
      iconUrl: 'https://static.xx.fbcdn.net/rsrc.php/v3/y7/r/OqOE2SYEFdQ.png',
      officialSupport: false,
      transport: 'stdio',
      oauthConfig: {
        scopes: [
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
          'pages_read_engagement'
        ],
        provider: 'meta'
      },
      exampleTools: [
        'facebook-create-post',
        'instagram-publish-photo',
        'instagram-get-insights',
        'facebook-list-pages'
      ]
    }
  ];
  
  /**
   * Get all available MCP server templates
   */
  static getAllTemplates(): MCPServerTemplate[] {
    return this.templates;
  }
  
  /**
   * Get template by ID
   */
  static getTemplate(id: string): MCPServerTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }
  
  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): MCPServerTemplate[] {
    return this.templates.filter(t => t.category === category);
  }
  
  /**
   * Get templates by language
   */
  static getTemplatesByLanguage(language: 'typescript' | 'python'): MCPServerTemplate[] {
    return this.templates.filter(t => t.language === language);
  }
  
  /**
   * Get templates by auth type
   */
  static getTemplatesByAuthType(authType: string): MCPServerTemplate[] {
    return this.templates.filter(t => t.authType === authType);
  }
  
  /**
   * Search templates by keyword
   */
  static searchTemplates(query: string): MCPServerTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t => 
      t.displayName.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.name.toLowerCase().includes(lowerQuery) ||
      t.exampleTools?.some(tool => tool.toLowerCase().includes(lowerQuery))
    );
  }
}
