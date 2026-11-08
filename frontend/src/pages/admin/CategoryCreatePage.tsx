import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FolderTree,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types/category.types'

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(255),
  slug: z.string().optional(),
  parent_id: z.coerce.number().optional().nullable(),
  icon: z.string().optional(),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

export function CategoryCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const defaultParentId = searchParams.get('parent_id')
    ? parseInt(searchParams.get('parent_id')!, 10)
    : undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      parent_id: defaultParentId,
      sort_order: 0,
      is_active: true,
      icon: 'Package',
    },
  })

  useEffect(() => {
    categoryService
      .getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]))
  }, [])

  const onSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const created = await categoryService.createCategory({
        name: data.name.trim(),
        slug: data.slug?.trim() || undefined,
        parent_id: data.parent_id || null,
        icon: data.icon?.trim() || 'Package',
        image_url: data.image_url?.trim() || undefined,
        description: data.description?.trim(),
        sort_order: Number(data.sort_order || 0),
        is_active: Boolean(data.is_active),
        seo_title: data.seo_title?.trim(),
        seo_description: data.seo_description?.trim(),
        seo_keywords: data.seo_keywords?.trim(),
      })

      toast({
        title: 'Category Created',
        description: `Category "${created.name}" is now live in the marketplace catalog.`,
        type: 'success',
      })

      navigate('/admin/categories')
    } catch (err: any) {
      const message = err?.message || 'Failed to create category.'
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
      roleTitle="Category & Attribute Control"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/admin/categories">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-purple-600" />
              Create Category or Subcategory
            </h1>
            <p className="text-xs text-muted-foreground">
              Define a new product department with hierarchical placement and SEO rules.
            </p>
          </div>
        </div>

        {serverError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
          {/* General Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Department Identification & Hierarchy
              </CardTitle>
              <CardDescription className="text-xs">
                Parent category relationship and visual icons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Category Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="e.g. Ergonomic Office Chairs"
                    className="h-9 text-xs"
                  />
                  {errors.name && (
                    <p className="text-destructive text-[11px]">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Parent Category (Hierarchy Level)
                  </label>
                  <select
                    {...register('parent_id')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">(None - Top-level Root Department)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_id ? `— ${c.name} (Subcategory of ${c.parent_name ?? 'Parent'})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">URL Slug (Optional)</label>
                  <Input
                    {...register('slug')}
                    placeholder="e.g. ergonomic-office-chairs"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Icon Identifier</label>
                  <Input
                    {...register('icon')}
                    placeholder="e.g. Armchair, Shirt, Laptop"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Sort Display Order</label>
                  <Input
                    type="number"
                    {...register('sort_order')}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Department Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Catalog description explaining what items belong in this department..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Banner / Image URL</label>
                <Input
                  {...register('image_url')}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <label htmlFor="is_active" className="text-xs font-semibold cursor-pointer select-none">
                  Active (Visible on marketplace navigation menu)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SEO Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Search Engine Optimization (SEO)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">SEO Title</label>
                <Input
                  {...register('seo_title')}
                  placeholder="e.g. Buy Ergonomic Office Chairs Online | MegaCommerce"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Meta Description</label>
                <Input
                  {...register('seo_description')}
                  placeholder="e.g. Shop the highest rated mesh, lumbar support, and leather office chairs..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Keywords</label>
                <Input
                  {...register('seo_keywords')}
                  placeholder="e.g. office chairs, ergonomic, lumbar support, desk furniture"
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin/categories">
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
                  Creating Category...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Create Category
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

