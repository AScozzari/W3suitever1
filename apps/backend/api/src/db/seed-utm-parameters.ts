import { sql } from "drizzle-orm";
import { db } from "../core/db";
import { utmSources, utmMediums } from "./schema/public";

/**
 * Seed UTM Parameters - Standard marketing attribution sources and mediums
 */
export async function seedUtmParameters() {
  console.log("🎯 Seeding UTM parameters...");

  // ==================== CREATE TABLES IF NOT EXISTS (IDEMPOTENT) ====================
  console.log("🔧 Ensuring utm_sources and utm_mediums tables exist...");
  
  // Enable UUID generation
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  
  // Create utm_sources table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public.utm_sources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(50) UNIQUE NOT NULL,
      name varchar(100) NOT NULL,
      display_name varchar(100) NOT NULL,
      category varchar(50) NOT NULL,
      icon_url text,
      is_active boolean DEFAULT true,
      sort_order smallint DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
  `);

  // Create utm_mediums table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public.utm_mediums (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(50) UNIQUE NOT NULL,
      name varchar(100) NOT NULL,
      display_name varchar(100) NOT NULL,
      description text,
      applicable_sources jsonb,
      is_active boolean DEFAULT true,
      sort_order smallint DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
  `);

  // Create indexes if they don't exist
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_utm_sources_category ON public.utm_sources(category);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_utm_sources_active ON public.utm_sources(is_active);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_utm_mediums_active ON public.utm_mediums(is_active);`);
  
  console.log("✅ UTM tables ready!");

  // ==================== UTM SOURCES DATA ====================
  const utmSourcesData = [
    // ==================== SOCIAL MEDIA ====================
    {
      code: "facebook",
      name: "facebook",
      displayName: "Facebook",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 10,
    },
    {
      code: "instagram",
      name: "instagram",
      displayName: "Instagram",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 20,
    },
    {
      code: "linkedin",
      name: "linkedin",
      displayName: "LinkedIn",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 30,
    },
    {
      code: "tiktok",
      name: "tiktok",
      displayName: "TikTok",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 40,
    },
    {
      code: "twitter",
      name: "twitter",
      displayName: "Twitter (X)",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 50,
    },
    {
      code: "youtube",
      name: "youtube",
      displayName: "YouTube",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 60,
    },
    {
      code: "whatsapp_business",
      name: "whatsapp_business",
      displayName: "WhatsApp Business",
      category: "social",
      iconUrl: null,
      isActive: true,
      sortOrder: 70,
    },

    // ==================== SEARCH ENGINES ====================
    {
      code: "google",
      name: "google",
      displayName: "Google",
      category: "search",
      iconUrl: null,
      isActive: true,
      sortOrder: 100,
    },
    {
      code: "bing",
      name: "bing",
      displayName: "Bing",
      category: "search",
      iconUrl: null,
      isActive: true,
      sortOrder: 110,
    },

    // ==================== EMAIL & MESSAGING ====================
    {
      code: "email",
      name: "email",
      displayName: "Email Marketing",
      category: "email",
      iconUrl: null,
      isActive: true,
      sortOrder: 200,
    },
    {
      code: "newsletter",
      name: "newsletter",
      displayName: "Newsletter",
      category: "email",
      iconUrl: null,
      isActive: true,
      sortOrder: 210,
    },

    // ==================== REFERRAL & PARTNER ====================
    {
      code: "partner",
      name: "partner",
      displayName: "Partner",
      category: "partner",
      iconUrl: null,
      isActive: true,
      sortOrder: 300,
    },
    {
      code: "affiliate",
      name: "affiliate",
      displayName: "Affiliate",
      category: "partner",
      iconUrl: null,
      isActive: true,
      sortOrder: 310,
    },

    // ==================== DIRECT & OTHER ====================
    {
      code: "direct",
      name: "direct",
      displayName: "Direct Traffic",
      category: "direct",
      iconUrl: null,
      isActive: true,
      sortOrder: 400,
    },
    {
      code: "qr",
      name: "qr",
      displayName: "QR Code",
      category: "direct",
      iconUrl: null,
      isActive: true,
      sortOrder: 410,
    },
  ];

  // ==================== UTM MEDIUMS DATA ====================
  const utmMediumsData = [
    // ==================== SOCIAL MEDIUMS ====================
    {
      code: "social_organic",
      name: "social_organic",
      displayName: "Organic Social",
      description: "Post organici sui social media",
      applicableSources: ["facebook", "instagram", "linkedin", "tiktok", "twitter", "youtube"],
      isActive: true,
      sortOrder: 10,
    },
    {
      code: "social_paid",
      name: "social_paid",
      displayName: "Paid Social",
      description: "Ads a pagamento sui social media",
      applicableSources: ["facebook", "instagram", "linkedin", "tiktok", "twitter", "youtube"],
      isActive: true,
      sortOrder: 20,
    },
    {
      code: "story",
      name: "story",
      displayName: "Story Ad",
      description: "Instagram/Facebook Stories",
      applicableSources: ["facebook", "instagram"],
      isActive: true,
      sortOrder: 30,
    },
    {
      code: "reel",
      name: "reel",
      displayName: "Reel",
      description: "Instagram Reels",
      applicableSources: ["instagram"],
      isActive: true,
      sortOrder: 40,
    },
    {
      code: "feed",
      name: "feed",
      displayName: "Feed Post",
      description: "Post nel feed principale",
      applicableSources: ["facebook", "instagram", "linkedin", "twitter"],
      isActive: true,
      sortOrder: 50,
    },
    {
      code: "carousel",
      name: "carousel",
      displayName: "Carousel Ad",
      description: "Annunci carosello",
      applicableSources: ["facebook", "instagram", "linkedin"],
      isActive: true,
      sortOrder: 60,
    },
    {
      code: "video",
      name: "video",
      displayName: "Video Ad",
      description: "Annunci video",
      applicableSources: ["facebook", "instagram", "youtube", "tiktok", "linkedin"],
      isActive: true,
      sortOrder: 70,
    },
    {
      code: "influencer",
      name: "influencer",
      displayName: "Influencer Marketing",
      description: "Contenuti sponsorizzati da influencer",
      applicableSources: ["instagram", "tiktok", "youtube"],
      isActive: true,
      sortOrder: 80,
    },
    {
      code: "dm",
      name: "dm",
      displayName: "Direct Message",
      description: "Messaggi diretti/WhatsApp Business",
      applicableSources: ["whatsapp_business", "instagram", "facebook"],
      isActive: true,
      sortOrder: 90,
    },

    // ==================== SEARCH MEDIUMS ====================
    {
      code: "cpc",
      name: "cpc",
      displayName: "CPC (Cost Per Click)",
      description: "Ads a pagamento su motori di ricerca",
      applicableSources: ["google", "bing"],
      isActive: true,
      sortOrder: 100,
    },
    {
      code: "organic",
      name: "organic",
      displayName: "Organic Search",
      description: "Traffico organico da motori di ricerca",
      applicableSources: ["google", "bing"],
      isActive: true,
      sortOrder: 110,
    },

    // ==================== EMAIL MEDIUMS ====================
    {
      code: "email",
      name: "email",
      displayName: "Email Campaign",
      description: "Campagne email marketing",
      applicableSources: ["email", "newsletter"],
      isActive: true,
      sortOrder: 200,
    },
    {
      code: "drip",
      name: "drip",
      displayName: "Drip Campaign",
      description: "Campagne email automatizzate",
      applicableSources: ["email"],
      isActive: true,
      sortOrder: 210,
    },

    // ==================== REFERRAL MEDIUMS ====================
    {
      code: "referral",
      name: "referral",
      displayName: "Referral",
      description: "Traffico da siti referenti",
      applicableSources: ["partner", "affiliate"],
      isActive: true,
      sortOrder: 300,
    },

    // ==================== OTHER MEDIUMS ====================
    {
      code: "qr_code",
      name: "qr_code",
      displayName: "QR Code",
      description: "Scansione QR code",
      applicableSources: ["qr"],
      isActive: true,
      sortOrder: 400,
    },
    {
      code: "none",
      name: "none",
      displayName: "Direct / None",
      description: "Traffico diretto senza medium specifico",
      applicableSources: ["direct"],
      isActive: true,
      sortOrder: 500,
    },
  ];

  // ==================== INSERT DATA ====================
  console.log("💾 Inserting UTM sources...");
  
  for (const source of utmSourcesData) {
    await db.execute(sql`
      INSERT INTO public.utm_sources (code, name, display_name, category, icon_url, is_active, sort_order)
      VALUES (${source.code}, ${source.name}, ${source.displayName}, ${source.category}, ${source.iconUrl}, ${source.isActive}, ${source.sortOrder})
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        category = EXCLUDED.category,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order;
    `);
  }

  console.log(`✅ Inserted ${utmSourcesData.length} UTM sources`);

  console.log("💾 Inserting UTM mediums...");
  
  for (const medium of utmMediumsData) {
    await db.execute(sql`
      INSERT INTO public.utm_mediums (code, name, display_name, description, applicable_sources, is_active, sort_order)
      VALUES (
        ${medium.code}, 
        ${medium.name}, 
        ${medium.displayName}, 
        ${medium.description}, 
        ${JSON.stringify(medium.applicableSources)}, 
        ${medium.isActive}, 
        ${medium.sortOrder}
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        applicable_sources = EXCLUDED.applicable_sources,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order;
    `);
  }

  console.log(`✅ Inserted ${utmMediumsData.length} UTM mediums`);
  console.log("🎯 UTM parameters seeding completed!");
}

// Run if executed directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedUtmParameters()
    .then(() => {
      console.log("✅ UTM parameters seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ UTM parameters seed failed:", error);
      process.exit(1);
    });
}
