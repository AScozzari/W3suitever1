import { useState } from 'react';
import { PageHeader, PageHeaderProps } from '../components/blocks/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Key,
  Monitor,
  ChevronRight,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  content: React.ReactNode;
  form?: UseFormReturn<any>;
  onSave?: (values: any) => void | Promise<void>;
  onReset?: () => void;
  isDirty?: boolean;
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon?: React.ReactNode;
  sections: SettingsSection[];
}

export interface SettingsPageTemplateProps {
  // Page Header
  title: string;
  subtitle?: string;
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  
  // Settings Structure
  categories?: SettingsCategory[];
  sections?: SettingsSection[];
  defaultCategory?: string;
  defaultSection?: string;
  onCategoryChange?: (categoryId: string) => void;
  onSectionChange?: (sectionId: string) => void;
  
  // Global Actions
  onSaveAll?: () => void | Promise<void>;
  onResetAll?: () => void;
  showGlobalActions?: boolean;
  
  // States
  isLoading?: boolean;
  isSaving?: boolean;
  error?: Error | string | null;
  success?: string | null;
  unsavedChanges?: boolean;
  
  // Layout
  variant?: 'default' | 'sidebar' | 'tabs' | 'accordion';
  className?: string;
  children?: React.ReactNode;
}

export function SettingsPageTemplate({
  title,
  subtitle,
  breadcrumbs,
  categories = [],
  sections = [],
  defaultCategory,
  defaultSection,
  onCategoryChange,
  onSectionChange,
  onSaveAll,
  onResetAll,
  showGlobalActions = false,
  isLoading = false,
  isSaving = false,
  error = null,
  success = null,
  unsavedChanges = false,
  variant = 'sidebar',
  className = '',
  children,
}: SettingsPageTemplateProps) {
  const allSections = categories.length > 0 
    ? categories.flatMap(cat => cat.sections)
    : sections;
  
  const [activeCategory, setActiveCategory] = useState(
    defaultCategory || categories[0]?.id || ''
  );
  const [activeSection, setActiveSection] = useState(
    defaultSection || allSections[0]?.id || ''
  );
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [sectionSuccess, setSectionSuccess] = useState<Record<string, string>>({});

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const category = categories.find(c => c.id === categoryId);
    if (category && category.sections.length > 0) {
      setActiveSection(category.sections[0].id);
      onSectionChange?.(category.sections[0].id);
    }
    onCategoryChange?.(categoryId);
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    onSectionChange?.(sectionId);
  };

  const handleSectionSave = async (section: SettingsSection, values: any) => {
    if (!section.onSave) return;
    
    setSavingSections(prev => new Set(prev).add(section.id));
    setSectionErrors(prev => ({ ...prev, [section.id]: '' }));
    setSectionSuccess(prev => ({ ...prev, [section.id]: '' }));
    
    try {
      await section.onSave(values);
      setSectionSuccess(prev => ({ ...prev, [section.id]: 'Settings saved successfully' }));
      setTimeout(() => {
        setSectionSuccess(prev => ({ ...prev, [section.id]: '' }));
      }, 3000);
    } catch (err) {
      setSectionErrors(prev => ({ 
        ...prev, 
        [section.id]: err instanceof Error ? err.message : 'Failed to save settings' 
      }));
    } finally {
      setSavingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section.id);
        return newSet;
      });
    }
  };

  const renderSectionContent = (section: SettingsSection) => {
    const isSavingSection = savingSections.has(section.id);
    const sectionError = sectionErrors[section.id];
    const sectionSuccessMsg = sectionSuccess[section.id];
    
    return (
      <div key={section.id} className="space-y-6" data-testid={`settings-section-${section.id}`}>
        {/* Section Header */}
        <div>
          <div className="flex items-center gap-2">
            {section.icon && <div className="text-gray-400">{section.icon}</div>}
            <h3 className="text-lg font-medium">{section.title}</h3>
            {section.badge && (
              <Badge variant={section.badge.variant || 'default'}>
                {section.badge.label}
              </Badge>
            )}
          </div>
          {section.description && (
            <p className="mt-1 text-sm text-gray-600">{section.description}</p>
          )}
        </div>

        {/* Section Messages */}
        {sectionError && (
          <Alert variant="destructive" data-testid={`alert-error-${section.id}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sectionError}</AlertDescription>
          </Alert>
        )}
        {sectionSuccessMsg && (
          <Alert className="border-green-200 bg-green-50" data-testid={`alert-success-${section.id}`}>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{sectionSuccessMsg}</AlertDescription>
          </Alert>
        )}

        {/* Section Content */}
        <div>{section.content}</div>

        {/* Section Actions */}
        {(section.onSave || section.onReset) && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              {section.onSave && section.form && (
                <Button
                  onClick={() => section.form!.handleSubmit((values) => handleSectionSave(section, values))()}
                  disabled={isSavingSection || !section.isDirty}
                  data-testid={`button-save-${section.id}`}
                >
                  {isSavingSection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
              {section.onReset && (
                <Button
                  variant="outline"
                  onClick={section.onReset}
                  disabled={isSavingSection}
                  data-testid={`button-reset-${section.id}`}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
            {section.isDirty && (
              <span className="text-sm text-gray-500">You have unsaved changes</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <aside className="w-64 space-y-6">
      {/* Categories */}
      {categories.length > 0 ? (
        categories.map((category) => (
          <div key={category.id} className="space-y-1" data-testid={`category-${category.id}`}>
            <div className="flex items-center gap-2 px-3 text-sm font-medium text-gray-900">
              {category.icon && <span>{category.icon}</span>}
              {category.label}
            </div>
            <nav className="space-y-1">
              {category.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  data-testid={`nav-section-${section.id}`}
                >
                  <span>{section.title}</span>
                  {section.isDirty && (
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        ))
      ) : (
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-gray-100 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              data-testid={`nav-section-${section.id}`}
            >
              <div className="flex items-center gap-2">
                {section.icon && <span>{section.icon}</span>}
                <span>{section.title}</span>
              </div>
              {section.isDirty && (
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );

  const tabsContent = variant === 'tabs' && (
    <>
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {allSections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={cn(
                'group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
              data-testid={`tab-${section.id}`}
            >
              {section.icon && <span className="mr-2">{section.icon}</span>}
              {section.title}
              {section.isDirty && (
                <div className="ml-2 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderSectionContent(allSections.find(s => s.id === activeSection)!)}
      </div>
    </>
  );

  const accordionContent = variant === 'accordion' && (
    <div className="space-y-4">
      {allSections.map((section) => (
        <Card key={section.id} className="glass-card">
          <CardHeader
            className="cursor-pointer"
            onClick={() => handleSectionChange(section.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {section.icon && <span>{section.icon}</span>}
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.badge && (
                  <Badge variant={section.badge.variant || 'default'}>
                    {section.badge.label}
                  </Badge>
                )}
                {section.isDirty && (
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                )}
              </div>
              <ChevronRight
                className={cn(
                  'h-5 w-5 transition-transform',
                  activeSection === section.id && 'rotate-90'
                )}
              />
            </div>
            {section.description && activeSection !== section.id && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </CardHeader>
          {activeSection === section.id && (
            <CardContent>
              {renderSectionContent(section)}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  const mainContent = (
    <>
      {/* Global Messages */}
      {error && (
        <Alert variant="destructive" data-testid="alert-global-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {typeof error === 'string' ? error : error.message}
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50" data-testid="alert-global-success">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Content */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      ) : variant === 'tabs' ? (
        tabsContent
      ) : variant === 'accordion' ? (
        accordionContent
      ) : variant === 'sidebar' ? (
        <Card className="glass-card">
          <CardContent className="p-6">
            {renderSectionContent(allSections.find(s => s.id === activeSection)!)}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {allSections.map((section) => (
            <Card key={section.id} className="glass-card">
              <CardContent className="p-6">
                {renderSectionContent(section)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Content */}
      {children}
    </>
  );

  return (
    <div className={cn('space-y-6', className)} data-testid="settings-page-template">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        secondaryActions={
          showGlobalActions ? [
            ...(onResetAll ? [{
              label: 'Reset All',
              icon: <RotateCcw className="h-4 w-4" />,
              onClick: onResetAll,
              variant: 'outline' as const
            }] : []),
            ...(onSaveAll ? [{
              label: isSaving ? 'Saving...' : 'Save All',
              icon: isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
              onClick: onSaveAll,
              disabled: isSaving || !unsavedChanges,
              variant: 'default' as const
            }] : [])
          ] : []
        }
      />

      {/* Main Layout */}
      {variant === 'sidebar' ? (
        <div className="flex gap-6">
          {sidebarContent}
          <div className="flex-1">{mainContent}</div>
        </div>
      ) : (
        mainContent
      )}
    </div>
  );
}

// Preset variants
export const SidebarSettings = (props: Omit<SettingsPageTemplateProps, 'variant'>) => (
  <SettingsPageTemplate {...props} variant="sidebar" />
);

export const TabSettings = (props: Omit<SettingsPageTemplateProps, 'variant'>) => (
  <SettingsPageTemplate {...props} variant="tabs" />
);

export const AccordionSettings = (props: Omit<SettingsPageTemplateProps, 'variant'>) => (
  <SettingsPageTemplate {...props} variant="accordion" />
);

export const SimpleSettings = (props: Omit<SettingsPageTemplateProps, 'variant'>) => (
  <SettingsPageTemplate {...props} variant="default" />
);