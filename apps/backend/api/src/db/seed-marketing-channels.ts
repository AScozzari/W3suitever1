import { eq } from "drizzle-orm";
import { db } from "../core/db";
import { marketingChannels, marketingChannelUtmMappings } from "./schema/public";

/**
 * Seed Marketing Channels - 20 canali completi
 * 
 * DIGITAL (10) → generatesUtm = true (auto-generate UTM links)
 * TRADITIONAL (6) → generatesUtm = false (tracking only)
 * DIRECT (4) → generatesUtm = false (tracking only)
 */
export async function seedMarketingChannels() {
  console.log("🎯 Seeding Marketing Channels...");

  // ==================== DIGITAL CHANNELS (with UTM generation) ====================
  const digitalChannels = [
    { code: 'seo_organic', name: 'SEO Organico', category: 'digital', generatesUtm: true, sortOrder: 10, utmSource: 'google', utmMedium: 'organic' },
    { code: 'google_ads', name: 'Google Ads / SEM', category: 'digital', generatesUtm: true, sortOrder: 20, utmSource: 'google', utmMedium: 'cpc' },
    { code: 'social_organic', name: 'Social Media Organico', category: 'digital', generatesUtm: true, sortOrder: 30, utmSource: 'social', utmMedium: 'organic' },
    { code: 'facebook_ads', name: 'Social Media Advertising (Facebook)', category: 'digital', generatesUtm: true, sortOrder: 40, utmSource: 'facebook', utmMedium: 'cpc' },
    { code: 'instagram_ads', name: 'Social Media Advertising (Instagram)', category: 'digital', generatesUtm: true, sortOrder: 50, utmSource: 'instagram', utmMedium: 'social' },
    { code: 'email_marketing', name: 'Email Marketing', category: 'digital', generatesUtm: true, sortOrder: 60, utmSource: 'newsletter', utmMedium: 'email' },
    { code: 'affiliate', name: 'Programmi Affiliazione', category: 'digital', generatesUtm: true, sortOrder: 70, utmSource: 'affiliate', utmMedium: 'referral' },
    { code: 'display_ads', name: 'Display Advertising', category: 'digital', generatesUtm: true, sortOrder: 80, utmSource: 'display', utmMedium: 'banner' },
    { code: 'youtube', name: 'Video Marketing (YouTube)', category: 'digital', generatesUtm: true, sortOrder: 90, utmSource: 'youtube', utmMedium: 'video' },
    { code: 'content_marketing', name: 'Content Marketing / Blog', category: 'digital', generatesUtm: true, sortOrder: 100, utmSource: 'blog', utmMedium: 'content' },
    { code: 'influencer', name: 'Influencer Marketing', category: 'digital', generatesUtm: true, sortOrder: 110, utmSource: 'influencer', utmMedium: 'social' },
  ];

  // ==================== TRADITIONAL CHANNELS (tracking only, no UTM) ====================
  const traditionalChannels = [
    { code: 'tv', name: 'Televisione', category: 'traditional', generatesUtm: false, sortOrder: 200 },
    { code: 'radio', name: 'Radio', category: 'traditional', generatesUtm: false, sortOrder: 210 },
    { code: 'print', name: 'Stampa (giornali/riviste)', category: 'traditional', generatesUtm: false, sortOrder: 220 },
    { code: 'outdoor', name: 'Outdoor (cartelloni/affissioni)', category: 'traditional', generatesUtm: false, sortOrder: 230 },
    { code: 'direct_mail', name: 'Direct Mail / Posta', category: 'traditional', generatesUtm: false, sortOrder: 240 },
    { code: 'events', name: 'Eventi e Fiere', category: 'traditional', generatesUtm: false, sortOrder: 250 },
  ];

  // ==================== DIRECT CHANNELS (tracking only, no UTM) ====================
  const directChannels = [
    { code: 'referral', name: 'Passaparola / Referral', category: 'direct', generatesUtm: false, sortOrder: 300 },
    { code: 'partnership', name: 'Partnership', category: 'direct', generatesUtm: false, sortOrder: 310 },
    { code: 'store_direct', name: 'Punto Vendita Diretto', category: 'direct', generatesUtm: false, sortOrder: 320 },
    { code: 'telemarketing', name: 'Telemarketing', category: 'direct', generatesUtm: false, sortOrder: 330 },
  ];

  // ==================== INSERT CHANNELS ====================
  const allChannels = [...digitalChannels, ...traditionalChannels, ...directChannels];

  for (const channel of allChannels) {
    const { utmSource, utmMedium, ...channelData } = channel as any;

    // Insert or update channel
    await db.insert(marketingChannels)
      .values({
        code: channelData.code,
        name: channelData.name,
        category: channelData.category,
        generatesUtm: channelData.generatesUtm,
        active: true,
        sortOrder: channelData.sortOrder,
      })
      .onConflictDoUpdate({
        target: marketingChannels.code,
        set: {
          name: channelData.name,
          category: channelData.category,
          generatesUtm: channelData.generatesUtm,
          active: true,
          sortOrder: channelData.sortOrder,
        },
      });

    console.log(`  ✓ ${channelData.name} (${channelData.category}${channelData.generatesUtm ? ' + UTM' : ' - tracking only'})`);

    // Insert UTM mappings only for digital channels
    if (utmSource && utmMedium) {
      const [insertedChannel] = await db
        .select()
        .from(marketingChannels)
        .where(eq(marketingChannels.code, channelData.code))
        .limit(1);

      if (insertedChannel) {
        await db.insert(marketingChannelUtmMappings)
          .values({
            marketingChannelId: insertedChannel.id,
            suggestedUtmSource: utmSource,
            suggestedUtmMedium: utmMedium,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log(`✅ Seeded ${allChannels.length} marketing channels (${digitalChannels.length} digital, ${traditionalChannels.length} traditional, ${directChannels.length} direct)`);
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMarketingChannels()
    .then(() => {
      console.log("✅ Marketing channels seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Marketing channels seeding failed:", error);
      process.exit(1);
    });
}
