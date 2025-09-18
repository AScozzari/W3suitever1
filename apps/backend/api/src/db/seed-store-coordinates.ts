// Seeder to populate store coordinates
import { db } from "../core/db";
import { stores } from "./schema/w3suite";
import { eq } from "drizzle-orm";

// Real coordinates for Italian cities
const storeCoordinates = [
  {
    citta: "Milano",
    latitude: "45.4642",
    longitude: "9.1900",
    wifiNetworks: ["W3-Milano-Store", "W3-Milano-Guest", "W3-Milano-Staff"]
  },
  {
    citta: "Roma",
    latitude: "41.9028",
    longitude: "12.4964",
    wifiNetworks: ["W3-Roma-Store", "W3-Roma-Guest", "W3-Roma-Staff"]
  },
  {
    citta: "Napoli",
    latitude: "40.8518",
    longitude: "14.2681",
    wifiNetworks: ["W3-Napoli-Store", "W3-Napoli-Guest", "W3-Napoli-Staff"]
  },
  {
    citta: "Torino",
    latitude: "45.0703",
    longitude: "7.6869",
    wifiNetworks: ["W3-Torino-Store", "W3-Torino-Guest", "W3-Torino-Staff"]
  },
  {
    citta: "Firenze",
    latitude: "43.7696",
    longitude: "11.2558",
    wifiNetworks: ["W3-Firenze-Store", "W3-Firenze-Guest", "W3-Firenze-Staff"]
  }
];

export async function seedStoreCoordinates() {
  console.log("🗺️ Seeding store coordinates...");
  
  try {
    // Get all stores
    const allStores = await db.select().from(stores);
    
    for (const store of allStores) {
      // Find matching coordinates by city
      const coords = storeCoordinates.find(c => 
        store.citta?.toLowerCase().includes(c.citta.toLowerCase())
      );
      
      if (coords) {
        await db.update(stores)
          .set({
            latitude: coords.latitude,
            longitude: coords.longitude,
            wifiNetworks: coords.wifiNetworks,
            updatedAt: new Date()
          })
          .where(eq(stores.id, store.id));
        
        console.log(`✅ Updated coordinates for store: ${store.nome} in ${store.citta}`);
      } else {
        // Default coordinates (Milano) for stores without match
        await db.update(stores)
          .set({
            latitude: "45.4642",
            longitude: "9.1900",
            wifiNetworks: ["W3-Default-Store", "W3-Default-Guest"],
            updatedAt: new Date()
          })
          .where(eq(stores.id, store.id));
        
        console.log(`📍 Set default coordinates for store: ${store.nome}`);
      }
    }
    
    console.log("✅ Store coordinates seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding store coordinates:", error);
    throw error;
  }
}

// Run seeder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedStoreCoordinates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}