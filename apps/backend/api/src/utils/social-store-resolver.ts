import { db } from '../db';
import { mcpConnectedAccounts } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';

export interface SocialAccountResolution {
  mcpAccountId: string;
  tenantId: string;
  storeId: string | null;
  accountType: string;
  accountName: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'google' | 'twitter' | 'tiktok';

export async function resolveAccountFromSocial(
  platform: SocialPlatform,
  platformAccountId: string
): Promise<SocialAccountResolution | null> {
  const account = await db.query.mcpConnectedAccounts.findFirst({
    where: and(
      eq(mcpConnectedAccounts.platformAccountId, platformAccountId),
      eq(mcpConnectedAccounts.isActive, true)
    )
  });

  if (!account) {
    return null;
  }

  let storeId: string | null = null;
  
  if (account.accountMetadata && typeof account.accountMetadata === 'object') {
    const metadata = account.accountMetadata as any;
    storeId = metadata.storeId || null;
  }

  return {
    mcpAccountId: account.id,
    tenantId: account.tenantId,
    storeId,
    accountType: account.accountType,
    accountName: account.accountName
  };
}

export async function getDefaultStoreForTenant(tenantId: string): Promise<string | null> {
  const store = await db.query.stores.findFirst({
    where: eq(db.query.stores.tenantId, tenantId),
    orderBy: (stores, { asc }) => [asc(stores.createdAt)]
  });

  return store?.id || null;
}

export async function resolveSocialToStore(
  platform: SocialPlatform,
  platformAccountId: string,
  fallbackToDefault: boolean = true
): Promise<{ tenantId: string; storeId: string | null; mcpAccountId: string } | null> {
  const accountResolution = await resolveAccountFromSocial(platform, platformAccountId);
  
  if (!accountResolution) {
    return null;
  }

  let finalStoreId = accountResolution.storeId;

  if (!finalStoreId && fallbackToDefault) {
    finalStoreId = await getDefaultStoreForTenant(accountResolution.tenantId);
  }

  return {
    tenantId: accountResolution.tenantId,
    storeId: finalStoreId,
    mcpAccountId: accountResolution.mcpAccountId
  };
}
