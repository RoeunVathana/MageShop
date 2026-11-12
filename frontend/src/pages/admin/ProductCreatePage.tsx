import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Package,
  ArrowLeft,
  DollarSign,
  Boxes,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
  SlidersHorizontal,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Star,
  Upload,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Images,
  Image as ImageIcon,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import { mediaService } from '@/services/media.service'
import type { CategoryAttribute } from '@/types/category.types'
import type { Brand } from '@/types/brand.types'

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  brand: z.string().optional(),
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(100)
    .regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, dashes and underscores'),
  product_type: z.enum(['simple', 'variable', 'digital']).default('simple'),
  description: z.string().optional(),
  selling_price: z.coerce.number().positive('Selling price must be greater than $0'),
  discount_price: z.coerce.number().min(0, 'Discount price cannot be negative').optional().nullable(),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative').optional(),
  category_id: z.coerce.number().optional(),
  initial_stock: z.coerce.number().int().min(0, 'Initial stock cannot be negative').default(0),
  low_stock_threshold: z.coerce.number().int().min(0, 'Threshold cannot be negative').default(5),
  weight: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'draft']).default('active'),
  // Keep the client limit aligned with StoreProductRequest.image_url|max:500.
  image_url: z.string().max(500, 'Image URL must be 500 characters or fewer').optional().or(z.literal('')),
})

type ProductFormData = z.infer<typeof productSchema>

interface VariantDraft {
  id: string
  sku: string
  name: string
  selling_price: number
  cost_price: number
  initial_stock: number
  option_values: Record<string, string>
}

function formatProductError(error: unknown): string {
  const candidate = (error && typeof error === 'object' ? error : {}) as {
    message?: unknown
    errors?: Record<string, unknown>
  }
  const message = typeof candidate.message === 'string' && candidate.message.trim()
    ? candidate.message.trim()
    : 'Failed to create product.'
  const details = Object.entries(candidate.errors || {})
    .flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value]
      return values
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => `${field}: ${item}`)
    })

  return details.length > 0 ? `${message} ${details.join(' ')}` : message
}

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Array<{ id: number; name: string; parent_name?: string | null }>>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([])
  const [attributeFormValues, setAttributeFormValues] = useState<Record<string, string>>({})
  const [variantsList, setVariantsList] = useState<VariantDraft[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [newGalleryInput, setNewGalleryInput] = useState<string>('')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      product_type: 'simple',
      initial_stock: 0,
      low_stock_threshold: 5,
      status: 'active',
    },
  })

  const selectedCategoryId = watch('category_id')
  const selectedProductType = watch('product_type')
  const sellingPrice = Number(watch('selling_price') || 0)
  const rawDiscountPrice = watch('discount_price')
  const parsedDiscountPrice = Number(rawDiscountPrice)
  const hasDiscountInput = rawDiscountPrice !== undefined && rawDiscountPrice !== null && String(rawDiscountPrice).trim() !== ''
  const discountPrice = hasDiscountInput && Number.isFinite(parsedDiscountPrice) && parsedDiscountPrice > 0 ? parsedDiscountPrice : null
  const costPrice = Number(watch('cost_price') || 0)

  const hasDiscount = discountPrice !== null && discountPrice < sellingPrice
  const customerEffectivePrice = hasDiscount ? discountPrice : sellingPrice
  const grossProfit = customerEffectivePrice - costPrice
  const marginPercent = customerEffectivePrice > 0 ? ((grossProfit / customerEffectivePrice) * 100).toFixed(1) : '0'

  useEffect(() => {
    productService
      .getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]))

    brandService
      .getBrands({ per_page: 100 })
      .then((res) => setBrands(res.data || []))
      .catch(() => setBrands([]))
  }, [])

  // When category changes, dynamically load its configured attributes!
  useEffect(() => {
    if (!selectedCategoryId) {
      setCategoryAttributes([])
      setAttributeFormValues({})
      return
    }

    categoryService
      .getCategoryAttributes(selectedCategoryId)
      .then((attrs) => {
        setCategoryAttributes(attrs)
        // Reset dynamic values
        const initialVals: Record<string, string> = {}
        attrs.forEach((a) => {
          initialVals[a.code] = ''
        })
        setAttributeFormValues(initialVals)
      })
      .catch(() => {
        setCategoryAttributes([])
      })
  }, [selectedCategoryId])

  const handleAttributeValueChange = (code: string, value: string) => {
    setAttributeFormValues((prev) => ({ ...prev, [code]: value }))
  }

  // Variant generator helpers
  const handleAddVariant = () => {
    const parentSku = watch('sku') || 'VAR'
    const nextIdx = variantsList.length + 1
    const newVariant: VariantDraft = {
      id: Math.random().toString(36).substring(2, 9),
      sku: `${parentSku.toUpperCase()}-${nextIdx}`,
      name: `Option ${nextIdx}`,
      selling_price: sellingPrice || 29.99,
      cost_price: costPrice || 0,
      initial_stock: 10,
      option_values: {},
    }
    setVariantsList((prev) => [...prev, newVariant])
  }

  const handleRemoveVariant = (id: string) => {
    setVariantsList((prev) => prev.filter((v) => v.id !== id))
  }

  const handleUpdateVariantField = (id: string, field: keyof VariantDraft, val: any) => {
    setVariantsList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    )
  }

  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingMedia(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${files.length} to Cloud S3...`)
        const file = files[i]
        const uploaded = await mediaService.uploadMedia(file, 'products')
        if (uploaded?.url) {
          uploadedUrls.push(uploaded.url)
        }
      }

      setGalleryUrls((prev) => {
        const next = [...prev]
        uploadedUrls.forEach((u) => {
          if (!next.includes(u)) next.push(u)
        })
        return next
      })

      const currentCover = watch('image_url')
      if (!currentCover && uploadedUrls.length > 0) {
        setValue('image_url', uploadedUrls[0], { shouldValidate: true })
      }

      toast({
        title: 'Uploaded to Cloud Storage ☁️',
        description: `Successfully uploaded ${uploadedUrls.length} image(s) to permanent storage.`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err?.message || 'Could not upload media files.',
        type: 'error',
      })
    } finally {
      setUploadingMedia(false)
      setUploadProgress(null)
      e.target.value = ''
    }
  }

  const handleAddGalleryUrl = () => {
    const trimmed = newGalleryInput.trim()
    if (!trimmed) return
    if (trimmed.length > 500) {
      toast({
        title: 'Image URL is too long',
        description: 'Image URLs must be 500 characters or fewer.',
        type: 'error',
      })
      return
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid image URL starting with http:// or https://',
        type: 'error',
      })
      return
    }
    if (galleryUrls.includes(trimmed)) {
      toast({
        title: 'Already in Gallery',
        description: 'This image is already added to the gallery list.',
        type: 'error',
      })
      return
    }

    setGalleryUrls((prev) => [...prev, trimmed])
    setNewGalleryInput('')

    const currentCover = watch('image_url')
    if (!currentCover) {
      setValue('image_url', trimmed, { shouldValidate: true })
    }
  }

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    const removedUrl = galleryUrls[indexToRemove]
    const updated = galleryUrls.filter((_, idx) => idx !== indexToRemove)
    setGalleryUrls(updated)

    if (watch('image_url') === removedUrl) {
      setValue('image_url', updated[0] || '', { shouldValidate: true })
    }
  }

  const handleSetCover = (url: string) => {
    setValue('image_url', url, { shouldValidate: true })
    if (!galleryUrls.includes(url)) {
      setGalleryUrls((prev) => [url, ...prev])
    }
    toast({
      title: 'Cover Image Updated ⭐',
      description: 'This image is now set as the primary cover photo.',
      type: 'success',
    })
  }

  const handleMoveGallery = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= galleryUrls.length) return
    setGalleryUrls((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, item)
      return copy
    })
  }

  const handleInvalidForm = (formErrors: FieldErrors<ProductFormData>) => {
    const firstError = Object.values(formErrors)[0] as { message?: unknown } | undefined
    const message = typeof firstError?.message === 'string'
      ? firstError.message
      : 'Complete the required product fields before creating it.'
    setServerError(message)
    toast({
      title: 'Check the product form',
      description: message,
      type: 'error',
    })
  }

  const onSubmit = async (data: ProductFormData) => {
    const missingRequiredAttributes = categoryAttributes
      .filter((attr) => attr.is_required && !attributeFormValues[attr.code]?.trim())
      .map((attr) => attr.name)

    if (missingRequiredAttributes.length > 0) {
      const message = `Complete required category field(s): ${missingRequiredAttributes.join(', ')}.`
      setServerError(message)
      toast({
        title: 'Complete required specifications',
        description: message,
        type: 'error',
      })
      return
    }

    setIsSubmitting(true)
    setServerError(null)

    try {
      // Map dynamic category attributes
      const formattedAttributes = categoryAttributes
        .map((attr) => {
          const rawVal = attributeFormValues[attr.code]
          if (!rawVal) return null

          if (attr.type === 'select' && attr.options) {
            const matchedOpt = attr.options.find(
              (o) => o.value === rawVal || o.id.toString() === rawVal
            )
            return {
              attribute_id: attr.id,
              code: attr.code,
              selected_option_id: matchedOpt ? matchedOpt.id : undefined,
              value: matchedOpt ? matchedOpt.value : rawVal,
            }
          }

          return {
            attribute_id: attr.id,
            code: attr.code,
            value: rawVal,
          }
        })
        .filter(Boolean)

      // Map variants if variable product
      const formattedVariants =
        data.product_type === 'variable'
          ? variantsList.map((v) => ({
              sku: v.sku.toUpperCase().trim(),
              name: v.name.trim(),
              selling_price: Number(v.selling_price),
              cost_price: Number(v.cost_price || 0),
              initial_stock: Number(v.initial_stock || 0),
            }))
          : undefined

      const finalCover = data.image_url?.trim() || (galleryUrls.length > 0 ? galleryUrls[0] : undefined)
      const combinedGallery = Array.from(
        new Set([...(finalCover ? [finalCover] : []), ...galleryUrls])
      )

      const created = await productService.createProduct({
        name: data.name.trim(),
        brand: data.brand?.trim() || undefined,
        sku: data.sku.toUpperCase().trim(),
        product_type: data.product_type,
        description: data.description?.trim(),
        selling_price: Number(data.selling_price),
        discount_price: data.discount_price !== undefined && data.discount_price !== null && Number(data.discount_price) > 0 ? Number(data.discount_price) : null,
        cost_price: data.cost_price ? Number(data.cost_price) : undefined,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        initial_stock: Number(data.initial_stock || 0),
        low_stock_threshold: Number(data.low_stock_threshold || 5),
        weight: data.weight ? Number(data.weight) : undefined,
        status: data.status,
        image_url: finalCover,
        gallery_urls: combinedGallery,
        attributes: formattedAttributes as any,
        variants: formattedVariants,
      })

      toast({
        title: 'Universal Product Created',
        description: `Product "${created.name}" (${created.sku}) published to marketplace.`,
        type: 'success',
      })

      navigate('/admin/products')
    } catch (err: unknown) {
      const message = formatProductError(err)
      setServerError(message)
      toast({
        title: 'Creation Failed',
        description: message,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout
      roleTitle="Product Management"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/products">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight">Create Universal Product</h1>
              <p className="text-xs text-muted-foreground">
                Universal marketplace item with dynamic category specifications, multi-attribute variants, and pricing.
              </p>
            </div>
          </div>
        </div>

        {serverError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, handleInvalidForm)}
          className="space-y-6 text-xs"
        >
          {/* Identity & Department */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                Product Identity & Department Taxonomy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Product Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g. Solid Oak Dining Table or Men's Linen Shirt"
                    className="h-9 text-xs"
                  />
                  {errors.name && (
                    <p className="text-destructive text-[11px]">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Brand / Manufacturer</label>
                  <Input
                    {...register('brand')}
                    list="registered-brands"
                    placeholder="e.g. MegaBasics, Aura Silk, UrbanPulse"
                    className="h-9 text-xs"
                  />
                  <datalist id="registered-brands">
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.country ? `${b.name} (${b.country})` : b.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Master SKU <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('sku')}
                    placeholder="e.g. OAK-TBL-180"
                    className="h-9 text-xs font-mono uppercase"
                  />
                  {errors.sku && (
                    <p className="text-destructive text-[11px]">{errors.sku.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Product Type</label>
                  <select
                    {...register('product_type')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  >
                    <option value="simple">Simple Product (Single SKU)</option>
                    <option value="variable">Variable Product (Size/Color Variants)</option>
                    <option value="digital">Digital Product (License/Download)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Marketplace Category</label>
                  <select
                    {...register('category_id')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Department...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_name ? `— ${c.name} (${c.parent_name})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Description & Details</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Comprehensive description of product specifications, materials, warranty, or instructions..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-4 pt-2 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Images className="w-4 h-4 text-purple-600" />
                      <span>Product Media & Multi-Image Gallery</span>
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        {galleryUrls.length} {galleryUrls.length === 1 ? 'image' : 'images'}
                      </Badge>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Upload multiple images to cloud storage or add URLs to create an interactive slider on the product page.
                    </p>
                  </div>

                  {/* Multi-file Cloud Upload Button */}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingMedia ? (uploadProgress || 'Uploading to Cloud S3...') : '☁️ Upload Multiple Images'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingMedia}
                      onChange={handleMultiImageUpload}
                    />
                  </label>
                </div>

                {/* Primary Cover URL Input & Manual Add URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Primary Cover Image URL</span>
                    </label>
                    <Input
                      {...register('image_url')}
                      placeholder="https://... (Cover photo shown on catalog cards)"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Add Image URL to Gallery
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={newGalleryInput}
                        onChange={(e) => setNewGalleryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddGalleryUrl()
                          }
                        }}
                        placeholder="Paste image link and click Add..."
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddGalleryUrl}
                        className="h-8 px-3 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Interactive Gallery Thumbnail Grid */}
                {galleryUrls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Gallery Slides Order (Shoppers can slide through these)</span>
                      <span>Click ⭐ to set as cover</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                      {galleryUrls.map((imgUrl, idx) => {
                        const isCover = watch('image_url') === imgUrl || (!watch('image_url') && idx === 0)
                        return (
                          <div
                            key={idx}
                            className={`group relative rounded-lg border-2 p-1.5 bg-background transition-all flex flex-col justify-between ${
                              isCover
                                ? 'border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                            }`}
                          >
                            <div className="aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 relative mb-1.5 flex items-center justify-center">
                              <img
                                src={imgUrl}
                                alt={`Gallery slide ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </div>
                              {isCover && (
                                <div className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  <span>Cover</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveGallery(idx, idx - 1)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                                  title="Move earlier"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === galleryUrls.length - 1}
                                  onClick={() => handleMoveGallery(idx, idx + 1)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                                  title="Move later"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center gap-0.5">
                                {!isCover && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCover(imgUrl)}
                                    className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                    title="Make cover"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryImage(idx)}
                                  className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  title="Remove image"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-foreground">No gallery images added yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload multiple images at once to enable the interactive multi-photo slider on storefront product detail.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <label className="font-semibold text-foreground text-xs">Publishing Status</label>
                  <select
                    {...register('status')}
                    className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="active">Active (Visible in Storefront)</option>
                    <option value="draft">Draft (Internal Only)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Category Attributes Card */}
          {categoryAttributes.length > 0 && (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-700">
                    <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                    Department Specifications ({categoryAttributes.length})
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Category-Specific Attributes
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Fill in structured technical specifications and filters for this category.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryAttributes.map((attr) => {
                    const isReq = attr.is_required
                    const val = attributeFormValues[attr.code] || ''

                    return (
                      <div key={attr.id} className="space-y-1.5">
                        <label className="font-semibold text-foreground flex items-center gap-1">
                          <span>{attr.name}</span>
                          {isReq && <span className="text-destructive">*</span>}
                          {attr.is_variant_option && (
                            <span className="text-[10px] text-purple-600 ml-1">(Variant Option)</span>
                          )}
                        </label>

                        {/* Render Input by Type */}
                        {attr.type === 'select' && attr.options && attr.options.length > 0 ? (
                          <select
                            value={val}
                            onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            required={isReq}
                          >
                            <option value="">Select {attr.name}...</option>
                            {attr.options.map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : attr.type === 'number' ? (
                          <Input
                            type="number"
                            value={val}
                            onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                            className="h-9 text-xs"
                            required={isReq}
                          />
                        ) : attr.type === 'date' ? (
                          <Input
                            type="date"
                            value={val}
                            onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                            className="h-9 text-xs"
                            required={isReq}
                          />
                        ) : attr.type === 'boolean' ? (
                          <select
                            value={val}
                            onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select Yes / No</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <Input
                            type="text"
                            value={val}
                            onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                            placeholder={`Enter ${attr.name}...`}
                            className="h-9 text-xs"
                            required={isReq}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing & Profit Margins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Pricing Strategy & Unit Margins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground text-xs flex items-center justify-between">
                    <span>Selling Price (USD) <span className="text-destructive">*</span></span>
                    <span className="text-[10px] text-muted-foreground font-normal">Regular</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    {...register('selling_price')}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  {errors.selling_price && (
                    <p className="text-destructive text-[11px]">{errors.selling_price.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Customer Sale Price (USD)
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Leave empty for regular price"
                    {...register('discount_price')}
                    className="h-9 text-xs font-mono font-bold border-emerald-500/30 focus-visible:border-emerald-500"
                  />
                  {errors.discount_price && (
                    <p className="text-destructive text-[11px]">{errors.discount_price.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground text-xs flex items-center justify-between">
                    <span>Cost Price / COGS (USD)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Internal</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('cost_price')}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Quick Discount Shortcuts */}
              {sellingPrice > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-muted-foreground font-semibold">Discount Shortcuts:</span>
                  {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const calculated = Math.round(sellingPrice * (1 - pct / 100) * 100) / 100
                        setValue('discount_price', calculated, { shouldDirty: true })
                      }}
                      className="px-2 py-0.5 rounded text-[11px] border bg-background hover:bg-muted font-bold transition-colors"
                    >
                      {pct}% OFF
                    </button>
                  ))}
                  {discountPrice && (
                    <button
                      type="button"
                      onClick={() => setValue('discount_price', null as any, { shouldDirty: true })}
                      className="px-2 py-0.5 rounded text-[11px] text-destructive hover:bg-destructive/10 font-bold transition-colors ml-auto"
                    >
                      Remove Discount
                    </button>
                  )}
                </div>
              )}

              {/* Live Customer Preview & Profit Strip */}
              <div className="p-3 bg-muted/40 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer Sees on Storefront:</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ${customerEffectivePrice.toFixed(2)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-xs text-muted-foreground line-through font-mono">
                          ${sellingPrice.toFixed(2)}
                        </span>
                        <Badge className="bg-rose-500 text-white text-[10px] py-0 px-1.5 font-bold">
                          Save ${(sellingPrice - (discountPrice as number)).toFixed(2)} ({Math.round(((sellingPrice - (discountPrice as number)) / sellingPrice) * 100)}% OFF)
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {costPrice > 0 && (
                  <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Est. Profit</span>
                      <span className={`font-mono font-bold text-xs ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ${grossProfit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Margin</span>
                      <span className="font-mono font-bold text-xs text-purple-600">{marginPercent}%</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variable Product Variants Editor */}
          {selectedProductType === 'variable' && (
            <Card className="border-purple-500/30">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Product Variants (SKUs & Inventories)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Each variable option (e.g. Size/Color combination) generates an independent inventory SKU.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleAddVariant}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Variant
                </Button>
              </CardHeader>
              <CardContent>
                {variantsList.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground text-xs">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No variants added yet. Click &quot;Add Variant&quot; to configure SKUs for sizes, colors, or capacities.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variantsList.map((v, i) => (
                      <div
                        key={v.id}
                        className="p-3 border rounded-lg bg-card grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs"
                      >
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground block">
                            Variant Title
                          </label>
                          <Input
                            value={v.name}
                            onChange={(e) => handleUpdateVariantField(v.id, 'name', e.target.value)}
                            placeholder="e.g. Black / Large"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground block">
                            Variant SKU
                          </label>
                          <Input
                            value={v.sku}
                            onChange={(e) =>
                              handleUpdateVariantField(v.id, 'sku', e.target.value.toUpperCase())
                            }
                            className="h-8 text-xs font-mono uppercase"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground block">
                            Selling Price ($)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={v.selling_price}
                            onChange={(e) =>
                              handleUpdateVariantField(v.id, 'selling_price', e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground block">
                            Initial Stock
                          </label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={v.initial_stock}
                            onChange={(e) =>
                              handleUpdateVariantField(v.id, 'initial_stock', e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="flex items-center justify-end pt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveVariant(v.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Simple Product Initial Stock */}
          {selectedProductType === 'simple' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  Initial Inventory & Safety Buffers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Initial Stock On Hand</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      {...register('initial_stock')}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Low Stock Threshold</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="5"
                      {...register('low_stock_threshold')}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin/products">
              <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Universal Product...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Create Product
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
