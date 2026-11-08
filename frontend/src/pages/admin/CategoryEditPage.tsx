import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  SlidersHorizontal,
  Plus,
  Trash2,
  Tag,
  RefreshCw,
  X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { categoryService } from '@/services/category.service'
import type { Category, CategoryAttribute, AttributeType } from '@/types/category.types'

const categoryEditSchema = z.object({
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

type CategoryEditFormData = z.infer<typeof categoryEditSchema>

export function CategoryEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [category, setCategory] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Attribute Modal State
  const [isAttrModalOpen, setIsAttrModalOpen] = useState<boolean>(false)
  const [attrName, setAttrName] = useState<string>('')
  const [attrCode, setAttrCode] = useState<string>('')
  const [attrType, setAttrType] = useState<AttributeType>('text')
  const [attrRequired, setAttrRequired] = useState<boolean>(false)
  const [attrFilterable, setAttrFilterable] = useState<boolean>(true)
  const [attrVariantOption, setAttrVariantOption] = useState<boolean>(false)
  const [optionInput, setOptionInput] = useState<string>('')
  const [optionsList, setOptionsList] = useState<string[]>([])
  const [isSavingAttr, setIsSavingAttr] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryEditFormData>({
    resolver: zodResolver(categoryEditSchema) as any,
  })

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [catData, allCats] = await Promise.all([
        categoryService.getCategory(id),
        categoryService.getCategories(),
      ])
      setCategory(catData)
      setAttributes(catData.attributes || [])
      setAllCategories(allCats)
      reset({
        name: catData.name,
        slug: catData.slug,
        parent_id: catData.parent_id,
        icon: catData.icon || 'Package',
        image_url: catData.image_url || '',
        description: catData.description || '',
        sort_order: catData.sort_order,
        is_active: catData.is_active,
        seo_title: catData.seo_title || '',
        seo_description: catData.seo_description || '',
        seo_keywords: catData.seo_keywords || '',
      })
    } catch (err: any) {
      setServerError(err?.message || 'Failed to fetch category details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const onSubmit = async (data: CategoryEditFormData) => {
    if (!id) return
    setIsSubmitting(true)
    setServerError(null)

    try {
      const updated = await categoryService.updateCategory(id, {
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
        title: 'Category Updated',
        description: `Changes to "${updated.name}" saved successfully.`,
        type: 'success',
      })

      navigate('/admin/categories')
    } catch (err: any) {
      const message = err?.message || 'Failed to update category.'
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

  const handleAddOption = () => {
    const val = optionInput.trim()
    if (!val || optionsList.includes(val)) return
    setOptionsList((prev) => [...prev, val])
    setOptionInput('')
  }

  const handleRemoveOption = (val: string) => {
    setOptionsList((prev) => prev.filter((o) => o !== val))
  }

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !attrName.trim()) return

    setIsSavingAttr(true)
    try {
      const payload = {
        name: attrName.trim(),
        code: attrCode.trim() || undefined,
        type: attrType,
        is_required: attrRequired,
        is_filterable: attrFilterable,
        is_variant_option: attrVariantOption,
        options: optionsList.map((opt, i) => ({
          value: opt,
          label: opt,
          sort_order: i + 1,
        })),
      }

      await categoryService.addAttribute(id, payload)
      toast({
        title: 'Attribute Created',
        description: `Attribute "${attrName}" added to category.`,
        type: 'success',
      })

      // Reset modal state
      setAttrName('')
      setAttrCode('')
      setAttrType('text')
      setAttrRequired(false)
      setAttrFilterable(true)
      setAttrVariantOption(false)
      setOptionsList([])
      setIsAttrModalOpen(false)

      // Refresh attributes
      const refreshed = await categoryService.getCategoryAttributes(id)
      setAttributes(refreshed)
    } catch (err: any) {
      toast({
        title: 'Failed to add attribute',
        description: err?.message || 'Could not save category attribute.',
        type: 'error',
      })
    } finally {
      setIsSavingAttr(false)
    }
  }

  const handleDeleteAttribute = async (attr: CategoryAttribute) => {
    if (!window.confirm(`Delete attribute "${attr.name}"? Products using this attribute will have this field unlinked.`)) {
      return
    }

    try {
      await categoryService.deleteAttribute(attr.id)
      toast({
        title: 'Attribute Removed',
        description: `Attribute "${attr.name}" was deleted.`,
        type: 'success',
      })
      setAttributes((prev) => prev.filter((a) => a.id !== attr.id))
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err?.message || 'Could not delete attribute.',
        type: 'error',
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout
        roleTitle="Category & Attribute Control"
        roleSlug="admin"
        roleColor="text-purple-500"
        navItems={adminNavItems}
      >
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading category information...
        </div>
      </DashboardLayout>
    )
  }

  // Filter out self from parent options to avoid obvious self-parent loop
  const validParentOptions = allCategories.filter((c) => c.id !== Number(id))

  return (
    <DashboardLayout
      roleTitle="Category & Attribute Control"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/categories">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Edit Category</h1>
                {category && (
                  <Badge variant="outline" className="font-mono text-xs">
                    ID: {category.id}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Manage department hierarchy and configure dynamic product specification attributes.
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
          {/* General Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Department Identification & Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">
                    Category Name <span className="text-destructive">*</span>
                  </label>
                  <Input {...register('name')} className="h-9 text-xs" />
                  {errors.name && (
                    <p className="text-destructive text-[11px]">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Parent Category</label>
                  <select
                    {...register('parent_id')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">(None - Top-level Root Department)</option>
                    {validParentOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_id ? `— ${c.name} (Subcategory of ${c.parent_name ?? 'Parent'})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">URL Slug</label>
                  <Input {...register('slug')} className="h-9 text-xs font-mono" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Icon Identifier</label>
                  <Input {...register('icon')} className="h-9 text-xs" />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Sort Display Order</label>
                  <Input type="number" {...register('sort_order')} className="h-9 text-xs font-mono" />
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

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Banner / Image URL</label>
                <Input {...register('image_url')} className="h-9 text-xs" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_edit"
                  {...register('is_active')}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <label htmlFor="is_active_edit" className="text-xs font-semibold cursor-pointer select-none">
                  Active in storefront navigation menu
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Category Attributes Section */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                  Configurable Product Attributes
                </CardTitle>
                <CardDescription className="text-xs">
                  Specifications, variant options, and search filter rules defined for items in this category.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={() => setIsAttrModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Attribute
              </Button>
            </CardHeader>
            <CardContent>
              {attributes.length === 0 ? (
                <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground text-xs">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No custom attributes configured for this category yet.
                  <br />
                  Add attributes like Size, Color, RAM, Material, or Author to capture structured product specifications.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5">Attribute Name</th>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Input Type</th>
                        <th className="p-2.5">Options / Values</th>
                        <th className="p-2.5 text-center">Required</th>
                        <th className="p-2.5 text-center">Variant Option</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attributes.map((attr) => (
                        <tr key={attr.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-bold text-foreground">{attr.name}</td>
                          <td className="p-2.5 font-mono text-muted-foreground">{attr.code}</td>
                          <td className="p-2.5 uppercase text-[10px] text-muted-foreground font-semibold">
                            {attr.type}
                          </td>
                          <td className="p-2.5">
                            {attr.options && attr.options.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {attr.options.map((opt) => (
                                  <Badge
                                    key={opt.id}
                                    variant="secondary"
                                    className="text-[9px] py-0 px-1 font-mono"
                                  >
                                    {opt.label}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Free text</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {attr.is_required ? (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px]">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">No</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {attr.is_variant_option ? (
                              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[9px]">
                                Variant
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Specification</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAttribute(attr)}
                              title="Delete Attribute"
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

          {/* SEO Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                SEO Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">SEO Title</label>
                <Input {...register('seo_title')} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Meta Description</label>
                <Input {...register('seo_description')} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Keywords</label>
                <Input {...register('seo_keywords')} className="h-9 text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
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

      {/* Add Attribute Modal */}
      <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              Add Category Product Attribute
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a dynamic attribute for all items classified under {category?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAttribute} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Attribute Label <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Size, Color, RAM, Material, Author"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Attribute Code (Key)</label>
                <Input
                  placeholder="e.g. size, ram, author"
                  value={attrCode}
                  onChange={(e) => setAttrCode(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Input Field Type</label>
                <select
                  value={attrType}
                  onChange={(e) => setAttrType(e.target.value as AttributeType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="text">Text Input</option>
                  <option value="number">Numeric</option>
                  <option value="select">Single Select (Options)</option>
                  <option value="multiselect">Multi-Select (Options)</option>
                  <option value="boolean">Yes / No (Boolean)</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>

            {/* If select or multiselect, allow adding predefined options */}
            {(attrType === 'select' || attrType === 'multiselect') && (
              <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
                <label className="font-semibold text-foreground block">
                  Predefined Option Choices
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. XL, 16GB, Cotton"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="h-8 text-xs"
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {optionsList.map((opt) => (
                    <Badge
                      key={opt}
                      variant="secondary"
                      className="gap-1 text-xs py-0.5 px-2 bg-background border"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1 border-t">
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={attrRequired}
                  onChange={(e) => setAttrRequired(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <span>Required field when creating products in this category</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={attrFilterable}
                  onChange={(e) => setAttrFilterable(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <span>Include in marketplace faceted search filters</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={attrVariantOption}
                  onChange={(e) => setAttrVariantOption(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <span>Can be used to generate distinct product variants (SKUs)</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAttrModalOpen(false)}
                disabled={isSavingAttr}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingAttr || !attrName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                {isSavingAttr ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Attribute'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

