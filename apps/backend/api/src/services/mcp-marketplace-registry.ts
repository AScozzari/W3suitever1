/**
 * 🏪 MCP MARKETPLACE REGISTRY (CURATED OFFICIAL LIST)
 * 
 * This is the HIGH-TRUST curated list of MCP servers.
 * Sources:
 * - Official @modelcontextprotocol/server-* packages (verified on npm)
 * - Platform-maintained servers (GitHub, Microsoft, AWS)
 * 
 * This list is supplemented by MCP Registry API for community servers.
 */

export interface MCPServerTemplate {
  id: string;
  name: string; // e.g., 'filesystem'
  displayName: string;
  description: string;
  category: 'productivity' | 'communication' | 'storage' | 'database' | 'development' | 'analytics' | 'other';
  language: 'typescript' | 'python' | 'go' | 'rust';
  packageManager: 'npm' | 'pip' | 'docker' | 'none';
  packageName: string; // e.g., '@modelcontextprotocol/server-filesystem'
  version?: string;
  authType: 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'none';
  iconUrl?: string;
  officialSupport: boolean; // true for official @modelcontextprotocol packages
  verified: boolean; // true if verified by namespace/DNS
  transport: 'stdio' | 'http-sse';
  repoUrl?: string; // GitHub repository URL
  
  // Installation hints
  installHints?: {
    envVars?: string[]; // Required environment variables
    dependencies?: string[]; // Additional dependencies
    postInstallNotes?: string; // Special instructions after install
  };
  
  // OAuth configuration (if applicable)
  oauthConfig?: {
    scopes: string[];
    provider: 'google' | 'microsoft' | 'meta' | 'aws' | 'stripe' | 'github' | 'slack';
  };
  
  // Tools preview (will be discovered after installation)
  exampleTools?: string[]; // e.g., ['list-files', 'read-file', 'write-file']
  
  // Trust metadata
  trustLevel: 'official' | 'verified' | 'community';
  securityNotes?: string; // Warnings or special security considerations
  
  // Verified Developer & Rating (for curated community servers)
  rating?: number; // 0-5 rating (e.g., 4.5)
  developer?: string; // GitHub username or organization (e.g., 'taylorwilsdon', 'stape-io')
  sourceType?: string; // Package source (e.g., 'npm', 'pip', 'docker', 'remote')
}

export class MCPMarketplaceRegistry {
  /**
   * CURATED OFFICIAL LIST (High Trust)
   * 
   * These are hand-picked, verified servers from:
   * 1. Official Anthropic @modelcontextprotocol packages
   * 2. Platform-maintained servers (GitHub official, AWS Labs, etc.)
   * 
   * Updated: 2025-10-28
   */
  private static curatedServers: MCPServerTemplate[] = [
    // ==================== OFFICIAL ANTHROPIC SERVERS ====================
    {
      id: 'filesystem',
      name: 'filesystem',
      displayName: 'Filesystem',
      description: 'Secure file system operations with configurable access controls. Read, write, search, and manage files and directories.',
      category: 'storage',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-filesystem',
      version: 'latest',
      authType: 'none',
      iconUrl: 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/icon.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
      installHints: {
        envVars: [],
        postInstallNotes: 'Specify allowed directories as arguments: npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/dir'
      },
      exampleTools: [
        'read_file',
        'read_multiple_files',
        'write_file',
        'create_directory',
        'list_directory',
        'move_file',
        'search_files',
        'get_file_info'
      ],
      trustLevel: 'official'
    },
    {
      id: 'memory',
      name: 'memory',
      displayName: 'Memory (Knowledge Graph)',
      description: 'Persistent memory system using knowledge graphs. Store and retrieve information, create entities and relationships for context retention.',
      category: 'productivity',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-memory',
      version: 'latest',
      authType: 'none',
      iconUrl: 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/memory/icon.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
      installHints: {
        envVars: [],
        postInstallNotes: 'Memory persists across sessions. Great for long-running AI assistants.'
      },
      exampleTools: [
        'create_entities',
        'create_relations',
        'add_observations',
        'delete_entities',
        'delete_observations',
        'delete_relations',
        'read_graph',
        'search_nodes',
        'open_nodes'
      ],
      trustLevel: 'official'
    },
    {
      id: 'sequential-thinking',
      name: 'sequential-thinking',
      displayName: 'Sequential Thinking',
      description: 'Enable dynamic and reflective problem-solving through a thought sequence that Claude can continuously update and refine.',
      category: 'productivity',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-sequential-thinking',
      version: 'latest',
      authType: 'none',
      iconUrl: 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/sequentialthinking/icon.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
      installHints: {
        envVars: [],
        postInstallNotes: 'Enables step-by-step reasoning and problem decomposition.'
      },
      exampleTools: [
        'append_thought',
        'revise_thought',
        'insert_thought',
        'delete_thought'
      ],
      trustLevel: 'official'
    },
    {
      id: 'everything',
      name: 'everything',
      displayName: 'Everything (Test Server)',
      description: 'Comprehensive reference implementation showcasing all MCP features: prompts, resources, and tools. Use for testing and learning.',
      category: 'development',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-everything',
      version: 'latest',
      authType: 'none',
      iconUrl: 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/everything/icon.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
      installHints: {
        envVars: [],
        postInstallNotes: 'Demonstration server showing all MCP capabilities. Not for production use.'
      },
      exampleTools: [
        'add',
        'longRunningOperation',
        'sampleLLM',
        'getTinyImage'
      ],
      trustLevel: 'official',
      securityNotes: 'Test server only. Do not use in production environments.'
    },
    {
      id: 'github',
      name: 'github',
      displayName: 'GitHub (Official)',
      description: 'Interact with GitHub repositories, issues, pull requests, and file operations. Official GitHub-maintained MCP server.',
      category: 'development',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-github',
      version: 'latest',
      authType: 'bearer_token',
      iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      installHints: {
        envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
        postInstallNotes: 'Generate token at https://github.com/settings/tokens with repo, read:org, and workflow scopes.'
      },
      oauthConfig: {
        scopes: ['repo', 'read:org', 'workflow'],
        provider: 'github'
      },
      exampleTools: [
        'create_or_update_file',
        'search_repositories',
        'create_repository',
        'get_file_contents',
        'push_files',
        'create_issue',
        'create_pull_request',
        'fork_repository',
        'create_branch'
      ],
      trustLevel: 'official'
    },

    // ==================== PLATFORM-MAINTAINED SERVERS ====================
    {
      id: 'postgres',
      name: 'postgres',
      displayName: 'PostgreSQL',
      description: 'Query and manage PostgreSQL databases with read-only access. Execute SQL, list tables, and analyze schemas safely.',
      category: 'database',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@modelcontextprotocol/server-postgres',
      version: 'latest',
      authType: 'basic_auth',
      iconUrl: 'https://www.postgresql.org/media/img/about/press/elephant.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
      installHints: {
        envVars: ['POSTGRES_CONNECTION_STRING'],
        postInstallNotes: 'Format: postgresql://user:password@host:port/database. Read-only mode recommended for safety.'
      },
      exampleTools: [
        'read-query',
        'write-query',
        'list-tables',
        'describe-table',
        'append-insight'
      ],
      trustLevel: 'official',
      securityNotes: 'Use read-only database credentials. Write operations available but should be restricted in production.'
    },

    // ==================== VERIFIED COMMUNITY DEVELOPERS ====================
    {
      id: 'workspace-mcp',
      name: 'workspace-mcp',
      displayName: 'Google Workspace MCP',
      description: 'Comprehensive Google Workspace integration: Gmail, Calendar, Drive, Docs, Sheets, Slides, Forms, Tasks, Chat, and Search. Production-ready OAuth 2.1 with multi-user support.',
      category: 'productivity',
      language: 'python',
      packageManager: 'pip',
      packageName: 'workspace-mcp',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://www.gstatic.com/images/branding/product/2x/workspace_64dp.png',
      officialSupport: false,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/taylorwilsdon/google_workspace_mcp',
      installHints: {
        envVars: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
        postInstallNotes: 'Install: uvx workspace-mcp OR pip install workspace-mcp. Supports Docker deployment and Claude Desktop 1-click setup.',
        dependencies: ['Python 3.10+']
      },
      oauthConfig: {
        scopes: ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'slides'],
        provider: 'google'
      },
      exampleTools: [
        'gmail_send',
        'gmail_search',
        'calendar_create_event',
        'drive_upload',
        'docs_create',
        'sheets_read',
        'slides_generate'
      ],
      trustLevel: 'verified',
      securityNotes: 'Developed by verified developer Taylor Wilsdon. 696+ GitHub stars. Production-grade OAuth implementation.',
      rating: 4.5,
      developer: 'taylorwilsdon',
      sourceType: 'PyPI'
    },
    {
      id: 'google-tag-manager-mcp',
      name: 'google-tag-manager-mcp',
      displayName: 'Google Tag Manager MCP',
      description: 'Enterprise GTM automation by Stape. Full API coverage: accounts, containers, workspaces, tags, triggers, variables, version control. Deploy analytics without touching GTM interface.',
      category: 'analytics',
      language: 'typescript',
      packageManager: 'none',
      packageName: 'mcp-remote',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_tag_manager.svg',
      officialSupport: false,
      verified: true,
      transport: 'http-sse',
      repoUrl: 'https://github.com/stape-io/google-tag-manager-mcp-server',
      installHints: {
        envVars: [],
        postInstallNotes: 'Remote server hosted by Stape. Use: npx -y mcp-remote https://gtm-mcp.stape.ai/mcp',
        dependencies: ['Node.js 16+']
      },
      oauthConfig: {
        scopes: ['tagmanager.edit.containers', 'tagmanager.publish'],
        provider: 'google'
      },
      exampleTools: [
        'create_tag',
        'update_trigger',
        'list_variables',
        'deploy_container',
        'manage_workspaces',
        'version_control'
      ],
      trustLevel: 'verified',
      securityNotes: 'Developed by Stape analytics team. Enterprise-grade, actively maintained. Praised by analytics professionals.',
      rating: 5.0,
      developer: 'stape-io',
      sourceType: 'Remote'
    },
    {
      id: 'meta-ads-mcp',
      name: 'meta-ads-mcp',
      displayName: 'Meta Ads MCP (Facebook & Instagram)',
      description: 'AI-powered Facebook and Instagram ads management by Pipeboard. Full campaign lifecycle: create, optimize, analyze performance. Works with all Meta platforms (FB, IG, Messenger). Budget optimization and real-time insights.',
      category: 'analytics',
      language: 'python',
      packageManager: 'pip',
      packageName: 'meta-ads-mcp',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/50px-2023_Facebook_icon.svg.png',
      officialSupport: false,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/pipeboard-co/meta-ads-mcp',
      installHints: {
        envVars: ['PIPEBOARD_API_TOKEN'],
        postInstallNotes: 'Install: uvx meta-ads-mcp OR pip install meta-ads-mcp. Supports remote MCP mode: https://mcp.pipeboard.co/meta-ads-mcp',
        dependencies: ['Python 3.10+']
      },
      oauthConfig: {
        scopes: ['ads_management', 'ads_read', 'pages_read_engagement'],
        provider: 'meta'
      },
      exampleTools: [
        'mcp_meta_ads_get_ad_accounts',
        'mcp_meta_ads_get_campaigns',
        'mcp_meta_ads_create_campaign',
        'mcp_meta_ads_get_adsets',
        'mcp_meta_ads_search',
        'mcp_meta_ads_get_insights',
        'mcp_meta_ads_optimize_budget'
      ],
      trustLevel: 'verified',
      securityNotes: 'Developed by Pipeboard (nictuku). 311+ GitHub stars, 40.3K+ downloads. Production-ready, actively maintained.',
      rating: 4.8,
      developer: 'nictuku',
      sourceType: 'PyPI'
    },
    {
      id: 'instagram-mcp',
      name: 'ig-mcp',
      displayName: 'Instagram MCP Server',
      description: 'Production-ready Instagram Business integration. Read profiles, posts, insights. Publish images/videos. DM capabilities (requires Meta Advanced Access). Rate limiting compliant (200 calls/hour).',
      category: 'communication',
      language: 'python',
      packageManager: 'pip',
      packageName: 'ig-mcp',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/50px-Instagram_logo_2016.svg.png',
      officialSupport: false,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/jlbadano/ig-mcp',
      installHints: {
        envVars: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
        postInstallNotes: 'Install: pip install ig-mcp. Requires Instagram Business account and Facebook App credentials.',
        dependencies: ['Python 3.8+']
      },
      oauthConfig: {
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'],
        provider: 'meta'
      },
      exampleTools: [
        'get_profile_info',
        'get_media_posts',
        'get_media_insights',
        'publish_media',
        'get_engagement_metrics',
        'list_facebook_pages',
        'read_direct_messages',
        'send_direct_message'
      ],
      trustLevel: 'verified',
      securityNotes: 'Production-ready by jlbadano. Community favorite for Instagram automation. Supports DM with Meta Advanced Access.',
      rating: 4.7,
      developer: 'jlbadano',
      sourceType: 'PyPI'
    },
    {
      id: 'facebook-pages-manager',
      name: 'facebook-mcp-server',
      displayName: 'Facebook Pages Manager',
      description: 'Comprehensive Facebook Pages management via Graph API. Create, read, manage posts. Moderate comments automatically. Fetch insights (reach, engagement). Filter negative feedback. Perfect for social media managers.',
      category: 'communication',
      language: 'python',
      packageManager: 'pip',
      packageName: 'facebook-mcp-server',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/50px-2023_Facebook_icon.svg.png',
      officialSupport: false,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/hagaihen/facebook-mcp-server',
      installHints: {
        envVars: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
        postInstallNotes: 'Install: pip install facebook-mcp-server. Requires Facebook Page access token with manage_pages scope.',
        dependencies: ['Python 3.8+']
      },
      oauthConfig: {
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_manage_metadata'],
        provider: 'meta'
      },
      exampleTools: [
        'create_facebook_post',
        'read_posts',
        'moderate_comments',
        'fetch_post_insights',
        'filter_negative_feedback',
        'get_page_analytics',
        'schedule_posts'
      ],
      trustLevel: 'verified',
      securityNotes: 'Developed by Hagai Hen. 55 GitHub stars, 7.8K downloads. Released May 2025. Actively maintained.',
      rating: 4.5,
      developer: 'hagaihen',
      sourceType: 'PyPI'
    },
    {
      id: 'ms-365-mcp',
      name: 'ms-365-mcp-server',
      displayName: 'Microsoft 365 MCP Server',
      description: 'Complete Microsoft 365 suite integration. Teams, SharePoint (with --org-mode), Outlook email, Calendar, OneDrive, Excel, OneNote, To Do, Planner, Contacts. Full Graph API coverage with 42.6K+ downloads.',
      category: 'productivity',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@softeria/ms-365-mcp-server',
      version: 'latest',
      authType: 'oauth2',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/50px-Microsoft_logo.svg.png',
      officialSupport: false,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/softeria/ms-365-mcp-server',
      installHints: {
        envVars: [],
        postInstallNotes: 'Install: npx -y @softeria/ms-365-mcp-server --org-mode. Device code flow authentication. Tokens cached in OS credential store.',
        dependencies: ['Node.js 16+']
      },
      oauthConfig: {
        scopes: ['Mail.ReadWrite', 'Calendars.ReadWrite', 'Files.ReadWrite.All', 'Sites.ReadWrite.All', 'Team.ReadBasic.All', 'Tasks.ReadWrite'],
        provider: 'microsoft'
      },
      exampleTools: [
        'outlook_send_email',
        'outlook_list_emails',
        'calendar_create_event',
        'onedrive_upload_file',
        'onedrive_download_file',
        'excel_create_worksheet',
        'onenote_create_page',
        'teams_send_message',
        'sharepoint_list_sites',
        'todo_create_task',
        'planner_manage_tasks',
        'contacts_search'
      ],
      trustLevel: 'verified',
      securityNotes: 'Developed by Softeria. 314 GitHub stars, 42.6K npm downloads. Published October 2025. Production-ready, enterprise-grade.',
      rating: 4.9,
      developer: 'softeria',
      sourceType: 'npm'
    },
    {
      id: 'aws-api-mcp',
      name: 'aws-api-mcp',
      displayName: 'AWS API MCP Server (Official)',
      description: 'Official AWS Labs server providing comprehensive AWS API access. Discover and call any AWS service through natural language. IAM-based security, command validation, resource management. Create, inspect, modify AWS resources.',
      category: 'development',
      language: 'typescript',
      packageManager: 'npm',
      packageName: '@aws-labs/aws-api-mcp',
      version: 'latest',
      authType: 'api_key',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/50px-Amazon_Web_Services_Logo.svg.png',
      officialSupport: true,
      verified: true,
      transport: 'stdio',
      repoUrl: 'https://github.com/awslabs/mcp',
      installHints: {
        envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
        postInstallNotes: 'Install from awslabs/mcp repository. Requires valid AWS IAM credentials with appropriate permissions.',
        dependencies: ['Node.js 18+', 'AWS CLI configured']
      },
      exampleTools: [
        'discover_aws_apis',
        'execute_aws_command',
        'create_aws_resource',
        'inspect_aws_resource',
        'modify_aws_resource',
        'list_aws_services',
        'validate_aws_permissions'
      ],
      trustLevel: 'official',
      securityNotes: 'Official AWS Labs implementation. Developer preview (July 2025). IAM-based access control. Recommended by AWS as primary entry point.',
      sourceType: 'npm'
    },
    {
      id: 'aws-knowledge-mcp',
      name: 'aws-knowledge-mcp',
      displayName: 'AWS Knowledge MCP Server (Official)',
      description: 'Fully-managed AWS-hosted server providing instant access to AWS documentation, API references, What\'s New posts, Getting Started guides, Builder Library, blog posts, and Well-Architected guidance. No setup required.',
      category: 'development',
      language: 'typescript',
      packageManager: 'none',
      packageName: 'aws-knowledge-remote',
      version: 'latest',
      authType: 'none',
      iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/50px-Amazon_Web_Services_Logo.svg.png',
      officialSupport: true,
      verified: true,
      transport: 'http-sse',
      repoUrl: 'https://awslabs.github.io/mcp/',
      installHints: {
        envVars: [],
        postInstallNotes: 'Remote AWS-hosted server. No installation required. Access via MCP client configuration. Generally available since October 2025.',
        dependencies: []
      },
      exampleTools: [
        'search_aws_docs',
        'get_api_reference',
        'get_whats_new',
        'get_getting_started',
        'get_builder_library',
        'get_well_architected_guidance',
        'check_regional_availability'
      ],
      trustLevel: 'official',
      securityNotes: 'Official AWS managed service. Generally available (October 2025). No local setup required. Anchors AI responses in trusted AWS context.',
      sourceType: 'Remote'
    }
  ];

  /**
   * VERIFIED DEVELOPERS REGISTRY
   * 
   * Developers whose MCP servers receive special "Verified Developer" badge
   */
  private static verifiedDevelopers = {
    'taylorwilsdon': {
      name: 'Taylor Wilsdon',
      github: 'https://github.com/taylorwilsdon',
      specialty: 'Google Workspace, Enterprise MCP',
      rating: 4.5,
      servers: ['workspace-mcp']
    },
    'stape-io': {
      name: 'Stape Team',
      github: 'https://github.com/stape-io',
      specialty: 'Analytics, GTM, Marketing Tech',
      rating: 5.0,
      servers: ['google-tag-manager-mcp']
    },
    'nictuku': {
      name: 'Pipeboard (nictuku)',
      github: 'https://github.com/pipeboard-co',
      specialty: 'Meta Ads, Facebook, Instagram Marketing',
      rating: 4.8,
      servers: ['meta-ads-mcp']
    },
    'jlbadano': {
      name: 'jlbadano',
      github: 'https://github.com/jlbadano',
      specialty: 'Instagram Business Automation, Social Media',
      rating: 4.7,
      servers: ['instagram-mcp']
    },
    'hagaihen': {
      name: 'Hagai Hen',
      github: 'https://github.com/hagaihen',
      specialty: 'Facebook Pages Management, Social Media Analytics',
      rating: 4.5,
      servers: ['facebook-pages-manager']
    },
    'softeria': {
      name: 'Softeria',
      github: 'https://github.com/softeria',
      specialty: 'Microsoft 365, Enterprise Integration',
      rating: 4.9,
      servers: ['ms-365-mcp']
    }
  };

  /**
   * Get all curated servers (high-trust)
   */
  static getCuratedServers(): MCPServerTemplate[] {
    return this.curatedServers;
  }
  
  /**
   * Get template by ID from curated list
   */
  static getCuratedTemplate(id: string): MCPServerTemplate | undefined {
    return this.curatedServers.find(t => t.id === id);
  }
  
  /**
   * Get templates by category (curated only)
   */
  static getTemplatesByCategory(category: string): MCPServerTemplate[] {
    return this.curatedServers.filter(t => t.category === category);
  }
  
  /**
   * Get templates by trust level
   */
  static getTemplatesByTrustLevel(trustLevel: 'official' | 'verified' | 'community'): MCPServerTemplate[] {
    return this.curatedServers.filter(t => t.trustLevel === trustLevel);
  }
  
  /**
   * Search templates by keyword (curated only)
   */
  static searchCuratedTemplates(query: string): MCPServerTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.curatedServers.filter(t => 
      t.displayName.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.name.toLowerCase().includes(lowerQuery) ||
      t.exampleTools?.some(tool => tool.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all curated server IDs (for validation)
   */
  static getCuratedServerIds(): string[] {
    return this.curatedServers.map(s => s.id);
  }

  /**
   * Validate if a package name is from curated list
   */
  static isCuratedPackage(packageName: string): boolean {
    return this.curatedServers.some(s => s.packageName === packageName);
  }

  /**
   * Get verified developers registry
   */
  static getVerifiedDevelopers() {
    return this.verifiedDevelopers;
  }

  /**
   * Check if developer is verified
   */
  static isVerifiedDeveloper(developerId: string): boolean {
    return developerId in this.verifiedDevelopers;
  }

  /**
   * Get developer info by ID
   */
  static getDeveloperInfo(developerId: string) {
    return this.verifiedDevelopers[developerId as keyof typeof this.verifiedDevelopers];
  }
}
