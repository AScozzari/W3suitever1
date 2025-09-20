import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateHRRequest, HR_REQUEST_CATEGORIES, HR_REQUEST_TYPES } from '@/hooks/useHRRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowRight, ArrowLeft, Check, Calendar as CalendarIcon, Upload, X,
  Umbrella, Heart, Shield, Baby, Users, Clock, Activity, Home, Building, 
  AlertTriangle, User, Globe, Briefcase, Coffee, MapPin, FileText,
  Laptop, Monitor, Wifi, Smartphone, GraduationCap, Award, BookOpen,
  Dumbbell, Brain, Stethoscope, DollarSign, PawPrint, Accessibility,
  Vote, HandHeart, Droplets, Gift, Target, TrendingUp, Zap, Settings
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Request category configuration
const REQUEST_CATEGORIES = {
  italian_legal: {
    label: 'Permessi Italiani',
    description: 'Congedi previsti dalla legge italiana',
    icon: Shield,
    color: 'from-green-600 to-green-700',
    types: ['marriage_leave', 'maternity_leave', 'paternity_leave', 'parental_leave', 'breastfeeding_leave', 
             'law_104_leave', 'study_leave', 'rol_leave', 'electoral_leave', 'bereavement_extended']
  },
  family: {
    label: 'Congedi Familiari',
    description: 'Permessi per eventi familiari e personali',
    icon: Baby,
    color: 'from-pink-500 to-pink-600',
    types: ['parental', 'bereavement', 'personal', 'fmla', 'religious', 'military']
  },
  professional_development: {
    label: 'Sviluppo Professionale',
    description: 'Formazione, certificazioni e crescita professionale',
    icon: GraduationCap,
    color: 'from-blue-500 to-blue-600',
    types: ['training_request', 'certification_request', 'conference_attendance', 'mentorship_request', 
             'skill_assessment', 'career_development']
  },
  wellness_health: {
    label: 'Benessere e Salute',
    description: 'Programmi di benessere e supporto salute',
    icon: Heart,
    color: 'from-red-500 to-red-600',
    types: ['wellness_program', 'mental_health_support', 'gym_membership', 'financial_counseling', 
             'sick', 'medical_appt', 'pet_insurance', 'ergonomic_assessment']
  },
  remote_work: {
    label: 'Lavoro Remoto',
    description: 'Richieste per lavoro flessibile e remoto',
    icon: Home,
    color: 'from-indigo-500 to-indigo-600',
    types: ['remote_work_request', 'wfh', 'flex_hours', 'sabbatical_request', 'sabbatical_unpaid']
  },
  technology_support: {
    label: 'Supporto Tecnologico',
    description: 'Attrezzature e strumenti tecnologici',
    icon: Laptop,
    color: 'from-cyan-500 to-cyan-600',
    types: ['equipment_request', 'vpn_access', 'internet_stipend', 'mobile_allowance']
  },
  leave: {
    label: 'Congedi Standard',
    description: 'Ferie e permessi base',
    icon: Umbrella,
    color: 'from-yellow-500 to-yellow-600',
    types: ['vacation']
  },
  schedule: {
    label: 'Modifiche Orario',
    description: 'Cambi turno e modifiche orarie',
    icon: Clock,
    color: 'from-green-500 to-green-600',
    types: ['shift_swap', 'time_change', 'overtime']
  },
  other: {
    label: 'Altre Richieste',
    description: 'Richieste varie e speciali',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    types: ['jury_duty', 'emergency', 'experience_rewards', 'volunteer_leave', 'donation_leave']
  }
};

// Request type icons
const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  // Original types
  vacation: Umbrella,
  sick: Heart,
  fmla: Shield,
  parental: Baby,
  bereavement: Heart,
  personal: User,
  religious: Globe,
  military: Shield,
  shift_swap: Users,
  time_change: Clock,
  flex_hours: Activity,
  wfh: Home,
  overtime: Clock,
  jury_duty: Building,
  medical_appt: Heart,
  emergency: AlertTriangle,
  
  // Italian-specific types
  marriage_leave: Heart,
  maternity_leave: Baby,
  paternity_leave: User,
  parental_leave: Baby,
  breastfeeding_leave: Heart,
  law_104_leave: Accessibility,
  study_leave: BookOpen,
  rol_leave: CalendarIcon,
  electoral_leave: Vote,
  bereavement_extended: Heart,
  
  // Modern 2024 types
  remote_work_request: Home,
  equipment_request: Monitor,
  training_request: GraduationCap,
  certification_request: Award,
  sabbatical_request: CalendarIcon,
  sabbatical_unpaid: CalendarIcon,
  wellness_program: Activity,
  mental_health_support: Brain,
  gym_membership: Dumbbell,
  financial_counseling: DollarSign,
  pet_insurance: PawPrint,
  ergonomic_assessment: Settings,
  vpn_access: Shield,
  internet_stipend: Wifi,
  mobile_allowance: Smartphone,
  conference_attendance: Users,
  mentorship_request: User,
  skill_assessment: Target,
  career_development: TrendingUp,
  experience_rewards: Gift,
  volunteer_leave: HandHeart,
  donation_leave: Droplets
};

// Form validation schemas for different steps
const step1Schema = z.object({
  category: z.enum([
    'italian_legal', 'family', 'professional_development', 'wellness_health', 
    'remote_work', 'technology_support', 'leave', 'schedule', 'other'
  ], {
    required_error: 'Seleziona una categoria'
  })
});

const step2Schema = z.object({
  category: z.enum([
    'italian_legal', 'family', 'professional_development', 'wellness_health', 
    'remote_work', 'technology_support', 'leave', 'schedule', 'other'
  ]),
  type: z.string().min(1, 'Seleziona un tipo di richiesta')
});

const step3Schema = z.object({
  category: z.enum([
    'italian_legal', 'family', 'professional_development', 'wellness_health', 
    'remote_work', 'technology_support', 'leave', 'schedule', 'other'
  ]),
  type: z.string().min(1),
  title: z.string().min(1, 'Il titolo è obbligatorio').max(100, 'Massimo 100 caratteri'),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  // Basic fields
  reason: z.string().optional(),
  coverageArrangement: z.string().optional(),
  shiftDetails: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalProvider: z.string().optional(),
  // Italian-specific fields
  weddingDate: z.date().optional(),
  durationDays: z.number().optional(),
  durationHours: z.number().optional(),
  medicalDocumentation: z.boolean().optional(),
  // Professional development fields
  courseTitle: z.string().optional(),
  provider: z.string().optional(),
  estimatedCost: z.number().optional(),
  budget: z.number().optional(),
  // Technology fields
  equipmentType: z.string().optional(),
  specifications: z.string().optional(),
  // Remote work fields
  workArrangement: z.string().optional(),
  workLocation: z.string().optional(),
  // Wellness fields
  programType: z.string().optional(),
  healthProvider: z.string().optional(),
}).refine((data) => {
  // Date validation for leave requests
  if (['leave', 'italian_legal', 'family', 'remote_work'].includes(data.category) && data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'La data di fine deve essere successiva alla data di inizio',
  path: ['endDate']
}).refine((data) => {
  // Future date validation for certain types
  const futureRequiredTypes = ['vacation', 'personal', 'wfh', 'shift_swap', 'remote_work_request', 'sabbatical_request'];
  if (futureRequiredTypes.includes(data.type) && data.startDate) {
    return data.startDate > new Date();
  }
  return true;
}, {
  message: 'Le richieste future devono essere programmate per il futuro',
  path: ['startDate']
}).refine((data) => {
  // Italian-specific validation: Marriage leave within 30 days of wedding
  if (data.type === 'marriage_leave' && data.weddingDate && data.startDate) {
    const daysDiff = Math.abs(data.startDate.getTime() - data.weddingDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  }
  return true;
}, {
  message: 'Il congedo matrimoniale deve essere richiesto entro 30 giorni dalla data del matrimonio',
  path: ['startDate']
}).refine((data) => {
  // Law 104: Maximum 3 days per month validation
  if (data.type === 'law_104_leave' && data.durationDays) {
    return data.durationDays <= 3;
  }
  return true;
}, {
  message: 'La Legge 104 consente massimo 3 giorni al mese',
  path: ['durationDays']
}).refine((data) => {
  // Study leave: Maximum 150 hours over 3 years (simplified check)
  if (data.type === 'study_leave' && data.durationHours) {
    return data.durationHours <= 150;
  }
  return true;
}, {
  message: 'Il diritto allo studio consente massimo 150 ore in 3 anni',
  path: ['durationHours']
}).refine((data) => {
  // Medical documentation required for certain types
  const medicalTypes = ['law_104_leave', 'sick', 'fmla', 'medical_appt', 'maternity_leave', 'paternity_leave', 'breastfeeding_leave'];
  if (medicalTypes.includes(data.type) && data.medicalDocumentation === false) {
    return false;
  }
  return true;
}, {
  message: 'Documentazione medica richiesta per questo tipo di richiesta',
  path: ['medicalDocumentation']
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

interface HRRequestWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function HRRequestWizard({ onSuccess, onCancel }: HRRequestWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Step3Data>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const createMutation = useCreateHRRequest();

  // Step 1 Form - Category Selection
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { category: formData.category }
  });

  // Step 2 Form - Type Selection  
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { 
      category: formData.category,
      type: formData.type 
    }
  });

  // Step 3 Form - Request Details
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      ...formData,
      priority: formData.priority || 'normal'
    }
  });

  // Update form defaults when formData changes
  useEffect(() => {
    step1Form.reset({ category: formData.category });
    step2Form.reset({ category: formData.category, type: formData.type });
    step3Form.reset({ ...formData, priority: formData.priority || 'normal' });
  }, [formData, step1Form, step2Form, step3Form]);

  const handleStep1Submit = (data: Step1Data) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    try {
      const requestData = {
        category: data.category,
        type: data.type,
        title: data.title,
        description: data.description,
        startDate: data.startDate ? data.startDate.toISOString() : undefined,
        endDate: data.endDate ? data.endDate.toISOString() : undefined,
        priority: data.priority,
        payload: {
          reason: data.reason,
          coverageArrangement: data.coverageArrangement,
          shiftDetails: data.shiftDetails,
          emergencyContact: data.emergencyContact,
          medicalProvider: data.medicalProvider
        },
        attachments: attachments.map(file => file.name) // In real app, upload files first
      };

      await createMutation.mutateAsync(requestData);
      onSuccess();
    } catch (error) {
      console.error('Error creating HR request:', error);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFieldsForType = (type: string): string[] => {
    const commonFields = ['title', 'description', 'priority'];
    const dateFields = ['startDate', 'endDate'];
    const durationFields = ['durationDays', 'durationHours'];
    const budgetFields = ['budget', 'estimatedCost'];
    
    switch (type) {
      // Original leave types
      case 'vacation':
      case 'personal':
      case 'religious':
        return [...commonFields, ...dateFields, 'reason', 'coverageArrangement'];
      case 'sick':
      case 'medical_appt':
        return [...commonFields, ...dateFields, 'medicalProvider', 'reason', 'medicalDocumentation'];
      case 'fmla':
      case 'parental':
      case 'bereavement':
        return [...commonFields, ...dateFields, 'reason', 'medicalDocumentation'];
      case 'emergency':
        return [...commonFields, 'reason', 'emergencyContact'];
        
      // Schedule types
      case 'wfh':
      case 'flex_hours':
        return [...commonFields, ...dateFields, 'reason', 'workArrangement'];
      case 'shift_swap':
      case 'time_change':
        return [...commonFields, 'shiftDetails', 'reason'];
      case 'overtime':
        return [...commonFields, 'startDate', 'shiftDetails', 'reason'];
        
      // Original other types
      case 'jury_duty':
      case 'military':
        return [...commonFields, ...dateFields, 'reason'];
        
      // Italian-specific request types
      case 'marriage_leave':
        return [...commonFields, ...dateFields, 'weddingDate', 'reason'];
      case 'maternity_leave':
      case 'paternity_leave':
        return [...commonFields, ...dateFields, 'medicalDocumentation', 'reason'];
      case 'parental_leave':
        return [...commonFields, ...dateFields, 'reason', 'coverageArrangement'];
      case 'breastfeeding_leave':
        return [...commonFields, ...durationFields, 'medicalDocumentation'];
      case 'law_104_leave':
        return [...commonFields, ...durationFields, 'medicalDocumentation', 'reason'];
      case 'study_leave':
        return [...commonFields, ...durationFields, 'courseTitle', 'provider', 'reason'];
      case 'rol_leave':
        return [...commonFields, ...dateFields, 'reason'];
      case 'electoral_leave':
        return [...commonFields, ...dateFields, 'reason'];
      case 'bereavement_extended':
        return [...commonFields, ...dateFields, 'reason'];
        
      // Professional development types
      case 'training_request':
        return [...commonFields, 'courseTitle', 'provider', ...budgetFields, 'reason'];
      case 'certification_request':
        return [...commonFields, 'courseTitle', 'provider', ...budgetFields, 'reason'];
      case 'conference_attendance':
        return [...commonFields, ...dateFields, 'provider', ...budgetFields, 'reason'];
      case 'mentorship_request':
        return [...commonFields, 'reason'];
      case 'skill_assessment':
        return [...commonFields, 'reason'];
      case 'career_development':
        return [...commonFields, 'reason'];
        
      // Technology support types
      case 'equipment_request':
        return [...commonFields, 'equipmentType', 'specifications', ...budgetFields, 'reason'];
      case 'vpn_access':
        return [...commonFields, 'reason'];
      case 'internet_stipend':
        return [...commonFields, ...budgetFields, 'reason'];
      case 'mobile_allowance':
        return [...commonFields, ...budgetFields, 'reason'];
        
      // Remote work types
      case 'remote_work_request':
        return [...commonFields, ...dateFields, 'workArrangement', 'workLocation', 'reason'];
      case 'sabbatical_request':
      case 'sabbatical_unpaid':
        return [...commonFields, ...dateFields, 'reason'];
        
      // Wellness & health types
      case 'wellness_program':
        return [...commonFields, 'programType', 'provider', ...budgetFields];
      case 'mental_health_support':
        return [...commonFields, 'healthProvider', 'reason'];
      case 'gym_membership':
        return [...commonFields, 'provider', ...budgetFields];
      case 'financial_counseling':
        return [...commonFields, 'provider', 'reason'];
      case 'pet_insurance':
        return [...commonFields, 'provider', ...budgetFields];
      case 'ergonomic_assessment':
        return [...commonFields, 'workLocation', 'reason'];
        
      // Other types
      case 'experience_rewards':
        return [...commonFields, 'reason'];
      case 'volunteer_leave':
        return [...commonFields, ...dateFields, 'reason'];
      case 'donation_leave':
        return [...commonFields, ...dateFields, 'medicalProvider'];
        
      default:
        return commonFields;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step < currentStep ? 'bg-green-500 text-white' : 
                step === currentStep ? 'bg-blue-500 text-white' : 
                'bg-gray-200 text-gray-600'}
            `}>
              {step < currentStep ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Category Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Categoria</CardTitle>
            <CardDescription>Scegli il tipo di richiesta che vuoi fare</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...step1Form}>
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
                <FormField
                  control={step1Form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid grid-cols-1 gap-4"
                        >
                          {Object.entries(REQUEST_CATEGORIES).map(([key, config]) => {
                            const IconComponent = config.icon;
                            return (
                              <Label
                                key={key}
                                htmlFor={key}
                                className={`
                                  flex items-center space-x-4 p-6 border-2 rounded-lg cursor-pointer
                                  transition-all hover:border-blue-300
                                  ${field.value === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                `}
                                data-testid={`category-${key}`}
                              >
                                <RadioGroupItem value={key} id={key} className="sr-only" />
                                <div className={`p-3 rounded-full bg-gradient-to-r ${config.color} text-white`}>
                                  <IconComponent className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{config.label}</h3>
                                  <p className="text-sm text-gray-600">
                                    {config.types.length} tipi disponibili
                                  </p>
                                </div>
                              </Label>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
                    Annulla
                  </Button>
                  <Button type="submit" data-testid="button-next-step1">
                    Avanti <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Type Selection */}
      {currentStep === 2 && formData.category && (
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Tipo di Richiesta</CardTitle>
            <CardDescription>
              Scegli il tipo specifico per la categoria {REQUEST_CATEGORIES[formData.category].label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                <FormField
                  control={step2Form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid grid-cols-1 gap-3"
                        >
                          {REQUEST_CATEGORIES[formData.category].types.map((type) => {
                            const IconComponent = TYPE_ICONS[type] || FileText;
                            return (
                              <Label
                                key={type}
                                htmlFor={type}
                                className={`
                                  flex items-center space-x-4 p-4 border rounded-lg cursor-pointer
                                  transition-all hover:border-blue-300
                                  ${field.value === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                `}
                                data-testid={`type-${type}`}
                              >
                                <RadioGroupItem value={type} id={type} className="sr-only" />
                                <div className="p-2 bg-gray-100 rounded-full">
                                  <IconComponent className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">
                                    {HR_REQUEST_TYPES[type as keyof typeof HR_REQUEST_TYPES]}
                                  </h4>
                                </div>
                              </Label>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={goBack} data-testid="button-back-step2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button type="submit" data-testid="button-next-step2">
                    Avanti <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Request Details */}
      {currentStep === 3 && formData.type && (
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Richiesta</CardTitle>
            <CardDescription>
              Compila i dettagli per la tua richiesta di {HR_REQUEST_TYPES[formData.type as keyof typeof HR_REQUEST_TYPES]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...step3Form}>
              <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6">
                {/* Title Field */}
                <FormField
                  control={step3Form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Richiesta *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Inserisci un titolo descrittivo"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Field */}
                <FormField
                  control={step3Form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorità</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Seleziona priorità" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normale</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Professional Date Selection */}
                {getFieldsForType(formData.type).includes('startDate') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <CalendarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Periodo Richiesta</h3>
                        <p className="text-sm text-gray-600">Seleziona le date per la tua richiesta</p>
                      </div>
                      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="h-12 px-6 bg-gradient-to-r from-orange-50 to-purple-50 border-orange-200 hover:from-orange-100 hover:to-purple-100 transition-all"
                            data-testid="button-open-date-picker"
                          >
                            <CalendarIcon className="h-5 w-5 mr-2 text-orange-600" />
                            <span className="font-medium text-gray-700">
                              {step3Form.watch('startDate') || step3Form.watch('endDate') 
                                ? 'Modifica Date' 
                                : 'Seleziona Date'}
                            </span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader className="text-center space-y-3">
                            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center">
                              <CalendarIcon className="h-6 w-6 text-white" />
                            </div>
                            <DialogTitle className="text-xl font-bold text-gray-900">
                              Selezione Date
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Scegli il periodo per la tua richiesta di {HR_REQUEST_TYPES[formData.type as keyof typeof HR_REQUEST_TYPES]}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            {/* Date Range Selection */}
                            <div className="grid grid-cols-1 gap-4">
                              <FormField
                                control={step3Form.control}
                                name="startDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-semibold text-gray-700">
                                      Data Inizio
                                    </FormLabel>
                                    <div className="relative">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              className="w-full h-12 justify-start text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-300"
                                              data-testid="button-start-date-in-dialog"
                                            >
                                              <CalendarIcon className="mr-3 h-4 w-4 text-gray-500" />
                                              {field.value ? (
                                                <span className="text-gray-900 font-medium">
                                                  {format(field.value, 'EEEE, dd MMMM yyyy', { locale: it })}
                                                </span>
                                              ) : (
                                                <span className="text-gray-500">Clicca per selezionare</span>
                                              )}
                                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                            className="rounded-md border"
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {getFieldsForType(formData.type).includes('endDate') && (
                                <FormField
                                  control={step3Form.control}
                                  name="endDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-semibold text-gray-700">
                                        Data Fine
                                      </FormLabel>
                                      <div className="relative">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <FormControl>
                                              <Button
                                                variant="outline"
                                                className="w-full h-12 justify-start text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-300"
                                                data-testid="button-end-date-in-dialog"
                                              >
                                                <CalendarIcon className="mr-3 h-4 w-4 text-gray-500" />
                                                {field.value ? (
                                                  <span className="text-gray-900 font-medium">
                                                    {format(field.value, 'EEEE, dd MMMM yyyy', { locale: it })}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-500">Clicca per selezionare</span>
                                                )}
                                              </Button>
                                            </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={field.value}
                                              onSelect={field.onChange}
                                              disabled={(date) => {
                                                const today = new Date();
                                                const startDate = step3Form.watch('startDate');
                                                if (date < today) return true;
                                                if (startDate && date < startDate) return true;
                                                return false;
                                              }}
                                              initialFocus
                                              className="rounded-md border"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>

                            {/* Duration Summary */}
                            {step3Form.watch('startDate') && step3Form.watch('endDate') && (
                              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-green-900">Periodo Selezionato</p>
                                    <p className="text-sm text-green-700">
                                      {(() => {
                                        const start = step3Form.watch('startDate');
                                        const end = step3Form.watch('endDate');
                                        if (!start || !end) return '';
                                        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                        return `${days} giorn${days === 1 ? 'o' : 'i'} dal ${format(start!, 'dd/MM', { locale: it })} al ${format(end!, 'dd/MM/yyyy', { locale: it })}`;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Quick Date Presets */}
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-gray-700">Selezioni Rapide</p>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const today = new Date();
                                    step3Form.setValue('startDate', today);
                                    step3Form.setValue('endDate', today);
                                  }}
                                  className="text-xs"
                                  data-testid="button-today"
                                >
                                  Oggi
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const tomorrow = addDays(new Date(), 1);
                                    step3Form.setValue('startDate', tomorrow);
                                    step3Form.setValue('endDate', tomorrow);
                                  }}
                                  className="text-xs"
                                  data-testid="button-tomorrow"
                                >
                                  Domani
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const nextWeek = addDays(new Date(), 7);
                                    step3Form.setValue('startDate', nextWeek);
                                    step3Form.setValue('endDate', addDays(nextWeek, 4));
                                  }}
                                  className="text-xs"
                                  data-testid="button-next-week"
                                >
                                  Pross. Settimana
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    step3Form.setValue('startDate', undefined);
                                    step3Form.setValue('endDate', undefined);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700"
                                  data-testid="button-clear-dates"
                                >
                                  Cancella
                                </Button>
                              </div>
                            </div>

                            {/* Dialog Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDatePickerOpen(false)}
                                data-testid="button-close-date-picker"
                              >
                                Chiudi
                              </Button>
                              <Button
                                type="button"
                                onClick={() => setDatePickerOpen(false)}
                                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                                data-testid="button-confirm-dates"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Conferma Date
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Selected Dates Summary in Main Form */}
                    {(step3Form.watch('startDate') || step3Form.watch('endDate')) && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-blue-900">Date Selezionate</p>
                              <div className="flex items-center gap-4 text-sm text-blue-700">
                                {step3Form.watch('startDate') && (
                                  <span>Inizio: {format(step3Form.watch('startDate')!, 'dd/MM/yyyy', { locale: it })}</span>
                                )}
                                {step3Form.watch('endDate') && (
                                  <span>Fine: {format(step3Form.watch('endDate')!, 'dd/MM/yyyy', { locale: it })}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDatePickerOpen(true)}
                            className="text-blue-600 hover:text-blue-700"
                            data-testid="button-edit-dates"
                          >
                            Modifica
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Description Field */}
                <FormField
                  control={step3Form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrivi i dettagli della tua richiesta (opzionale)"
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Fornisci informazioni aggiuntive che possano aiutare nella valutazione della richiesta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type-specific fields */}
                {getFieldsForType(formData.type).includes('reason') && (
                  <FormField
                    control={step3Form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Specifica il motivo della richiesta"
                            {...field}
                            data-testid="textarea-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {getFieldsForType(formData.type).includes('coverageArrangement') && (
                  <FormField
                    control={step3Form.control}
                    name="coverageArrangement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Piano di Copertura</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrivi come sarà coperto il lavoro durante la tua assenza"
                            {...field}
                            data-testid="textarea-coverage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {getFieldsForType(formData.type).includes('shiftDetails') && (
                  <FormField
                    control={step3Form.control}
                    name="shiftDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dettagli Turno</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Specifica i dettagli del turno (orari, scambio con collega, etc.)"
                            {...field}
                            data-testid="textarea-shift-details"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {getFieldsForType(formData.type).includes('emergencyContact') && (
                  <FormField
                    control={step3Form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contatto di Emergenza</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome e telefono del contatto"
                            {...field}
                            data-testid="input-emergency-contact"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {getFieldsForType(formData.type).includes('medicalProvider') && (
                  <FormField
                    control={step3Form.control}
                    name="medicalProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Struttura Medica</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome della struttura o medico"
                            {...field}
                            data-testid="input-medical-provider"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Attachments */}
                <div className="space-y-4">
                  <Label>Allegati</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      data-testid="button-upload"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Carica File
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            data-testid={`button-remove-attachment-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Riepilogo Richiesta</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Categoria: {REQUEST_CATEGORIES[formData.category!].label}</p>
                    <p>Tipo: {HR_REQUEST_TYPES[formData.type as keyof typeof HR_REQUEST_TYPES]}</p>
                    {step3Form.watch('startDate') && (
                      <p>Data: {format(step3Form.watch('startDate'), 'PPP', { locale: it })}</p>
                    )}
                    <p>Priorità: {step3Form.watch('priority')}</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={goBack} data-testid="button-back-step3">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    data-testid="button-submit-request"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Invia Richiesta
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}