import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Upload, X, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schema con validazione condizionale completa
const productSchema = z.object({
  type: z.enum(['CANVAS', 'PHYSICAL', 'VIRTUAL', 'SERVICE']),
  status: z.enum(['active', 'inactive', 'discontinued', 'draft']),
  condition: z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  name: z.string().min(1, 'Descrizione obbligatoria'),
  sku: z.string().min(1, 'SKU obbligatorio'),
  ean: z.string().optional(),
  memory: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().url('URL non valido').or(z.literal('')).optional(),
  notes: z.string().optional(),
  isSerializable: z.boolean(),
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  unitOfMeasure: z.string().min(1, 'Unità di misura obbligatoria'),
  categoryId: z.string().max(100).optional(),
  typeId: z.string().max(100).optional(),
  validFrom: z.coerce.date().optional(), // Date object from DatePicker (formatted to YYYY-MM-DD on submit)
  validTo: z.coerce.date().optional(),   // Date object from DatePicker (formatted to YYYY-MM-DD on submit)
}).refine((data) => {
  // Validation Rule: serialType is required if isSerializable is true
  if (data.isSerializable && !data.serialType) {
    return false;
  }
  return true;
}, {
  message: 'Tipo seriale è obbligatorio quando il prodotto è serializzabile',
  path: ['serialType'],
}).refine((data) => {
  // Validation Rule: monthlyFee is required if type is CANVAS
  if (data.type === 'CANVAS') {
    if (!data.monthlyFee || data.monthlyFee <= 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'Canone mensile obbligatorio per prodotti di tipo CANVAS',
  path: ['monthlyFee'],
}).refine((data) => {
  // Validation Rule: condition is required if type is PHYSICAL
  if (data.type === 'PHYSICAL' && !data.condition) {
    return false;
  }
  return true;
}, {
  message: 'Condizioni prodotto sono obbligatorie per prodotti di tipo PHYSICAL',
  path: ['condition'],
}).refine((data) => {
  // Validation Rule: validTo must be >= validFrom if both are provided
  if (data.validFrom && data.validTo) {
    const from = new Date(data.validFrom);
    const to = new Date(data.validTo);
    if (to < from) {
      return false;
    }
  }
  return true;
}, {
  message: 'Data di fine validità deve essere successiva alla data di inizio',
  path: ['validTo'],
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: any | null;
}

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!product;
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: 'PHYSICAL',
      status: 'active',
      condition: undefined,
      brand: '',
      model: '',
      name: '',
      sku: '',
      ean: '',
      memory: '',
      color: '',
      imageUrl: '',
      notes: '',
      isSerializable: false,
      serialType: undefined,
      monthlyFee: undefined,
      unitOfMeasure: 'pz',
      categoryId: undefined,
      typeId: undefined,
      validFrom: undefined,
      validTo: undefined,
    },
  });

  const watchType = form.watch('type');
  const watchIsSerializable = form.watch('isSerializable');
  const watchCategoryId = form.watch('categoryId'); // For cascade filter

  // Track if this is the initial mount to prevent resetting typeId on hydration
  // Reset this flag whenever modal opens or product changes
  const isInitialMount = useRef(true);

  // Reset isInitialMount when modal opens or product prop changes (new edit session)
  useEffect(() => {
    if (open || product) {
      isInitialMount.current = true;
    }
  }, [open, product]);

  // Fetch categories
  const tenantId = localStorage.getItem('currentTenantId');
  const { data: categoriesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/wms/categories'],
    enabled: !!tenantId && open,
  });

  // Fetch product types (filtered by categoryId if selected)
  const { data: typesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: watchCategoryId 
      ? [`/api/wms/product-types?categoryId=${watchCategoryId}`]
      : ['/api/wms/product-types'],
    enabled: !!tenantId && open,
  });

  const categories = categoriesData?.data || [];
  const productTypes = typesData?.data || [];

  // Reset typeId when categoryId changes (but NOT on initial mount/hydration)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (watchCategoryId) {
      form.setValue('typeId', undefined);
    }
  }, [watchCategoryId, form]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo file non valido',
        description: 'Solo immagini JPEG, PNG e WebP sono supportate',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File troppo grande',
        description: 'La dimensione massima è 5MB',
      });
      return;
    }

    try {
      setUploadingImage(true);

      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Upload to backend using raw fetch (FormData requires manual request)
      const tenantId = localStorage.getItem('currentTenantId');
      const token = localStorage.getItem('access_token');
      
      const response = await fetch('/api/wms/products/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Set image URL in form
      form.setValue('imageUrl', data.imageUrl);
      
      // Set preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast({
        title: 'Immagine caricata',
        description: 'Immagine caricata con successo',
      });

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Errore upload',
        description: 'Impossibile caricare l\'immagine',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Clear condition when type changes from PHYSICAL to another type
  useEffect(() => {
    if (watchType !== 'PHYSICAL') {
      form.setValue('condition', undefined);
    }
  }, [watchType, form]);

  useEffect(() => {
    if (product) {
      form.reset({
        type: product.type || 'PHYSICAL',
        status: product.status || 'active',
        condition: product.condition || undefined,
        brand: product.brand || '',
        model: product.model || '',
        name: product.name || '',
        sku: product.sku || '',
        ean: product.ean || '',
        memory: product.memory || '',
        color: product.color || '',
        imageUrl: product.imageUrl || '',
        notes: product.notes || '',
        isSerializable: product.isSerializable || false,
        serialType: product.serialType || undefined,
        monthlyFee: product.monthlyFee || undefined,
        unitOfMeasure: product.unitOfMeasure || 'pz',
        categoryId: product.categoryId || undefined,
        typeId: product.typeId || undefined,
        validFrom: product.validFrom ? new Date(product.validFrom) : undefined,
        validTo: product.validTo ? new Date(product.validTo) : undefined,
      });
      // Set image preview for edit mode
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    } else {
      form.reset({
        type: 'PHYSICAL',
        status: 'active',
        condition: undefined,
        brand: '',
        model: '',
        name: '',
        sku: '',
        ean: '',
        memory: '',
        color: '',
        imageUrl: '',
        notes: '',
        isSerializable: false,
        serialType: undefined,
        monthlyFee: undefined,
        unitOfMeasure: 'pz',
        categoryId: undefined,
        typeId: undefined,
        validFrom: undefined,
        validTo: undefined,
      });
      // Clear image preview for new product
      setImagePreview(null);
    }
  }, [product, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return apiRequest(`/api/wms/products`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/products'] });
      toast({
        title: 'Prodotto creato',
        description: 'Il prodotto è stato creato con successo.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile creare il prodotto.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return apiRequest(`/api/wms/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/products'] });
      toast({
        title: 'Prodotto aggiornato',
        description: 'Il prodotto è stato aggiornato con successo.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile aggiornare il prodotto.',
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    // Format Date objects to YYYY-MM-DD strings for backend compatibility
    const formattedData = {
      ...data,
      validFrom: data.validFrom ? format(data.validFrom, 'yyyy-MM-dd') : undefined,
      validTo: data.validTo ? format(data.validTo, 'yyyy-MM-dd') : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="heading-product-form">
            {isEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Aggiorna i dettagli del prodotto esistente' : 'Inserisci i dati per creare un nuovo prodotto nel catalogo'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* CAMPO 1: TIPO PRODOTTO (PRIMO CAMPO!) */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Prodotto <span className="text-red-500">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                    data-testid="select-type"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo prodotto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CANVAS">Canvas</SelectItem>
                      <SelectItem value="PHYSICAL">Fisico</SelectItem>
                      <SelectItem value="VIRTUAL">Digitale</SelectItem>
                      <SelectItem value="SERVICE">Servizio</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Scegli CANVAS per servizi in abbonamento (es: SIM, Cloud Storage)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CAMPO 2: STATO PRODOTTO */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato <span className="text-red-500">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    data-testid="select-status"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="inactive">Inattivo</SelectItem>
                      <SelectItem value="discontinued">Discontinuato</SelectItem>
                      <SelectItem value="draft">Bozza</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Stato del prodotto nel catalogo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CAMPO 3: CONDIZIONI PRODOTTO (Solo per PHYSICAL) */}
            {watchType === 'PHYSICAL' && (
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condizioni <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-condition"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona condizioni" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Nuovo</SelectItem>
                        <SelectItem value="used">Usato</SelectItem>
                        <SelectItem value="refurbished">Ricondizionato</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Condizioni fisiche del prodotto
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Marca */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Apple, Samsung" 
                        data-testid="input-brand"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Modello */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modello</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. iPhone 15 Pro Max" 
                        data-testid="input-model"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrizione Prodotto */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. Smartphone Premium" 
                        data-testid="input-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. PROD-001" 
                        data-testid="input-sku"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EAN/Barcode */}
              <FormField
                control={form.control}
                name="ean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EAN/Barcode</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. 8032454078463" 
                        data-testid="input-ean"
                        maxLength={13}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Memoria (solo per PHYSICAL) */}
              {watchType === 'PHYSICAL' && (
                <FormField
                  control={form.control}
                  name="memory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memoria</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="es. 128GB, 256GB, 512GB" 
                          data-testid="input-memory"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Capacità di memoria per dispositivi elettronici
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Colore (solo per PHYSICAL) */}
              {watchType === 'PHYSICAL' && (
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colore</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="es. Nero, Bianco, Blu Titanio" 
                          data-testid="input-color"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Colore distintivo del prodotto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Unità di Misura */}
              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unità di Misura <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="es. pz, kg, m" 
                        data-testid="input-unit-of-measure"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CAMPO CONDIZIONALE: Canone Mensile (solo per CANVAS) - Posizionato dopo Unità di Misura */}
              {watchType === 'CANVAS' && (
                <FormField
                  control={form.control}
                  name="monthlyFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canone Mensile (€/mese) <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="es. 19.99" 
                          data-testid="input-monthly-fee"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Importo mensile pagato dal cliente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ===== CATEGORIZZAZIONE ===== */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Categorizzazione</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Categoria */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                        data-testid="select-category"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.nome}
                              {category.source === 'brand' && category.isBrandSynced && (
                                <span className="ml-2 text-xs text-orange-600">🏢 Brand</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipologia (filtrata per categoria selezionata) */}
                <FormField
                  control={form.control}
                  name="typeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipologia</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                        disabled={!watchCategoryId}
                        data-testid="select-type"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              watchCategoryId 
                                ? "Seleziona tipologia" 
                                : "Seleziona prima una categoria"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.nome}
                              {type.source === 'brand' && type.isBrandSynced && (
                                <span className="ml-2 text-xs text-orange-600">🏢 Brand</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {!watchCategoryId && "Seleziona una categoria per filtrare le tipologie"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ===== VALIDITÀ TEMPORALE ===== */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Validità Temporale</h3>
              <p className="text-sm text-gray-500">
                Imposta il periodo di validità del prodotto (opzionale). I prodotti scaduti vengono automaticamente nascosti.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Valido Dal */}
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valido Dal</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-valid-from"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona data inizio</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Data a partire dalla quale il prodotto è valido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valido Fino Al */}
                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valido Fino Al</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-valid-to"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona data fine</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Data fino alla quale il prodotto rimane valido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Immagine Upload */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immagine Prodotto</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Upload Button */}
                      {!imagePreview && !field.value && (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Clicca per caricare</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              JPEG, PNG o WebP (MAX. 5MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            data-testid="input-image-upload"
                            disabled={uploadingImage}
                          />
                        </label>
                      )}

                      {/* Image Preview */}
                      {(imagePreview || field.value) && (
                        <div className="relative">
                          <img
                            src={imagePreview || field.value}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                            data-testid="img-preview"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              field.onChange('');
                              setImagePreview(null);
                            }}
                            data-testid="button-remove-image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {uploadingImage && (
                        <div className="text-sm text-gray-500">Caricamento in corso...</div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Carica un'immagine del prodotto (JPEG, PNG o WebP - max 5MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Note aggiuntive sul prodotto"
                      className="min-h-[80px]"
                      data-testid="textarea-notes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CAMPO CONDIZIONALE: Serializzabile (checkbox - solo per PHYSICAL) */}
            {watchType === 'PHYSICAL' && (
            <FormField
              control={form.control}
              name="isSerializable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-serializable"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Prodotto Serializzabile
                    </FormLabel>
                    <FormDescription>
                      Abilita tracciabilità tramite numero seriale (IMEI, MAC, ICCID, etc.)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            )}

            {/* CAMPO CONDIZIONALE: Tipo Seriale (solo se serializzabile e PHYSICAL) */}
            {watchType === 'PHYSICAL' && watchIsSerializable && (
              <FormField
                control={form.control}
                name="serialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Seriale <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-serial-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo seriale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="imei">IMEI (Telefoni)</SelectItem>
                        <SelectItem value="iccid">ICCID (SIM Card)</SelectItem>
                        <SelectItem value="mac_address">MAC Address (Router, Switch)</SelectItem>
                        <SelectItem value="other">Altro Seriale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specifica il tipo di numero seriale utilizzato
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit"
                style={{
                  background: isPending ? 'hsl(var(--muted))' : 'hsl(var(--brand-orange))',
                  color: 'white',
                }}
              >
                {isPending ? 'Salvataggio...' : (isEdit ? 'Aggiorna' : 'Crea Prodotto')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
