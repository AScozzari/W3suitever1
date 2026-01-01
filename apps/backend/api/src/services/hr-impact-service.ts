import { db } from '../core/db';
import { 
  shifts, 
  shiftAssignments, 
  universalRequests,
  hrRequestImpacts,
  resourceAvailability,
  users,
  stores,
  timeTracking
} from '../db/schema/w3suite';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { logger } from '../core/logger';

export interface ShiftImpact {
  shiftId: string;
  shiftName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  storeId: string;
  storeName: string;
  assignmentId: string;
  hoursImpacted: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImpactAnalysisResult {
  hasImpact: boolean;
  totalShiftsImpacted: number;
  totalHoursImpacted: number;
  impacts: ShiftImpact[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  warnings: string[];
}

export interface StoreDerivationResult {
  storeId: string | null;
  storeName: string | null;
  source: 'timbratura' | 'turno' | 'user' | 'none';
}

export class HrImpactService {
  
  static async deriveStoreForRequest(
    tenantId: string,
    userId: string,
    requestDate: Date
  ): Promise<StoreDerivationResult> {
    try {
      const dateStr = requestDate.toISOString().split('T')[0];
      
      const timbraturaStore = await db
        .select({
          storeId: timeTracking.storeId,
          storeName: stores.nome
        })
        .from(timeTracking)
        .leftJoin(stores, eq(stores.id, timeTracking.storeId))
        .where(and(
          eq(timeTracking.userId, userId),
          sql`DATE(${timeTracking.clockIn}) = ${dateStr}`
        ))
        .limit(1);

      if (timbraturaStore.length > 0 && timbraturaStore[0].storeId) {
        return {
          storeId: timbraturaStore[0].storeId,
          storeName: timbraturaStore[0].storeName,
          source: 'timbratura'
        };
      }

      const turnoStore = await db
        .select({
          storeId: shifts.storeId,
          storeName: stores.nome
        })
        .from(shifts)
        .innerJoin(shiftAssignments, sql`${shiftAssignments.shiftId}::uuid = ${shifts.id}`)
        .leftJoin(stores, eq(stores.id, shifts.storeId))
        .where(and(
          eq(shiftAssignments.userId, userId),
          eq(shifts.date, dateStr)
        ))
        .limit(1);

      if (turnoStore.length > 0 && turnoStore[0].storeId) {
        return {
          storeId: turnoStore[0].storeId,
          storeName: turnoStore[0].storeName,
          source: 'turno'
        };
      }

      const userStore = await db
        .select({
          storeId: users.storeId,
          storeName: stores.nome
        })
        .from(users)
        .leftJoin(stores, eq(stores.id, users.storeId))
        .where(eq(users.id, userId))
        .limit(1);

      if (userStore.length > 0 && userStore[0].storeId) {
        return {
          storeId: userStore[0].storeId,
          storeName: userStore[0].storeName,
          source: 'user'
        };
      }

      return { storeId: null, storeName: null, source: 'none' };
    } catch (error) {
      logger.error('Error deriving store for request', { error, tenantId, userId });
      return { storeId: null, storeName: null, source: 'none' };
    }
  }

  static async analyzeImpacts(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ImpactAnalysisResult> {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const impactedShifts = await db
        .select({
          shiftId: shifts.id,
          shiftName: shifts.name,
          shiftDate: shifts.date,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          storeId: shifts.storeId,
          storeName: stores.nome,
          assignmentId: shiftAssignments.id,
          status: shiftAssignments.status
        })
        .from(shifts)
        .innerJoin(shiftAssignments, sql`${shiftAssignments.shiftId}::uuid = ${shifts.id}`)
        .leftJoin(stores, eq(stores.id, shifts.storeId))
        .where(and(
          eq(shifts.tenantId, tenantId),
          eq(shiftAssignments.userId, userId),
          gte(shifts.date, startDateStr),
          lte(shifts.date, endDateStr),
          sql`${shiftAssignments.status} NOT IN ('cancelled', 'override')`
        ));

      if (impactedShifts.length === 0) {
        return {
          hasImpact: false,
          totalShiftsImpacted: 0,
          totalHoursImpacted: 0,
          impacts: [],
          severity: 'none',
          summary: 'Nessun turno impattato nel periodo selezionato',
          warnings: []
        };
      }

      const impacts: ShiftImpact[] = impactedShifts.map(shift => {
        const start = new Date(shift.startTime as Date);
        const end = new Date(shift.endTime as Date);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        return {
          shiftId: shift.shiftId,
          shiftName: shift.shiftName,
          shiftDate: shift.shiftDate,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          storeId: shift.storeId,
          storeName: shift.storeName || 'N/A',
          assignmentId: shift.assignmentId,
          hoursImpacted: Math.round(hours * 10) / 10,
          severity: hours > 8 ? 'critical' : hours > 6 ? 'high' : hours > 4 ? 'medium' : 'low'
        };
      });

      const totalHours = impacts.reduce((sum, i) => sum + i.hoursImpacted, 0);
      const totalShifts = impacts.length;

      let severity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalShifts >= 5 || totalHours >= 40) severity = 'critical';
      else if (totalShifts >= 3 || totalHours >= 24) severity = 'high';
      else if (totalShifts >= 2 || totalHours >= 16) severity = 'medium';

      const warnings: string[] = [];
      if (totalShifts >= 3) {
        warnings.push(`Attenzione: ${totalShifts} turni verranno impattati`);
      }
      if (totalHours >= 24) {
        warnings.push(`Attenzione: ${totalHours} ore di copertura da gestire`);
      }

      const uniqueStores = [...new Set(impacts.map(i => i.storeName))];
      if (uniqueStores.length > 1) {
        warnings.push(`Impatto su ${uniqueStores.length} negozi: ${uniqueStores.join(', ')}`);
      }

      return {
        hasImpact: true,
        totalShiftsImpacted: totalShifts,
        totalHoursImpacted: Math.round(totalHours * 10) / 10,
        impacts,
        severity,
        summary: `${totalShifts} turni impattati per un totale di ${totalHours.toFixed(1)} ore`,
        warnings
      };
    } catch (error) {
      logger.error('Error analyzing HR request impacts', { error, tenantId, userId });
      throw error;
    }
  }

  static async saveImpactAnalysis(
    tenantId: string,
    requestId: string,
    analysis: ImpactAnalysisResult,
    analyzedBy: string
  ): Promise<void> {
    try {
      await db.insert(hrRequestImpacts).values({
        tenantId,
        requestId,
        affectedShiftIds: analysis.impacts.map(i => i.shiftId),
        affectedAssignmentIds: analysis.impacts.map(i => i.assignmentId),
        coverageGaps: analysis.impacts.map(i => ({
          storeId: i.storeId,
          storeName: i.storeName,
          date: i.shiftDate,
          startTime: i.startTime,
          endTime: i.endTime,
          hoursUncovered: i.hoursImpacted
        })),
        impactSeverity: analysis.severity,
        impactSummary: analysis.summary,
        calculatedAt: new Date(),
        calculatedBy: analyzedBy
      });

      logger.info('HR impact analysis saved', { requestId, totalImpacts: analysis.totalShiftsImpacted });
    } catch (error) {
      logger.error('Error saving HR impact analysis', { error, requestId });
      throw error;
    }
  }

  static async createResourceAvailability(
    tenantId: string,
    requestId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    category: string,
    title: string,
    approvedBy: string
  ): Promise<void> {
    try {
      let availabilityStatus: string;
      switch (category) {
        case 'vacation':
          availabilityStatus = 'vacation';
          break;
        case 'sick':
          availabilityStatus = 'sick_leave';
          break;
        case 'maternity_leave':
        case 'matrimonio':
        case 'legge_104':
          availabilityStatus = 'personal_leave';
          break;
        case 'smart_working':
          availabilityStatus = 'restricted';
          break;
        default:
          availabilityStatus = 'unavailable';
      }

      await db.insert(resourceAvailability).values({
        tenantId,
        userId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        availabilityStatus,
        reasonType: 'approved_leave',
        reasonDescription: title,
        leaveRequestId: requestId,
        isFullDay: true,
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
        blocksShiftAssignment: category !== 'smart_working',
        showInSchedule: true,
        createdBy: userId
      });

      logger.info('Resource availability created', { requestId, userId, status: availabilityStatus });
    } catch (error) {
      logger.error('Error creating resource availability', { error, requestId });
      throw error;
    }
  }
}
