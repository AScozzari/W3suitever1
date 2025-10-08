import { db } from '../core/db';
import { tenants } from './schema/w3suite';
import { mcpServers } from './schema/w3suite';
import { eq } from 'drizzle-orm';

/**
 * MCP Server Templates - Official and Community Servers
 * Based on official MCP repository and AWS Labs
 */
const MCP_SERVER_TEMPLATES = [
  {
    name: 'google-workspace',
    displayName: 'Google Workspace (Full Suite)',
    description: '10 servizi Google in 1: Gmail, Calendar, Drive, Docs, Sheets, Slides, Forms, Tasks, Chat, Search. OAuth 2.1 multi-user, FastMCP. Server: taylorwilsdon/google_workspace_mcp',
    transport: 'http-sse' as const,
    category: 'productivity' as const,
    iconUrl: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
    config: {
      repository: 'taylorwilsdon/google_workspace_mcp',
      version: 'latest',
      installCommand: 'uvx workspace-mcp --tool-tier core',
      requiresAuth: true,
      authType: 'oauth2',
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/presentations'
      ],
      toolTiers: ['core', 'extended', 'full'],
      defaultToolTier: 'core'
    }
  },
  {
    name: 'aws-s3-tables',
    displayName: 'AWS S3 Tables (Official)',
    description: 'AWS Labs official MCP server per S3 Tables. Table management, SQL queries, metadata discovery, policy viewing. Python-based con AWS SDK.',
    transport: 'http-sse' as const,
    category: 'storage' as const,
    iconUrl: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
    config: {
      repository: 'awslabs/mcp',
      package: 'awslabs.s3-tables-mcp-server',
      version: 'latest',
      installCommand: 'uvx awslabs.s3-tables-mcp-server@latest',
      requiresAuth: true,
      authType: 'aws_iam',
      requiredCredentials: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
      supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      features: {
        readOnlyMode: true,
        sqlQueries: true,
        tableManagement: true,
        metadataDiscovery: true
      }
    }
  },
  {
    name: 'slack',
    displayName: 'Slack (Official Anthropic)',
    description: 'Official Anthropic MCP server per Slack. Invia messaggi, leggi canali, gestisci workspace. Pre-built da repository ufficiale.',
    transport: 'http-sse' as const,
    category: 'communication' as const,
    iconUrl: 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png',
    config: {
      repository: 'modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-slack',
      installCommand: 'npx -y @modelcontextprotocol/server-slack',
      requiresAuth: true,
      authType: 'oauth2',
      requiredScopes: ['chat:write', 'channels:read', 'channels:history']
    }
  },
  {
    name: 'github',
    displayName: 'GitHub (Official Anthropic)',
    description: 'Official Anthropic MCP server per GitHub. Repository management, issues, pull requests, file operations. REST API + GraphQL.',
    transport: 'http-sse' as const,
    category: 'other' as const,
    iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    config: {
      repository: 'modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-github',
      installCommand: 'npx -y @modelcontextprotocol/server-github',
      requiresAuth: true,
      authType: 'token',
      requiredCredentials: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
      requiredScopes: ['repo', 'read:org', 'read:user']
    }
  },
  {
    name: 'stripe',
    displayName: 'Stripe (Community)',
    description: 'Community MCP server per Stripe API. Payments, subscriptions, customers, invoices. TypeScript-based con Stripe SDK.',
    transport: 'http-sse' as const,
    category: 'other' as const,
    iconUrl: 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg',
    config: {
      repository: 'stripe/stripe-mcp-server',
      installCommand: 'npx stripe-mcp-server',
      requiresAuth: true,
      authType: 'api_key',
      requiredCredentials: ['STRIPE_SECRET_KEY'],
      webhookSupport: true,
      testMode: true
    }
  },
  {
    name: 'postgres',
    displayName: 'PostgreSQL (Official Anthropic)',
    description: 'Official Anthropic MCP server per PostgreSQL. Query execution, schema inspection, database management. Direct connection.',
    transport: 'stdio' as const,
    category: 'database' as const,
    iconUrl: 'https://www.postgresql.org/media/img/about/press/elephant.png',
    config: {
      repository: 'modelcontextprotocol/servers',
      package: '@modelcontextprotocol/server-postgres',
      installCommand: 'npx -y @modelcontextprotocol/server-postgres',
      requiresAuth: true,
      authType: 'connection_string',
      requiredCredentials: ['POSTGRES_CONNECTION_URL'],
      supportedOperations: ['read', 'write', 'schema_introspection']
    }
  }
];

/**
 * Seed MCP Servers for all tenants
 * Popola server MCP predefiniti per ogni tenant
 */
export async function seedMCPServers() {
  console.log('🔌 Starting MCP servers seeding...\n');

  try {
    // Get all active tenants
    const allTenants = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.archivedAt, null as any));

    if (allTenants.length === 0) {
      console.log('⚠️  No tenants found. Skipping MCP server seeding.');
      return;
    }

    console.log(`📋 Found ${allTenants.length} active tenant(s)\n`);

    let totalCreated = 0;

    for (const tenant of allTenants) {
      console.log(`🏢 Seeding MCP servers for tenant: ${tenant.name} (${tenant.id})`);

      // Check existing servers for this tenant
      const existingServers = await db
        .select({ name: mcpServers.name })
        .from(mcpServers)
        .where(eq(mcpServers.tenantId, tenant.id));

      const existingServerNames = new Set(existingServers.map(s => s.name));

      // Insert only new servers
      const serversToCreate = MCP_SERVER_TEMPLATES.filter(
        template => !existingServerNames.has(template.name)
      );

      if (serversToCreate.length === 0) {
        console.log(`   ✓ All MCP servers already exist for tenant ${tenant.name}`);
        continue;
      }

      const serversData = serversToCreate.map(template => ({
        tenantId: tenant.id,
        name: template.name,
        displayName: template.displayName,
        description: template.description,
        transport: template.transport,
        category: template.category,
        iconUrl: template.iconUrl,
        config: template.config,
        status: 'configuring' as const, // Requires credential setup
        errorCount: 0
      }));

      await db.insert(mcpServers).values(serversData);

      console.log(`   ✅ Created ${serversToCreate.length} MCP server(s):`);
      serversToCreate.forEach(s => {
        console.log(`      - ${s.displayName} (${s.name})`);
      });

      totalCreated += serversToCreate.length;
    }

    console.log(`\n✅ MCP servers seeding completed!`);
    console.log(`   📊 Total servers created: ${totalCreated}`);
    console.log(`\n📚 Available MCP Servers:`);
    MCP_SERVER_TEMPLATES.forEach(template => {
      console.log(`   • ${template.displayName}`);
      console.log(`     Category: ${template.category} | Transport: ${template.transport}`);
      console.log(`     ${template.description.substring(0, 80)}...`);
      console.log('');
    });

    console.log('🔍 Next steps:');
    console.log('   1. Configure credentials for each server in System Settings');
    console.log('   2. Test connection to verify setup');
    console.log('   3. Use servers in workflow MCP Connector or AI MCP nodes\n');

  } catch (error) {
    console.error('❌ Error seeding MCP servers:', error);
    throw error;
  }
}

// Auto-run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMCPServers()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
