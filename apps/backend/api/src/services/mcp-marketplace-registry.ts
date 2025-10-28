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
      securityNotes: 'Developed by verified developer Taylor Wilsdon. 696+ GitHub stars. Production-grade OAuth implementation.'
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
      securityNotes: 'Developed by Stape analytics team. Enterprise-grade, actively maintained. Praised by analytics professionals.'
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
