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
}

export interface CoverageSlot {
  day: string;
  startTime: string;
  endTime: string;
  templateId: string;
  templateName: string;
  templateColor: string;
  requiredStaff: number;
  assignedResources: ResourceAssignment[];
  coverageStatus: 'covered' | 'partial' | 'uncovered';
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
  
  // Resource assignment actions
  assignResource: (assignment: ResourceAssignment) => void;
  removeResourceAssignment: (resourceId: string, templateId: string, slotId: string, day: string) => void;
  
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
  
  // Assign resource to slot
  assignResource: (assignment) => {
    const { resourceAssignments } = get();
    
    // Check if already assigned
    const exists = resourceAssignments.find(
      ra => ra.resourceId === assignment.resourceId && 
            ra.templateId === assignment.templateId &&
            ra.slotId === assignment.slotId &&
            ra.day === assignment.day
    );
    
    if (!exists) {
      set({ resourceAssignments: [...resourceAssignments, assignment] });
      get().computeCoverage();
    }
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
  },
  
  // Compute coverage preview
  computeCoverage: () => {
    const { templateSelections, resourceAssignments, storeOpeningHours } = get();
    
    const coverageSlots: CoverageSlot[] = [];
    
    // For each template selection
    templateSelections.forEach(ts => {
      const { template, selectedDays } = ts;
      
      // For each selected day
      selectedDays.forEach(day => {
        // For each time slot in template
        (template.timeSlots || []).forEach(slot => {
          const requiredStaff = slot.requiredStaff || 1;
          
          // Find assignments for this slot
          const assignments = resourceAssignments.filter(
            ra => ra.templateId === template.id && 
                  ra.slotId === slot.id && 
                  ra.day === day
          );
          
          // Determine coverage status
          let coverageStatus: 'covered' | 'partial' | 'uncovered' = 'uncovered';
          if (assignments.length >= requiredStaff) {
            coverageStatus = 'covered';
          } else if (assignments.length > 0) {
            coverageStatus = 'partial';
          }
          
          coverageSlots.push({
            day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            templateId: template.id,
            templateName: template.name,
            templateColor: template.color,
            requiredStaff,
            assignedResources: assignments,
            coverageStatus
          });
        });
      });
    });
    
    set({ coveragePreview: coverageSlots });
  },
  
  // Reset everything
  resetPlanning: () => {
    set({
      currentPhase: 1,
      selectedStoreId: null,
      selectedStoreName: null,
      templateSelections: [],
      resourceAssignments: [],
      coveragePreview: []
    });
  }
}));
