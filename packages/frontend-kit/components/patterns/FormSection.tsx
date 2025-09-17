import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';

export interface FormSectionProps {
  title: string;
  description?: string;
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'card' | 'inline';
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  form,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  success = null,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  variant = 'card',
  className = '',
  children,
}: FormSectionProps) {
  const handleSubmit = async (values: any) => {
    try {
      await onSubmit(values);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const formContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('space-y-6', variant === 'inline' && 'max-w-2xl')}
        data-testid="form-section"
      >
        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" data-testid="alert-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50" data-testid="alert-success">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isLoading || !form.formState.isDirty}
            data-testid="button-submit"
          >
            {isLoading ? (
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
              disabled={isLoading}
              data-testid="button-cancel"
            >
              <X className="mr-2 h-4 w-4" />
              {cancelLabel}
            </Button>
          )}
          
          {form.formState.isDirty && !isLoading && (
            <span className="text-sm text-gray-500">You have unsaved changes</span>
          )}
        </div>
      </form>
    </Form>
  );

  if (variant === 'card') {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('space-y-6', className)}>
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {formContent}
    </div>
  );
}

// Field wrapper for consistent spacing
export function FormField({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}

// Field group for related fields
export function FormFieldGroup({
  title,
  description,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div>
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}