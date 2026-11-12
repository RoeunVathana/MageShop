import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Star,
  Upload,
  ArrowRight,
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
import type { Product } from '@/types/product.types'
import type { Brand } from '@/types/brand.types'

const productEditSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  brand: z.string().optional(),
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(100)
    .regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, dashes and underscores'),
  product_type: z.enum(['simple', 'variable', 'digital', 'bundle']).default('simple'),
  description: z.string().optional(),
  selling_price: z.coerce.number().positive('Selling price must be greater than $0'),
  discount_price: z.coerce.number().min(0, 'Discount price cannot be negative').optional().nullable(),
  cost_price: z.coerce.number().min(0, 'Cost price cannot be negative').optional(),
  category_id: z.coerce.number().optional(),
  low_stock_threshold: z.coerce.number().int().min(0, 'Threshold cannot be negative').default(5),
  weight: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  image_url: z.string().max(500, 'Image URL must be 500 characters or fewer').optional().or(z.literal('')),
})

type ProductEditFormData = z.infer<typeof productEditSchema>

interface VariantDraft {
  id?: number | string
  sku: string
  name: string
  selling_price: number
  cost_price?: number
  stock_quantity: number
  is_active: boolean
  option_values: Record<string, string>
}

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Array<{ id: number; name: string; parent_name?: string | null }>>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([])
  const [attributeFormValues, setAttributeFormValues] = useState<Record<string, string>>({})
  const [variantsList, setVariantsList] = useState<VariantDraft[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [newGalleryInput, setNewGalleryInput] = useState<string>('')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema) as any,
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
    if (!id) return

    Promise.all([
      productService.getProduct(id),
      productService.getCategories(),
      brandService.getBrands({ per_page: 100 }),
    ])
      .then(async ([prod, cats, brandsRes]) => {
        setProduct(prod)
        setCategories(cats)
        setBrands(brandsRes.data || [])

        reset({
          name: prod.name,
          brand: prod.brand || '',
          sku: prod.sku,
          product_type: (prod.product_type as any) || 'simple',
          description: prod.description || '',
          selling_price: prod.selling_price,
          discount_price: prod.discount_price ?? undefined,
          cost_price: prod.cost_price ?? undefined,
          category_id: prod.category?.id,
          low_stock_threshold: prod.low_stock_threshold,
          weight: prod.weight ?? undefined,
          status: prod.status,
          image_url: prod.image_url || '',
        })

        const loadedGallery = Array.isArray(prod.gallery_urls) && prod.gallery_urls.length > 0
          ? prod.gallery_urls
          : (prod.image_url ? [prod.image_url] : [])
        setGalleryUrls(loadedGallery)

        // Preload dynamic category attributes
        if (prod.category?.id) {
          try {
            const attrs = await categoryService.getCategoryAttributes(prod.category.id)
            setCategoryAttributes(attrs)

            const initialVals: Record<string, string> = {}
            attrs.forEach((a) => {
              const matched = prod.attributes?.find((pa) => pa.attribute_id === a.id || pa.code === a.code)
              if (matched) {
                initialVals[a.code] = matched.selected_option_id ? matched.selected_option_id.toString() : (matched.value || '')
              } else {
                initialVals[a.code] = ''
              }
            })
            setAttributeFormValues(initialVals)
          } catch {
            setCategoryAttributes([])
          }
        }

        // Preload existing variants if variable product
        if (prod.variants && prod.variants.length > 0) {
          const mappedVariants: VariantDraft[] = prod.variants.map((v) => {
            const opts: Record<string, string> = {}
            if (v.attribute_values) {
              v.attribute_values.forEach((av) => {
                if (av.code) {
                  opts[av.code] = av.option_id ? av.option_id.toString() : (av.custom_value || '')
                }
              })
            }
            return {
              id: v.id,
              sku: v.sku,
              name: v.name,
              selling_price: v.selling_price,
              cost_price: v.cost_price ?? undefined,
              stock_quantity: v.stock_quantity,
              is_active: v.is_active ?? true,
              option_values: opts,
            }
          })
          setVariantsList(mappedVariants)
        }
      })
      .catch((err: any) => {
        setServerError(err?.message || 'Failed to fetch product details.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, reset])

  // React to category change after initial mount
  useEffect(() => {
    if (loading || !selectedCategoryId) return

    categoryService
      .getCategoryAttributes(selectedCategoryId)
      .then((attrs) => {
        setCategoryAttributes(attrs)
        setAttributeFormValues((prev) => {
          const nextVals: Record<string, string> = { ...prev }
          attrs.forEach((a) => {
            if (!(a.code in nextVals)) {
              nextVals[a.code] = ''
            }
          })
          return nextVals
        })
      })
      .catch(() => {
        setCategoryAttributes([])
      })
  }, [selectedCategoryId, loading])

  const handleAttributeValueChange = (code: string, value: string) => {
    setAttributeFormValues((prev) => ({ ...prev, [code]: value }))
  }

  // Variant operations
  const handleAddVariant = () => {
    const parentSku = watch('sku') || 'VAR'
    const nextIdx = variantsList.length + 1
    const newVariant: VariantDraft = {
      id: undefined,
      sku: `${parentSku.toUpperCase()}-${nextIdx}`,
      name: `Option ${nextIdx}`,
      selling_price: sellingPrice || 29.99,
      cost_price: costPrice || 0,
      stock_quantity: 10,
      is_active: true,
      option_values: {},
    }
    setVariantsList((prev) => [...prev, newVariant])
  }

  const handleRemoveVariant = (index: number) => {
    setVariantsList((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateVariantField = (index: number, field: keyof VariantDraft, val: any) => {
    setVariantsList((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, [field]: val } : v))
    )
  }

  const handleUpdateVariantOption = (index: number, attrCode: string, optionIdOrVal: string) => {
    setVariantsList((prev) =>
      prev.map((v, idx) =>
        idx === index
          ? {
              ...v,
              option_values: { ...v.option_values, [attrCode]: optionIdOrVal },
            }
          : v
      )
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

  const handleInvalidForm = (formErrors: FieldErrors<ProductEditFormData>) => {
    const firstError = Object.values(formErrors)[0] as { message?: unknown } | undefined
    const message = typeof firstError?.message === 'string'
      ? firstError.message
      : 'Complete the required product fields before saving.'
    setServerError(message)
    toast({
      title: 'Check the product form',
      description: message,
      type: 'error',
    })
  }

  const formatProductError = (error: unknown): string => {
    const candidate = (error && typeof error === 'object' ? error : {}) as {
      message?: unknown
      errors?: Record<string, unknown>
    }
    const message = typeof candidate.message === 'string' && candidate.message.trim()
      ? candidate.message.trim()
      : 'Failed to update product.'
    const details = Object.entries(candidate.errors || {})
      .flatMap(([field, value]) => {
        const values = Array.isArray(value) ? value : [value]
        return values
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => `${field}: ${item}`)
      })

    return details.length > 0 ? `${message} ${details.join(' ')}` : message
  }

  const onSubmit = async (data: ProductEditFormData) => {
    if (!id) return

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
      let formattedVariants = undefined
      if (data.product_type === 'variable') {
        if (variantsList.length === 0) {
          throw new Error('Please add at least one variant for variable products.')
        }

        formattedVariants = variantsList.map((v) => {
          const attrVals: Array<{ attribute_id: number; option_id?: number; custom_value?: string }> = []

          Object.entries(v.option_values).forEach(([code, val]) => {
            const matchedAttr = categoryAttributes.find((a) => a.code === code)
            if (matchedAttr) {
              const matchedOpt = matchedAttr.options?.find(
                (o) => o.id.toString() === val || o.value === val
              )
              attrVals.push({
                attribute_id: matchedAttr.id,
                option_id: matchedOpt ? matchedOpt.id : undefined,
                custom_value: matchedOpt ? undefined : val,
              })
            }
          })

          return {
            id: typeof v.id === 'number' ? v.id : undefined,
            sku: v.sku.toUpperCase().trim(),
            name: v.name.trim(),
            selling_price: Number(v.selling_price),
            cost_price: v.cost_price ? Number(v.cost_price) : undefined,
            stock_quantity: Number(v.stock_quantity || 0),
            is_active: v.is_active,
            attribute_values: attrVals,
          }
        })
      }

      const finalCover = data.image_url?.trim() || (galleryUrls.length > 0 ? galleryUrls[0] : undefined)
      const combinedGallery = Array.from(
        new Set([...(finalCover ? [finalCover] : []), ...galleryUrls])
      )

      const updated = await productService.updateProduct(id, {
        name: data.name.trim(),
        brand: data.brand?.trim() || undefined,
        sku: data.sku.toUpperCase().trim(),
        product_type: data.product_type,
        description: data.description?.trim(),
        selling_price: Number(data.selling_price),
        discount_price: data.discount_price !== undefined && data.discount_price !== null && Number(data.discount_price) > 0 ? Number(data.discount_price) : null,
        cost_price: data.cost_price ? Number(data.cost_price) : undefined,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        low_stock_threshold: Number(data.low_stock_threshold || 5),
        weight: data.weight ? Number(data.weight) : undefined,
        status: data.status,
        image_url: finalCover,
        gallery_urls: combinedGallery,
        attributes: formattedAttributes as any,
        variants: formattedVariants as any,
      })

      toast({
        title: 'Product Updated',
        description: `Product "${updated.name}" has been successfully updated.`,
        type: 'success',
      })

      navigate('/admin/products')
    } catch (err: unknown) {
      const message = formatProductError(err)
      setServerError(message)
      toast({
        title: 'Update Failed',
        description: message,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        roleTitle="Product Management"
        roleSlug="admin"
        roleColor="text-purple-500"
        navItems={adminNavItems}
      >
        <div className="flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="mt-2">Loading product specifications & attributes...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      roleTitle="Product Management"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/products">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Edit Product</h1>
                {product && (
                  <>
                    <Badge variant="outline" className="font-mono text-xs">
                      ID: {product.id}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs font-semibold">
                      {product.product_type}
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Update universal catalog specifications, dynamic category attributes, and variant SKUs.
              </p>
            </div>
          </div>

          {/* Quick link to inventory history */}
          {product && (
            <Link to={`/admin/inventory/${product.id}/history`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Boxes className="w-4 h-4" />
                Audit Stock Movements
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>
          )}
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
                Universal Product Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Basic descriptive fields, brand identity, and department classification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-foreground">
                    Product Title <span className="text-destructive">*</span>
                  </label>
                  <Input {...register('name')} className="h-9 text-xs" />
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
                    Stock Keeping Unit (SKU) <span className="text-destructive">*</span>
                  </label>
                  <Input {...register('sku')} className="h-9 text-xs font-mono uppercase" />
                  {errors.sku && (
                    <p className="text-destructive text-[11px]">{errors.sku.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Product Type</label>
                  <select
                    {...register('product_type')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="simple">Simple (Single SKU)</option>
                    <option value="variable">Variable (Multi-Variant: Size, Color)</option>
                    <option value="digital">Digital (Downloadable / License)</option>
                    <option value="bundle">Bundle (Multi-Pack)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Marketplace Category</label>
                  <select
                    {...register('category_id')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    <option value="">Select a department...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_name ? `${c.parent_name} → ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
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
                    {errors.image_url && (
                      <p className="text-destructive text-[11px]">{errors.image_url.message}</p>
                    )}
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
                  <label className="font-semibold text-foreground text-xs">Status</label>
                  <select
                    {...register('status')}
                    className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Category Specifications */}
          {categoryAttributes.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <SlidersHorizontal className="w-4 h-4" />
                  Category Specific Attributes & Specifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Specifications dynamically configured for this marketplace department.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAttributes.map((attr) => (
                    <div key={attr.id} className="space-y-1.5">
                      <label className="font-semibold text-foreground flex items-center justify-between">
                        <span>
                          {attr.name}
                          {attr.is_required && <span className="text-destructive ml-1">*</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">
                          {attr.code}
                        </span>
                      </label>

                      {attr.type === 'select' && attr.options && attr.options.length > 0 ? (
                        <select
                          value={attributeFormValues[attr.code] || ''}
                          onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select {attr.name}...</option>
                          {attr.options.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label || opt.value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={attr.type === 'number' ? 'number' : 'text'}
                          value={attributeFormValues[attr.code] || ''}
                          onChange={(e) => handleAttributeValueChange(attr.code, e.target.value)}
                          placeholder={`Enter ${attr.name.toLowerCase()}...`}
                          className="h-9 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing & Customer Economics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Base Pricing & Customer Offers
                </span>
                {customerEffectivePrice <= 30 && customerEffectivePrice > 0 && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                    <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                    100-Pt Free Gift Eligible (≤$30)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Manage the regular catalog price and promotional customer sale price.
              </CardDescription>
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
                    {...register('cost_price')}
                    className="h-9 text-xs font-mono"
                  />
                  {errors.cost_price && (
                    <p className="text-destructive text-[11px]">{errors.cost_price.message}</p>
                  )}
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
            <Card className="border-indigo-200 dark:border-indigo-900/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Layers className="w-4 h-4" />
                    Multi-SKU Product Variants
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Each variant holds a globally unique SKU with dedicated real-time inventory tracking.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  className="gap-1.5 text-xs text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Variant SKU
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {variantsList.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No product variants configured yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Click the button above to add variant options (e.g., Size, Color, Capacity).
                    </p>
                  </div>
                ) : (
                  <div className="dashboard-table-scroll border rounded-xl">
                    <table className="dashboard-data-table w-full text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Variant SKU</th>
                          <th className="p-2.5">Option Title</th>
                          {categoryAttributes
                            .filter((a) => a.is_variant_option)
                            .map((a) => (
                              <th key={a.id} className="p-2.5">
                                {a.name}
                              </th>
                            ))}
                          <th className="p-2.5">Price ($)</th>
                          <th className="p-2.5">Stock Qty</th>
                          <th className="p-2.5 text-center">Active</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variantsList.map((variant, vIdx) => (
                          <tr key={variant.id ? `v-${variant.id}` : `idx-${vIdx}`} className="hover:bg-muted/20">
                            <td className="p-2.5">
                              <Input
                                value={variant.sku}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'sku', e.target.value.toUpperCase())
                                }
                                className="h-8 text-xs font-mono uppercase w-32"
                              />
                            </td>
                            <td className="p-2.5">
                              <Input
                                value={variant.name}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'name', e.target.value)
                                }
                                placeholder="e.g. Navy Blue / Medium"
                                className="h-8 text-xs w-36"
                              />
                            </td>
                            {categoryAttributes
                              .filter((a) => a.is_variant_option)
                              .map((attr) => (
                                <td key={attr.id} className="p-2.5">
                                  {attr.options && attr.options.length > 0 ? (
                                    <select
                                      value={variant.option_values[attr.code] || ''}
                                      onChange={(e) =>
                                        handleUpdateVariantOption(vIdx, attr.code, e.target.value)
                                      }
                                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                      <option value="">Select...</option>
                                      {attr.options.map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.label || o.value}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      value={variant.option_values[attr.code] || ''}
                                      onChange={(e) =>
                                        handleUpdateVariantOption(vIdx, attr.code, e.target.value)
                                      }
                                      placeholder="Value..."
                                      className="h-8 text-xs w-20"
                                    />
                                  )}
                                </td>
                              ))}
                            <td className="p-2.5">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.selling_price}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'selling_price', Number(e.target.value))
                                }
                                className="h-8 text-xs font-mono w-24"
                              />
                            </td>
                            <td className="p-2.5">
                              <Input
                                type="number"
                                min="0"
                                value={variant.stock_quantity}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'stock_quantity', Number(e.target.value))
                                }
                                className="h-8 text-xs font-mono w-20"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={variant.is_active}
                                onChange={(e) =>
                                  handleUpdateVariantField(vIdx, 'is_active', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveVariant(vIdx)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Inventory & Shipping Threshold */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Inventory & Logistics Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Low Stock Alert Threshold</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...register('low_stock_threshold')}
                    className="h-9 text-xs font-mono"
                  />
                  {errors.low_stock_threshold && (
                    <p className="text-destructive text-[11px]">
                      {errors.low_stock_threshold.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Shipping Weight (kg)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('weight')}
                    placeholder="e.g. 0.45"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                {product && (
                  <div className="p-3 bg-muted/40 rounded-lg border text-xs">
                    <span className="text-muted-foreground block text-[11px]">
                      Catalog Stock Status:
                    </span>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {product.stock_quantity} total units ({product.available_stock} available)
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
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
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
