/**
 * 📊 DEPLOY STATUS PAGE
 * 
 * Real-time deployment status tracking for all tenants × branches
 * Features: Auto-refresh, filtering, status summary
 */

import { Link } from 'wouter';
import { ArrowLeft, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DeployStatusMatrix } from '../components/deploy/DeployStatusMatrix';

export default function DeployStatus() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 backdrop-blur-sm bg-white/80 sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/brandinterface/deploy-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  data-testid="button-back-deploy-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Deploy Center
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Status Deployment Real-Time
                  </h1>
                  <p className="text-sm text-gray-600">
                    Monitora i deployment in corso su tutti i tenant
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="w-full px-6 py-8">
        <DeployStatusMatrix />
      </main>
    </div>
  );
}
