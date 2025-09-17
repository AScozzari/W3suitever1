import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

// Calendar permission scopes
export enum CalendarScope {
  OWN = 'own',
  TEAM = 'team',
  STORE = 'store',
  AREA = 'area',
  TENANT = 'tenant'
}

// Event visibility types
export enum EventVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
  STORE = 'store',
  AREA = 'area',
  TENANT = 'tenant'
}

// Calendar permissions interface
export interface CalendarPermissions {
  canViewScopes: CalendarScope[];
  canCreateScopes: CalendarScope[];
  canUpdateScopes: CalendarScope[];
  canDeleteScopes: CalendarScope[];
  canApproveLeave: boolean;
  canManageShifts: boolean;
  canViewHrSensitive: boolean;
  canManageTimeTracking: boolean;
  canOverrideApprovals: boolean;
}

// Role-based permission definitions
const ROLE_PERMISSIONS: Record<string, CalendarPermissions> = {
  USER: {
    canViewScopes: [CalendarScope.OWN],
    canCreateScopes: [CalendarScope.OWN],
    canUpdateScopes: [CalendarScope.OWN],
    canDeleteScopes: [CalendarScope.OWN],
    canApproveLeave: false,
    canManageShifts: false,
    canViewHrSensitive: false,
    canManageTimeTracking: false,
    canOverrideApprovals: false
  },
  SALES: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canCreateScopes: [CalendarScope.OWN],
    canUpdateScopes: [CalendarScope.OWN],
    canDeleteScopes: [CalendarScope.OWN],
    canApproveLeave: false,
    canManageShifts: false,
    canViewHrSensitive: false,
    canManageTimeTracking: false,
    canOverrideApprovals: false
  },
  TEAM_LEADER: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canApproveLeave: true,
    canManageShifts: false,
    canViewHrSensitive: false,
    canManageTimeTracking: false,
    canOverrideApprovals: false
  },
  STORE_MANAGER: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canApproveLeave: true,
    canManageShifts: true,
    canViewHrSensitive: false,
    canManageTimeTracking: true,
    canOverrideApprovals: false
  },
  AREA_MANAGER: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA],
    canApproveLeave: true,
    canManageShifts: true,
    canViewHrSensitive: true,
    canManageTimeTracking: true,
    canOverrideApprovals: false
  },
  HR_MANAGER: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canApproveLeave: true,
    canManageShifts: true,
    canViewHrSensitive: true,
    canManageTimeTracking: true,
    canOverrideApprovals: true
  },
  OPERATIONS: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM],
    canApproveLeave: true,
    canManageShifts: true,
    canViewHrSensitive: false,
    canManageTimeTracking: true,
    canOverrideApprovals: false
  },
  ADMIN: {
    canViewScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canCreateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canUpdateScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canDeleteScopes: [CalendarScope.OWN, CalendarScope.TEAM, CalendarScope.STORE, CalendarScope.AREA, CalendarScope.TENANT],
    canApproveLeave: true,
    canManageShifts: true,
    canViewHrSensitive: true,
    canManageTimeTracking: true,
    canOverrideApprovals: true
  }
};

// Helper functions for permission checks
export const canUserViewEvent = (
  event: any,
  userId: string,
  permissions: CalendarPermissions
): boolean => {
  // User can always see their own events
  if (event.ownerId === userId) return true;
  
  // Check if user has permission for the event's visibility scope
  const eventVisibility = event.visibility as EventVisibility;
  
  switch (eventVisibility) {
    case EventVisibility.PRIVATE:
      return event.ownerId === userId;
    case EventVisibility.TEAM:
      return permissions.canViewScopes.includes(CalendarScope.TEAM);
    case EventVisibility.STORE:
      return permissions.canViewScopes.includes(CalendarScope.STORE);
    case EventVisibility.AREA:
      return permissions.canViewScopes.includes(CalendarScope.AREA);
    case EventVisibility.TENANT:
      return permissions.canViewScopes.includes(CalendarScope.TENANT);
    default:
      return false;
  }
};

export const canUserEditEvent = (
  event: any,
  userId: string,
  permissions: CalendarPermissions
): boolean => {
  // Check ownership first
  if (event.ownerId === userId && permissions.canUpdateScopes.includes(CalendarScope.OWN)) {
    return true;
  }
  
  // Check scope-based permissions
  const eventVisibility = event.visibility as EventVisibility;
  
  switch (eventVisibility) {
    case EventVisibility.TEAM:
      return permissions.canUpdateScopes.includes(CalendarScope.TEAM);
    case EventVisibility.STORE:
      return permissions.canUpdateScopes.includes(CalendarScope.STORE);
    case EventVisibility.AREA:
      return permissions.canUpdateScopes.includes(CalendarScope.AREA);
    case EventVisibility.TENANT:
      return permissions.canUpdateScopes.includes(CalendarScope.TENANT);
    default:
      return false;
  }
};

export const canUserDeleteEvent = (
  event: any,
  userId: string,
  permissions: CalendarPermissions
): boolean => {
  // Check ownership first
  if (event.ownerId === userId && permissions.canDeleteScopes.includes(CalendarScope.OWN)) {
    return true;
  }
  
  // Check scope-based permissions
  const eventVisibility = event.visibility as EventVisibility;
  
  switch (eventVisibility) {
    case EventVisibility.TEAM:
      return permissions.canDeleteScopes.includes(CalendarScope.TEAM);
    case EventVisibility.STORE:
      return permissions.canDeleteScopes.includes(CalendarScope.STORE);
    case EventVisibility.AREA:
      return permissions.canDeleteScopes.includes(CalendarScope.AREA);
    case EventVisibility.TENANT:
      return permissions.canDeleteScopes.includes(CalendarScope.TENANT);
    default:
      return false;
  }
};

export const getAvailableVisibilityOptions = (
  permissions: CalendarPermissions
): EventVisibility[] => {
  const options: EventVisibility[] = [];
  
  // Always can create private events
  if (permissions.canCreateScopes.includes(CalendarScope.OWN)) {
    options.push(EventVisibility.PRIVATE);
  }
  
  if (permissions.canCreateScopes.includes(CalendarScope.TEAM)) {
    options.push(EventVisibility.TEAM);
  }
  
  if (permissions.canCreateScopes.includes(CalendarScope.STORE)) {
    options.push(EventVisibility.STORE);
  }
  
  if (permissions.canCreateScopes.includes(CalendarScope.AREA)) {
    options.push(EventVisibility.AREA);
  }
  
  if (permissions.canCreateScopes.includes(CalendarScope.TENANT)) {
    options.push(EventVisibility.TENANT);
  }
  
  return options;
};

// User type interface
interface SessionUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  tenantId?: string;
  storeId?: string;
}

// Main hook
export function useCalendarPermissions() {
  // Fetch user session data
  const { data: user, isLoading: userLoading } = useQuery<SessionUser>({ 
    queryKey: ["/api/auth/session"]
  });
  
  // Fetch calendar permissions from API
  const { data: serverPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/hr/calendar/permissions'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2
  });
  
  // Calculate permissions based on user role
  const permissions = useMemo(() => {
    if (!user) {
      return ROLE_PERMISSIONS.USER;
    }
    
    // Use server permissions if available
    if (serverPermissions) {
      return serverPermissions as CalendarPermissions;
    }
    
    // Fallback to local role mapping
    const userRole = user.role?.toUpperCase() || 'USER';
    return ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.USER;
  }, [user, serverPermissions]);
  
  // Helper functions bound to current user
  const helpers = useMemo(() => {
    if (!user) return null;
    
    return {
      canViewEvent: (event: any) => canUserViewEvent(event, user.id, permissions),
      canEditEvent: (event: any) => canUserEditEvent(event, user.id, permissions),
      canDeleteEvent: (event: any) => canUserDeleteEvent(event, user.id, permissions),
      getVisibilityOptions: () => getAvailableVisibilityOptions(permissions),
      isOwner: (event: any) => event.ownerId === user.id,
      canCreateInScope: (scope: CalendarScope) => permissions.canCreateScopes.includes(scope),
      canViewInScope: (scope: CalendarScope) => permissions.canViewScopes.includes(scope),
    };
  }, [user, permissions]);
  
  // Fetch pending approvals count if user can approve
  const { data: pendingApprovals } = useQuery<{ count: number }>({
    queryKey: ['/api/hr/leave-requests/pending-count'],
    enabled: !!user && permissions.canApproveLeave,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
  
  return {
    permissions,
    isLoading: userLoading || permissionsLoading,
    user,
    helpers,
    pendingApprovals: pendingApprovals?.count || 0
  };
}