import { create } from 'zustand';

// Types for shift planning state
export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label?: string;
  requiredStaff?: number;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  color: string;
  timeSlots: TimeSlot[];
  storeId: string | null;
  scope: 'global' | 'store';
}

export interface TemplateSelection {
  templateId: string;
  template: ShiftTemplate;
  selectedDays: string[]; // ISO date strings
}

export interface ResourceAssignment {
  resourceId: string;
  resourceName: string;
  templateId: string;
  slotId: string;
  day: string; // ISO date string
  startTime?: string;
  endTime?: string;
  storeId?: string;
  storeName?: string;
}

// Conflict detection types
export interface TimeInterval {
  startTime: string;
  endTime: string;
  templateId: string;
  slotId: string;
  storeId?: string;
  storeName?: string;
}

export interface ConflictInfo {
  resourceId: string;
  resourceName: string;
  day: string;
  newInterval: TimeInterval;
  existingInterval: TimeInterval;
  conflictType: 'overlap' | 'cross_store';
  message: string;
}

// Loaded planning from backend
export interface LoadedPlanning {
  exists: boolean;
  shifts: any[];
  assignments: any[];
  templates: any[];
}

export interface CoverageSlot {
  day: string;
  slotId: string; // Unique slot identifier for matching assignments
  startTime: string;
  endTime: string;
  templateId: string;
  templateName: string;
  templateColor: string;
  requiredStaff: number;
  assignedResources: ResourceAssignment[];
  // Phase 1: template coverage (slots planned)
  // Phase 2: resource coverage (staff assigned)
  templateCoverageStatus: 'planned' | 'not_planned'; // Template selected for this slot?
  resourceCoverageStatus: 'covered' | 'partial' | 'uncovered'; // Resources assigned?
  coverageStatus: 'covered' | 'partial' | 'uncovered'; // Combined status for display
}

export interface StoreOpeningHours {
  day: number; // 0-6 (Sunday-Saturday)
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface ShiftPlanningState {
  // Phase tracking
  currentPhase: 1 | 2; // 1 = Template selection, 2 = Resource assignment
  
  // Store & Period context
  selectedStoreId: string | null;
  selectedStoreName: string | null;
  periodStart: Date;
  periodEnd: Date;
  storeOpeningHours: StoreOpeningHours[];
  
  // Phase 1: Template selections
  templateSelections: TemplateSelection[];
  
  // Phase 2: Resource assignments
  resourceAssignments: ResourceAssignment[];
  
  // Computed coverage preview
  coveragePreview: CoverageSlot[];
  
  // Conflict detection
  conflicts: ConflictInfo[];
  hasConflicts: boolean;
  
  // Loaded planning state
  loadedPlanning: LoadedPlanning | null;
  isLoadingPlanning: boolean;
  planningExists: boolean;
  
  // Actions
  setStore: (storeId: string, storeName: string) => void;
  setPeriod: (start: Date, end: Date) => void;
  setStoreOpeningHours: (hours: StoreOpeningHours[]) => void;
  
  // Template selection actions
  addTemplateSelection: (template: ShiftTemplate) => void;
  removeTemplateSelection: (templateId: string) => void;
  toggleDayForTemplate: (templateId: string, day: string) => void;
  selectAllDaysForTemplate: (templateId: string, days: string[]) => void;
  clearAllDaysForTemplate: (templateId: string) => void;
  
  // Resource assignment actions - assignResource returns ConflictInfo if blocked, null if successful
  assignResource: (assignment: ResourceAssignment) => ConflictInfo | null;
  removeResourceAssignment: (resourceId: string, templateId: string, slotId: string, day: string) => void;
  
  // Conflict detection
  checkConflict: (resourceId: string, resourceName: string, day: string, startTime: string, endTime: string, templateId: string, slotId: string) => ConflictInfo | null;
  getResourceConflicts: (resourceId: string) => ConflictInfo[];
  clearConflicts: () => void;
  
  // Load existing planning
  loadExistingPlanning: (planning: LoadedPlanning) => void;
  setLoadingPlanning: (loading: boolean) => void;
  setPlanningExists: (exists: boolean) => void;
  
  // Phase navigation
  goToPhase: (phase: 1 | 2) => void;
  
  // Coverage computation
  computeCoverage: () => void;
  
  // Reset
  resetPlanning: () => void;
}

// Helper to generate days in period
const getDaysInPeriod = (start: Date, end: Date): string[] => {
  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
};

// Helper to check time overlap
const timeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return start1 < end2 && end1 > start2;
};

// Helper to parse time string to minutes
const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Helper to check if two time intervals overlap
const intervalsOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  return s1 < e2 && e1 > s2;
};

export const useShiftPlanningStore = create<ShiftPlanningState>((set, get) => ({
  // Initial state
  currentPhase: 1,
  selectedStoreId: null,
  selectedStoreName: null,
  periodStart: new Date(),
  periodEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 7 days default
  storeOpeningHours: [],
  templateSelections: [],
  resourceAssignments: [],
  coveragePreview: [],
  
  // Conflict detection state
  conflicts: [],
  hasConflicts: false,
  
  // Loaded planning state
  loadedPlanning: null,
  isLoadingPlanning: false,
  planningExists: false,
  
  // Store selection
  setStore: (storeId, storeName) => {
    set({ selectedStoreId: storeId, selectedStoreName: storeName });
    get().computeCoverage();
  },
  
  // Period selection
  setPeriod: (start, end) => {
    set({ periodStart: start, periodEnd: end });
    get().computeCoverage();
  },
  
  // Opening hours
  setStoreOpeningHours: (hours) => {
    set({ storeOpeningHours: hours });
    get().computeCoverage();
  },
  
  // Add template to selection
  addTemplateSelection: (template) => {
    const { templateSelections, periodStart, periodEnd } = get();
    
    // Check if already selected
    if (templateSelections.find(ts => ts.templateId === template.id)) {
      return;
    }
    
    // Default: select all days in period
    const allDays = getDaysInPeriod(periodStart, periodEnd);
    
    set({
      templateSelections: [
        ...templateSelections,
        { templateId: template.id, template, selectedDays: allDays }
      ]
    });
    
    get().computeCoverage();
  },
  
  // Remove template from selection
  removeTemplateSelection: (templateId) => {
    const { templateSelections, resourceAssignments } = get();
    
    set({
      templateSelections: templateSelections.filter(ts => ts.templateId !== templateId),
      // Also remove any resource assignments for this template
      resourceAssignments: resourceAssignments.filter(ra => ra.templateId !== templateId)
    });
    
    get().computeCoverage();
  },
  
  // Toggle specific day for template
  toggleDayForTemplate: (templateId, day) => {
    const { templateSelections } = get();
    
    set({
      templateSelections: templateSelections.map(ts => {
        if (ts.templateId !== templateId) return ts;
        
        const hasDay = ts.selectedDays.includes(day);
        return {
          ...ts,
          selectedDays: hasDay 
            ? ts.selectedDays.filter(d => d !== day)
            : [...ts.selectedDays, day]
        };
      })
    });
    
    get().computeCoverage();
  },
  
  // Select all days for template
  selectAllDaysForTemplate: (templateId, days) => {
    const { templateSelections } = get();
    
    set({
      templateSelections: templateSelections.map(ts => 
        ts.templateId === templateId 
          ? { ...ts, selectedDays: [...days] }
          : ts
      )
    });
    
    get().computeCoverage();
  },
  
  // Clear all days for template
  clearAllDaysForTemplate: (templateId) => {
    const { templateSelections, resourceAssignments } = get();
    
    set({
      templateSelections: templateSelections.map(ts => 
        ts.templateId === templateId 
          ? { ...ts, selectedDays: [] }
          : ts
      ),
      // Also remove resource assignments for this template
      resourceAssignments: resourceAssignments.filter(ra => ra.templateId !== templateId)
    });
    
    get().computeCoverage();
  },
  
  // Assign resource to slot - returns conflict if blocked, null if successful
  assignResource: (assignment) => {
    const { resourceAssignments, selectedStoreId, selectedStoreName, templateSelections, checkConflict } = get();
    
    // Check if already assigned
    const exists = resourceAssignments.find(
      ra => ra.resourceId === assignment.resourceId && 
            ra.templateId === assignment.templateId &&
            ra.slotId === assignment.slotId &&
            ra.day === assignment.day
    );
    
    if (!exists) {
      // Find the template to get time slot info
      const templateSelection = templateSelections.find(ts => ts.templateId === assignment.templateId);
      const timeSlot = templateSelection?.template.timeSlots.find(s => s.id === assignment.slotId);
      
      const startTime = assignment.startTime || timeSlot?.startTime || '00:00';
      const endTime = assignment.endTime || timeSlot?.endTime || '23:59';
      
      // Check for conflicts before assigning
      const conflict = checkConflict(
        assignment.resourceId,
        assignment.resourceName,
        assignment.day,
        startTime,
        endTime,
        assignment.templateId,
        assignment.slotId
      );
      
      if (conflict) {
        // Return the conflict immediately without mutating state
        // Caller is responsible for handling the conflict (e.g., showing toast)
        // This prevents stale conflict state from persisting
        return conflict;
      }
      
      const enrichedAssignment: ResourceAssignment = {
        ...assignment,
        startTime,
        endTime,
        storeId: assignment.storeId || selectedStoreId || undefined,
        storeName: assignment.storeName || selectedStoreName || undefined
      };
      
      // Add the assignment to the list
      set({ resourceAssignments: [...resourceAssignments, enrichedAssignment] });
      get().computeCoverage();
    }
    
    return null; // No conflict - success
  },
  
  // Remove resource assignment
  removeResourceAssignment: (resourceId, templateId, slotId, day) => {
    const { resourceAssignments } = get();
    
    set({
      resourceAssignments: resourceAssignments.filter(
        ra => !(ra.resourceId === resourceId && 
                ra.templateId === templateId && 
                ra.slotId === slotId && 
                ra.day === day)
      )
    });
    
    get().computeCoverage();
  },
  
  // Navigate phases
  goToPhase: (phase) => {
    set({ currentPhase: phase });
    // Recompute coverage when phase changes (coverage logic differs per phase)
    get().computeCoverage();
  },
  
  // Compute coverage preview
  // Phase 1: Shows template coverage (which slots are planned)
  // Phase 2: Shows resource coverage (which slots have assigned staff)
  computeCoverage: () => {
    const { templateSelections, resourceAssignments, currentPhase } = get();
    
    const coverageSlots: CoverageSlot[] = [];
    
    // For each template selection
    templateSelections.forEach(ts => {
      const { template, selectedDays } = ts;
      
      // For each selected day
      selectedDays.forEach(day => {
        // For each time slot in template
        (template.timeSlots || []).forEach((slot, slotIndex) => {
          const requiredStaff = slot.requiredStaff || 1;
          const slotId = slot.id || `slot-${slotIndex}`;
          
          // Find assignments for this slot (match by templateId, slotId, and day)
          const assignments = resourceAssignments.filter(
            ra => ra.templateId === template.id && 
                  ra.slotId === slotId && 
                  ra.day === day
          );
          
          // Template coverage: slot is planned if day is selected
          const templateCoverageStatus: 'planned' | 'not_planned' = 'planned';
          
          // Resource coverage: based on assigned staff vs required
          // This is ALWAYS calculated regardless of phase
          let resourceCoverageStatus: 'covered' | 'partial' | 'uncovered' = 'uncovered';
          if (assignments.length >= requiredStaff) {
            resourceCoverageStatus = 'covered';
          } else if (assignments.length > 0) {
            resourceCoverageStatus = 'partial';
          }
          
          // Combined coverage status depends on current phase
          // Phase 1: "covered" = slot is planned (template selected for this day)
          // Phase 2: "covered" = slot has enough resources assigned (uses resourceCoverageStatus)
          const coverageStatus: 'covered' | 'partial' | 'uncovered' = 
            currentPhase === 1 ? 'covered' : resourceCoverageStatus;
          
          coverageSlots.push({
            day,
            slotId, // Include slotId for matching
            startTime: slot.startTime,
            endTime: slot.endTime,
            templateId: template.id,
            templateName: template.name,
            templateColor: template.color,
            requiredStaff,
            assignedResources: assignments,
            templateCoverageStatus,
            resourceCoverageStatus,
            coverageStatus
          });
        });
      });
    });
    
    set({ coveragePreview: coverageSlots });
  },
  
  // Conflict detection: check if adding this assignment would create a conflict
  checkConflict: (resourceId, resourceName, day, startTime, endTime, templateId, slotId) => {
    const { resourceAssignments, selectedStoreId, selectedStoreName } = get();
    
    // Find all existing assignments for this resource on this day
    const existingForDay = resourceAssignments.filter(
      ra => ra.resourceId === resourceId && ra.day === day
    );
    
    for (const existing of existingForDay) {
      // Skip if same slot (would be a duplicate, not a conflict)
      if (existing.templateId === templateId && existing.slotId === slotId) {
        continue;
      }
      
      const existingStart = existing.startTime || '00:00';
      const existingEnd = existing.endTime || '23:59';
      
      if (intervalsOverlap(startTime, endTime, existingStart, existingEnd)) {
        const conflict: ConflictInfo = {
          resourceId,
          resourceName,
          day,
          newInterval: { startTime, endTime, templateId, slotId, storeId: selectedStoreId || undefined, storeName: selectedStoreName || undefined },
          existingInterval: { 
            startTime: existingStart, 
            endTime: existingEnd, 
            templateId: existing.templateId, 
            slotId: existing.slotId,
            storeId: existing.storeId,
            storeName: existing.storeName
          },
          conflictType: existing.storeId !== selectedStoreId ? 'cross_store' : 'overlap',
          message: existing.storeId !== selectedStoreId 
            ? `${resourceName} già assegnato a ${existing.storeName || 'altro negozio'} dalle ${existingStart} alle ${existingEnd}`
            : `${resourceName} già assegnato dalle ${existingStart} alle ${existingEnd}`
        };
        return conflict;
      }
    }
    
    return null;
  },
  
  // Get all conflicts for a specific resource
  getResourceConflicts: (resourceId) => {
    const { conflicts } = get();
    return conflicts.filter(c => c.resourceId === resourceId);
  },
  
  // Clear all conflicts
  clearConflicts: () => {
    set({ conflicts: [], hasConflicts: false });
  },
  
  // Load existing planning from backend
  loadExistingPlanning: (planning) => {
    if (!planning.exists) {
      set({ loadedPlanning: planning, planningExists: false });
      return;
    }
    
    const { selectedStoreId, selectedStoreName } = get();
    
    // Convert backend data to store format
    const assignments: ResourceAssignment[] = [];
    const templateMap = new Map<string, any>();
    
    // Build template map
    planning.templates.forEach(t => templateMap.set(t.id, t));
    
    // Build assignments from backend data
    planning.assignments.forEach(a => {
      const shift = planning.shifts.find(s => s.id === a.shiftId);
      if (!shift) return;
      
      // Extract time from shift
      const startTime = shift.startTime instanceof Date 
        ? `${shift.startTime.getHours().toString().padStart(2, '0')}:${shift.startTime.getMinutes().toString().padStart(2, '0')}`
        : typeof shift.startTime === 'string' && shift.startTime.includes('T')
          ? shift.startTime.split('T')[1].substring(0, 5)
          : shift.startTime;
          
      const endTime = shift.endTime instanceof Date
        ? `${shift.endTime.getHours().toString().padStart(2, '0')}:${shift.endTime.getMinutes().toString().padStart(2, '0')}`
        : typeof shift.endTime === 'string' && shift.endTime.includes('T')
          ? shift.endTime.split('T')[1].substring(0, 5)
          : shift.endTime;
      
      assignments.push({
        resourceId: a.userId,
        resourceName: a.userName || 'Unknown',
        templateId: shift.templateId || '',
        slotId: a.timeSlotId || 'slot-0',
        day: shift.date,
        startTime,
        endTime,
        storeId: selectedStoreId || undefined,
        storeName: selectedStoreName || undefined
      });
    });
    
    // Build template selections
    // CRITICAL FIX: For historical shifts, use versionedTimeSlots from shift instead of current template slots
    const templateSelections: TemplateSelection[] = [];
    const templateDaysMap = new Map<string, Set<string>>();
    
    // Track versioned time slots per template (prioritize versioned data)
    const templateVersionedSlotsMap = new Map<string, any[]>();
    
    planning.shifts.forEach(shift => {
      if (!shift.templateId) return;
      
      if (!templateDaysMap.has(shift.templateId)) {
        templateDaysMap.set(shift.templateId, new Set());
      }
      templateDaysMap.get(shift.templateId)!.add(shift.date);
      
      // VERSIONING FIX: Store versioned time slots if available
      // Historical shifts will have versionedTimeSlots from timeSlotsSnapshot
      if (shift.versionedTimeSlots && shift.usingVersionedData) {
        // Use versioned time slots for this template (from historical snapshot)
        templateVersionedSlotsMap.set(shift.templateId, shift.versionedTimeSlots);
        console.log(`[STORE] Using versioned time slots for template ${shift.templateId} from shift ${shift.id} (version ${shift.templateVersionNumber})`);
      }
    });
    
    templateDaysMap.forEach((days, templateId) => {
      const template = templateMap.get(templateId);
      if (template) {
        // VERSIONING FIX: Prefer versioned time slots (historical) over current template slots
        const versionedSlots = templateVersionedSlotsMap.get(templateId);
        const timeSlots = versionedSlots || template.timeSlots || [];
        
        if (versionedSlots) {
          console.log(`[STORE] Template ${templateId}: Using VERSIONED time slots (${versionedSlots.length} slots)`);
        } else {
          console.log(`[STORE] Template ${templateId}: Using CURRENT time slots (${template.timeSlots?.length || 0} slots)`);
        }
        
        templateSelections.push({
          templateId,
          template: {
            id: template.id,
            name: template.name,
            color: template.color || '#f97316',
            timeSlots: timeSlots,
            storeId: template.storeId,
            scope: template.scope || 'store'
          },
          selectedDays: Array.from(days)
        });
      }
    });
    
    set({
      loadedPlanning: planning,
      planningExists: true,
      resourceAssignments: assignments,
      templateSelections,
      currentPhase: 2 // Go to resource phase since planning exists
    });
    
    get().computeCoverage();
  },
  
  // Set loading state
  setLoadingPlanning: (loading) => {
    set({ isLoadingPlanning: loading });
  },
  
  // Set planning exists flag
  setPlanningExists: (exists) => {
    set({ planningExists: exists });
  },
  
  // Reset everything
  resetPlanning: () => {
    set({
      currentPhase: 1,
      selectedStoreId: null,
      selectedStoreName: null,
      templateSelections: [],
      resourceAssignments: [],
      coveragePreview: [],
      conflicts: [],
      hasConflicts: false,
      loadedPlanning: null,
      planningExists: false,
      isLoadingPlanning: false
    });
  }
}));
