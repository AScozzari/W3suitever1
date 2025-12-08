import { useState } from 'react';
import { PageHeader, PageHeaderProps } from '../components/blocks/PageHeader';
import { FormSection, FormField, FormFieldGroup } from '../components/patterns/FormSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { Loader2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

export interface FormPageTemplateProps {
  // Page Header
  title: string;
  subtitle?: string;
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  showBackButton?: boolean;
  onBack?: () => void;
  
  // Form
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  
  // Form Sections
  sections?: FormSectionSpec[];
  
  // States
  isLoading?: boolean;
  isSaving?: boolean;
  error?: Error | string | null;
  success?: string | null;
  
  // Actions
  submitLabel?: string;
  cancelLabel?: string;
  showReset?: boolean;
  onReset?: () => void;
  additionalActions?: React.ReactNode;
  
  // Layout
  variant?: 'default' | 'compact' | 'card' | 'sidebar';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  children?: React.ReactNode;
}

export interface FormSectionSpec {
  id: string;
  title: string;
  description?: string;
  fields: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function FormPageTemplate({
  title,
  subtitle,
  breadcrumbs,
  showBackButton,
  onBack,
  form,
  onSubmit,
  onCancel,
  sections = [],
  isLoading = false,
  isSaving = false,
  error = null,
  success = null,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  showReset = false,
  onReset,
  additionalActions,
  variant = 'default',
  maxWidth = 'lg',
  className = '',
  children,
}: FormPageTemplateProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.defaultCollapsed).map(s => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      await onSubmit(values);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case 'full': return 'w-full';
      default: return 'max-w-lg';
    }
  };

  const formContent = (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6"
      data-testid="form-page-form"
    >
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {typeof error === 'string' ? error : error.message}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50" data-testid="alert-success">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Form Sections */}
      {sections.length > 0 ? (
        sections.map((section) => (
          <Card key={section.id} className="glass-card" data-testid={`form-section-${section.id}`}>
            <CardHeader
              className={section.collapsible ? 'cursor-pointer' : ''}
              onClick={section.collapsible ? () => toggleSection(section.id) : undefined}
            >
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            {!collapsedSections.has(section.id) && (
              <CardContent>
                <div className="space-y-4">
                  {section.fields}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      ) : (
        <div className="space-y-6">
          {children}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isSaving || !form.formState.isDirty}
            data-testid="button-submit"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              data-testid="button-cancel"
            >
              <X className="mr-2 h-4 w-4" />
              {cancelLabel}
            </Button>
          )}
          
          {showReset && onReset && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={isSaving}
              data-testid="button-reset"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {form.formState.isDirty && !isSaving && (
            <span className="text-sm text-gray-500" data-testid="text-unsaved-changes">
              You have unsaved changes
            </span>
          )}
          {additionalActions}
        </div>
      </div>
    </form>
  );

  const pageContent = (
    <>
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        showBackButton={showBackButton}
        onBack={onBack}
      />

      {/* Form Content */}
      {isLoading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading form...</p>
          </div>
        </Card>
      ) : (
        <div className={variant === 'card' ? '' : 'mt-6'}>
          {variant === 'card' ? (
            <Card className="glass-card">
              <CardContent className="pt-6">
                {formContent}
              </CardContent>
            </Card>
          ) : (
            formContent
          )}
        </div>
      )}
    </>
  );

  if (variant === 'sidebar') {
    return (
      <div className={cn('flex gap-6', className)} data-testid="form-page-template">
        <aside className="w-64 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                // Scroll to section
                document.getElementById(`form-section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-gray-100',
                !collapsedSections.has(section.id) && 'bg-gray-50 font-medium'
              )}
              data-testid={`sidebar-link-${section.id}`}
            >
              {section.title}
            </button>
          ))}
        </aside>
        <div className={cn('flex-1', getMaxWidthClass())}>
          {pageContent}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', getMaxWidthClass(), className)} data-testid="form-page-template">
      {pageContent}
    </div>
  );
}

// Preset variants
export const SimpleFormPage = (props: Omit<FormPageTemplateProps, 'variant'>) => (
  <FormPageTemplate {...props} variant="default" />
);

export const CardFormPage = (props: Omit<FormPageTemplateProps, 'variant'>) => (
  <FormPageTemplate {...props} variant="card" />
);

export const SidebarFormPage = (props: Omit<FormPageTemplateProps, 'variant'>) => (
  <FormPageTemplate {...props} variant="sidebar" />
);