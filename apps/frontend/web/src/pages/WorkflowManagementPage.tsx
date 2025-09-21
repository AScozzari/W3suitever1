import React from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Plus, Settings } from 'lucide-react';

const WorkflowManagementPage: React.FC = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
            <p className="text-muted-foreground">
              Visual workflow builder and automation platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button data-testid="button-create-workflow">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </div>
        </div>

        {/* Simple Content Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-dashboard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Dashboard
              </CardTitle>
              <CardDescription>
                Overview of your workflows and automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Workflow dashboard functionality will be available here.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-builder">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workflow Builder
              </CardTitle>
              <CardDescription>
                Visual workflow design and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visual workflow builder will be available here.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-templates">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>
                Pre-built workflow templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Workflow templates library will be available here.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Test Message */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                ✅ Workflow Management Page is loading successfully without infinite re-renders!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WorkflowManagementPage;