import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import MarketingWorkspace from '../components/workspaces/MarketingWorkspace';
import SalesWorkspace from '../components/workspaces/SalesWorkspace';
import OperationsWorkspace from '../components/workspaces/OperationsWorkspace';
import AdminWorkspace from '../components/workspaces/AdminWorkspace';

export default function Dashboard() {
  const { isAuthenticated, workspace } = useBrandAuth();
  const { currentTenant, currentTenantId, isCrossTenant, switchTenant } = useBrandTenant();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  // Render current workspace content
  const renderWorkspaceContent = () => {
    switch (workspace) {
      case 'marketing':
        return <MarketingWorkspace />;
      case 'sales':
        return <SalesWorkspace />;
      case 'operations':
        return <OperationsWorkspace />;
      case 'admin':
        return <AdminWorkspace />;
      default:
        return <MarketingWorkspace />;
    }
  };

  return (
    <BrandLayout>
      {renderWorkspaceContent()}
    </BrandLayout>
  );
}