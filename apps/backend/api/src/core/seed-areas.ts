import { db } from "./db.js";
import { commercialAreas } from "../db/schema/index.js";

export async function seedCommercialAreas() {
  try {
    // Verifica se esistono già aree
    const existingAreas = await db.select().from(commercialAreas);
    
    if (existingAreas.length === 0) {
      // Inserisci le 4 aree commerciali
      const areas = [
        { code: 'AREA1', name: 'Area 1', description: 'Area commerciale 1 - Nord Italia' },
        { code: 'AREA2', name: 'Area 2', description: 'Area commerciale 2 - Centro Italia' },
        { code: 'AREA3', name: 'Area 3', description: 'Area commerciale 3 - Sud Italia' },
        { code: 'AREA4', name: 'Area 4', description: 'Area commerciale 4 - Isole' }
      ];
      
      await db.insert(commercialAreas).values(areas);
      console.log('Commercial areas seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding commercial areas:', error);
  }
}