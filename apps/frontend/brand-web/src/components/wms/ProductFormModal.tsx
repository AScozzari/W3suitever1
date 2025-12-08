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
import { queryClient } from '@/lib/queryClient';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Upload, X, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
}).refine((data) => {
  if (data.isSerializable && !data.serialType) {
    return false;
  }
  return true;
}, {
  message: 'Tipo seriale è obbligatorio quando il prodotto è serializzabile',
  path: ['serialType'],
}).refine((data) => {
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
  if (data.type === 'PHYSICAL' && !data.condition) {
    return false;
  }
  return true;
}, {
  message: 'Condizioni prodotto sono obbligatorie per prodotti di tipo PHYSICAL',
  path: ['condition'],
}).refine((data) => {
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
  onOpenChange: (open: boolean) => void;
  product?: any | null;
}

export function ProductFormModal({ open, onOpenChange, product }: ProductFormModalProps) {
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
  const watchCategoryId = form.watch('categoryId');

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (open || product) {
      isInitialMount.current = true;
    }
  }, [open, product]);

  const { data: categoriesResponse } = useQuery({
    queryKey: ['/brand-api/wms/categories'],
    queryFn: brandWmsApi.getCategories,
    enabled: open,
  });

  const { data: typesResponse } = useQuery({
    queryKey: watchCategoryId 
      ? [`/brand-api/wms/product-types?categoryId=${watchCategoryId}`]
      : ['/brand-api/wms/product-types'],
    queryFn: () => watchCategoryId 
      ? brandWmsApi.getProductTypes(watchCategoryId)
      : brandWmsApi.getProductTypes(),
    enabled: open,
  });

  const categories = categoriesResponse?.data || [];
  const productTypes = typesResponse?.data || [];

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (watchCategoryId) {
      form.setValue('typeId', undefined);
    }
  }, [watchCategoryId, form]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo file non valido',
        description: 'Solo immagini JPEG, PNG e WebP sono supportate',
      });
      return;
    }

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

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/brand-api/wms/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      form.setValue('imageUrl', data.imageUrl);
      
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
      setImagePreview(null);
    }
  }, [product, form]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formattedData = {
        ...data,
        validFrom: data.validFrom ? format(data.validFrom, 'yyyy-MM-dd') : undefined,
        validTo: data.validTo ? format(data.validTo, 'yyyy-MM-dd') : undefined,
      };

      if (isEdit) {
        return brandWmsApi.updateProduct(product.id, formattedData);
      } else {
        return brandWmsApi.createProduct(formattedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/wms/products'] });
      toast({
        title: isEdit ? 'Prodotto aggiornato' : 'Prodotto creato',
        description: isEdit 
          ? 'Il prodotto master è stato aggiornato con successo' 
          : 'Il nuovo prodotto master è stato creato nel catalogo brand',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile salvare il prodotto',
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  const isPending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="heading-product-form">
            {isEdit ? 'Modifica Prodotto Master' : 'Nuovo Prodotto Master'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Aggiorna i dettagli del prodotto master esistente' : 'Inserisci i dati per creare un nuovo prodotto nel catalogo master brand'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* CAMPO 1: TIPO PRODOTTO */}
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

              {/* Categoria */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-category">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name || cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipologia Prodotto */}
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipologia</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!watchCategoryId}
                      data-testid="select-typeid"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={watchCategoryId ? "Seleziona tipologia" : "Seleziona prima categoria"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name || type.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Canone Mensile (solo per CANVAS) */}
            {watchType === 'CANVAS' && (
              <FormField
                control={form.control}
                name="monthlyFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canone Mensile (€) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="es. 9.99" 
                        data-testid="input-monthly-fee"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Costo mensile per servizi in abbonamento (CANVAS)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valido Da</FormLabel>
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
                              <span>Seleziona data</span>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valido Fino</FormLabel>
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
                              <span>Seleziona data</span>
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
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immagine Prodotto</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="URL immagine o carica file" 
                          {...field}
                          data-testid="input-image-url"
                        />
                        <label htmlFor="image-upload">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingImage}
                            onClick={() => document.getElementById('image-upload')?.click()}
                            data-testid="button-upload-image"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingImage ? 'Caricamento...' : 'Carica'}
                          </Button>
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        />
                      </div>
                      {imagePreview && (
                        <div className="relative w-32 h-32 border rounded">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              form.setValue('imageUrl', '');
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </FormControl>
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
                      placeholder="Note aggiuntive sul prodotto..." 
                      rows={3}
                      data-testid="input-notes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Serializable checkbox (solo per PHYSICAL) */}
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

            {/* Serial Type (solo se serializzabile e PHYSICAL) */}
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
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                {isPending ? 'Salvataggio...' : (isEdit ? 'Aggiorna Prodotto Master' : 'Crea Prodotto Master')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
