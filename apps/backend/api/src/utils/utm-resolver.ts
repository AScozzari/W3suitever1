import { db } from '../core/db.js';
import { utmSources, utmMediums } from '../db/schema/public.js';
import { eq } from 'drizzle-orm';

export interface ResolvedUTMIds {
  utmSourceId: string | null;
  utmMediumId: string | null;
}

export async function resolveUTMIds(
  utmSource?: string | null,
  utmMedium?: string | null
): Promise<ResolvedUTMIds> {
  const result: ResolvedUTMIds = {
    utmSourceId: null,
    utmMediumId: null
  };

  if (utmSource) {
    const normalizedSource = utmSource.toLowerCase().trim();
    
    let sourceRecord = await db.query.utmSources.findFirst({
      where: eq(utmSources.code, normalizedSource)
    });

    if (!sourceRecord) {
      const [newSource] = await db.insert(utmSources).values({
        code: normalizedSource,
        name: normalizedSource,
        displayName: normalizedSource.charAt(0).toUpperCase() + normalizedSource.slice(1),
        category: getCategoryFromSource(normalizedSource),
        isActive: true,
        sortOrder: 999
      }).returning();
      
      sourceRecord = newSource;
    }

    result.utmSourceId = sourceRecord.id;
  }

  if (utmMedium) {
    const normalizedMedium = utmMedium.toLowerCase().trim();
    
    let mediumRecord = await db.query.utmMediums.findFirst({
      where: eq(utmMediums.code, normalizedMedium)
    });

    if (!mediumRecord) {
      const [newMedium] = await db.insert(utmMediums).values({
        code: normalizedMedium,
        name: normalizedMedium,
        displayName: normalizedMedium.charAt(0).toUpperCase() + normalizedMedium.slice(1),
        description: `Auto-created from UTM parameter: ${normalizedMedium}`,
        isActive: true,
        sortOrder: 999
      }).returning();
      
      mediumRecord = newMedium;
    }

    result.utmMediumId = mediumRecord.id;
  }

  return result;
}

function getCategoryFromSource(source: string): string {
  const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'youtube', 'pinterest'];
  const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu'];
  const emailPlatforms = ['newsletter', 'email', 'mailchimp', 'sendgrid'];
  
  const lowerSource = source.toLowerCase();
  
  if (socialPlatforms.some(p => lowerSource.includes(p))) return 'social';
  if (searchEngines.some(p => lowerSource.includes(p))) return 'search';
  if (emailPlatforms.some(p => lowerSource.includes(p))) return 'email';
  if (lowerSource.includes('direct')) return 'direct';
  if (lowerSource.includes('partner')) return 'partner';
  
  return 'referral';
}

export async function getUTMSourceByCode(code: string) {
  return db.query.utmSources.findFirst({
    where: eq(utmSources.code, code.toLowerCase().trim())
  });
}

export async function getUTMMediumByCode(code: string) {
  return db.query.utmMediums.findFirst({
    where: eq(utmMediums.code, code.toLowerCase().trim())
  });
}
