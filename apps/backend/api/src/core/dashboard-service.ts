import { db } from './db';
import { sql } from 'drizzle-orm';
import { stores, tenants, legalEntities, users } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';

export class DashboardService {
  async getStats(tenantId?: string) {
    // Mock stats per ora, in produzione verrebbero calcolati dal database
    const kpiCards = [
      { title: "Vendite Oggi", value: "€12,500", change: "+15%", trend: "up" as const },
      { title: "Nuovi Clienti", value: "47", change: "+23%", trend: "up" as const },
      { title: "Ticket Medio", value: "€85", change: "+5%", trend: "up" as const },
      { title: "Conversione", value: "3.2%", change: "-2%", trend: "down" as const }
    ];

    const leadsByStatus = [
      { status: "Nuovo", count: 45, percentage: 30 },
      { status: "In Lavorazione", count: 38, percentage: 25 },
      { status: "Qualificato", count: 30, percentage: 20 },
      { status: "Convertito", count: 23, percentage: 15 },
      { status: "Perso", count: 15, percentage: 10 }
    ];

    const todayActivities = [
      { time: "10:00", type: "call" as const, description: "Chiamata con Mario Rossi" },
      { time: "11:30", type: "meeting" as const, description: "Demo prodotto - Azienda ABC" },
      { time: "14:00", type: "email" as const, description: "Follow-up offerta commerciale" },
      { time: "15:30", type: "visit" as const, description: "Visita in negozio - Cliente VIP" },
      { time: "17:00", type: "task" as const, description: "Preparazione contratto" }
    ];

    const notifications = [
      { type: "success" as const, message: "Nuovo contratto firmato: €2,500", time: "5 min fa" },
      { type: "warning" as const, message: "Scadenza offerta domani: Cliente XYZ", time: "1 ora fa" },
      { type: "info" as const, message: "Riunione team vendite alle 15:00", time: "2 ore fa" },
      { type: "error" as const, message: "Documento mancante per pratica #1234", time: "3 ore fa" }
    ];

    // Se abbiamo un tenantId, potremmo fare query più specifiche
    if (tenantId) {
      try {
        // Otteniamo il numero di stores attivi per questo tenant
        const storesResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(stores)
          .where(and(
            eq(stores.tenantId, tenantId),
            eq(stores.status, 'active')
          ));
        
        if (storesResult[0]) {
          kpiCards[1].value = storesResult[0].count.toString();
          kpiCards[1].title = "Punti Vendita Attivi";
        }

        // Otteniamo info sul tenant
        const tenantResult = await db
          .select({ name: tenants.name, status: tenants.status })
          .from(tenants)
          .where(eq(tenants.id, tenantId));

        if (tenantResult[0]) {
          notifications.unshift({
            type: "info" as const,
            message: `Connesso a: ${tenantResult[0].name}`,
            time: "ora"
          });
        }
      } catch (error) {
        console.error('Error fetching tenant-specific stats:', error);
      }
    }

    return {
      kpiCards,
      leadsByStatus,
      todayActivities,
      notifications
    };
  }

  async getMetrics(tenantId: string) {
    try {
      // Contiamo stores e legal entities per questo tenant
      const storesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(stores)
        .where(eq(stores.tenantId, tenantId));

      const legalEntitiesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(legalEntities)
        .where(eq(legalEntities.tenantId, tenantId));

      const usersCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      return {
        totalUsers: usersCount[0]?.count || 0,
        activeStores: storesCount[0]?.count || 0,
        legalEntities: legalEntitiesCount[0]?.count || 0,
        monthlyRevenue: Math.floor(Math.random() * 100000), // Mock per ora
        systemHealth: 'healthy'
      };
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return {
        totalUsers: 0,
        activeStores: 0,
        legalEntities: 0,
        monthlyRevenue: 0,
        systemHealth: 'error'
      };
    }
  }
}

export const dashboardService = new DashboardService();