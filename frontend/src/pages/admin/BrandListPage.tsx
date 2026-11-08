import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Package,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Sparkles,
  X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { brandService } from '@/services/brand.service'
import { mediaService } from '@/services/media.service'
import type { Brand, BrandFormData } from '@/types/brand.types'

export function BrandListPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false)

  // Form Fields
  const [formName, setFormName] = useState<string>('')
  const [formKhmerName, setFormKhmerName] = useState<string>('')
  const [formSlug, setFormSlug] = useState<string>('')
  const [formLogoUrl, setFormLogoUrl] = useState<string>('')
  const [formDescription, setFormDescription] = useState<string>('')
  const [formKhmerDesc, setFormKhmerDesc] = useState<string>('')
  const [formCountry, setFormCountry] = useState<string>('')
  const [formWebsite, setFormWebsite] = useState<string>('')
  const [formIsActive, setFormIsActive] = useState<boolean>(true)
  const [formSortOrder, setFormSortOrder] = useState<number>(0)

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await brandService.getBrands({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        per_page: 100,
      })
      setBrands(res.data || [])
    } catch (err: any) {
      toast({
        title: 'Error loading brands',
        description: err.message || 'Could not fetch brands registry.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBrands()
  }

  const openCreateModal = () => {
    setEditingBrand(null)
    setFormName('')
    setFormKhmerName('')
    setFormSlug('')
    setFormLogoUrl('')
    setFormDescription('')
    setFormKhmerDesc('')
    setFormCountry('Cambodia')
    setFormWebsite('')
    setFormIsActive(true)
    setFormSortOrder(0)
    setIsModalOpen(true)
  }

  const openEditModal = (b: Brand) => {
    setEditingBrand(b)
    setFormName(b.name)
    const kmTr = b.translations?.find((t) => t.locale === 'km')
    setFormKhmerName(kmTr ? kmTr.name : '')
    setFormSlug(b.slug)
    setFormLogoUrl(b.logo_url || '')
    setFormDescription(b.description || '')
    setFormKhmerDesc(kmTr?.description || '')
    setFormCountry(b.country || '')
    setFormWebsite(b.website || '')
    setFormIsActive(b.is_active)
    setFormSortOrder(b.sort_order || 0)
    setIsModalOpen(true)
  }

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast({ title: 'Validation Error', description: 'Brand name is required.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const translations: any[] = []
      if (formName.trim()) {
        translations.push({
          locale: 'en',
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        })
      }
      if (formKhmerName.trim()) {
        translations.push({
          locale: 'km',
          name: formKhmerName.trim(),
          description: formKhmerDesc.trim() || undefined,
        })
      }

      const payload: BrandFormData = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        logo_url: formLogoUrl.trim() || undefined,
        description: formDescription.trim() || undefined,
        country: formCountry.trim() || undefined,
        website: formWebsite.trim() || undefined,
        is_active: formIsActive,
        status: formIsActive ? 'active' : 'inactive',
        sort_order: formSortOrder,
        translations,
      }

      if (editingBrand) {
        await brandService.updateBrand(editingBrand.id, payload)
        toast({ title: 'Brand Updated', description: `Successfully updated ${formName}.`, type: 'success' })
      } else {
        await brandService.createBrand(payload)
        toast({ title: 'Brand Created', description: `Successfully registered ${formName}.`, type: 'success' })
      }

      setIsModalOpen(false)
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Unable to save brand record.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async (b: Brand) => {
    if (!window.confirm(`Are you sure you want to safely archive brand "${b.name}"?`)) {
      return
    }

    try {
      await brandService.archiveBrand(b.id)
      toast({
        title: 'Brand Archived',
        description: `${b.name} has been archived. Existing products remain intact.`,
        type: 'success',
      })
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Archive Failed',
        description: err.message || 'Could not archive brand.',
        type: 'error',
      })
    }
  }

  // Summary Metrics
  const totalBrands = brands.length
  const activeCount = brands.filter((b) => b.is_active).length
  const totalBrandedProducts = brands.reduce((acc, b) => acc + (b.products_count || 0), 0)
  const uniqueCountries = Array.from(new Set(brands.map((b) => b.country).filter(Boolean))).length

  return (
    <DashboardLayout
      roleTitle="Brand Management"
      roleSlug="admin"
      roleColor="text-indigo-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Registered Brands</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalBrands}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Brands</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Branded Products</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalBrandedProducts}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Origin Countries</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{uniqueCountries}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Globe className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by brand name, slug, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  statusFilter === 'active'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Active Only
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('archived')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  statusFilter === 'archived'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Archived
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchBrands} disabled={loading} className="h-10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button onClick={openCreateModal} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Brand
            </Button>
          </div>
        </div>

        {/* Brands Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm text-slate-500">Loading brands registry...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No Brands Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Get started by adding verified manufacturers, designer labels, and trademarked suppliers.
            </p>
            <Button onClick={openCreateModal} className="bg-indigo-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Register First Brand
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {brands.map((brand) => {
              const kmTranslation = brand.translations?.find((t) => t.locale === 'km')

              return (
                <Card
                  key={brand.id}
                  className={`border transition duration-200 hover:shadow-md ${
                    brand.is_active
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-950'
                  }`}
                >
                  <CardContent className="p-5 flex flex-col h-full justify-between">
                    <div>
                      {/* Logo and Status Row */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shadow-sm">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <Award className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {brand.is_active ? (
                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Brand Info */}
                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {brand.name}
                      </h4>
                      {kmTranslation?.name && (
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                          🇰🇭 {kmTranslation.name}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        {brand.country && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            {brand.country}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono text-slate-400">/{brand.slug}</span>
                      </div>

                      {brand.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                          {brand.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <Link
                        to={`/admin/products?search=${encodeURIComponent(brand.name)}`}
                        className="flex items-center text-xs font-medium text-slate-600 hover:text-indigo-600 transition"
                      >
                        <Package className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        <span>{brand.products_count || 0} Products</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Visit Official Website"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(brand)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit Brand"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {brand.is_active && (
                          <button
                            type="button"
                            onClick={() => handleArchive(brand)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            title="Archive Brand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal: Create & Edit Brand */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingBrand ? 'Edit Brand Details' : 'Register New Brand'}
                    </h3>
                    <p className="text-xs text-slate-500">Bilingual brand registration with trademark metadata.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveBrand} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Brand Name (English) *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. MegaBasics"
                      value={formName}
                      onChange={(e) => {
                        setFormName(e.target.value)
                        if (!editingBrand && !formSlug) {
                          setFormSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)+/g, '')
                          )
                        }
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Khmer Name (🇰🇭 ឈ្មោះជាភាសាខ្មែរ)
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. មេហ្គាបេសិក"
                      value={formKhmerName}
                      onChange={(e) => setFormKhmerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      URL Slug
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. megabasics"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Country of Origin
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Cambodia, Japan, France"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Logo Image URL or Permanent Cloud S3 Upload
                    </label>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
                      <span>{uploadingLogo ? 'Uploading to Cloud S3...' : '☁️ Upload Logo to S3'}</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingLogo(true)
                          try {
                            const uploaded = await mediaService.uploadMedia(file, 'brands')
                            setFormLogoUrl(uploaded.url)
                            toast({
                              title: 'Uploaded to Cloud Storage ☁️',
                              description: 'Brand logo stored permanently in S3 (never deleted on server updates).',
                              type: 'success',
                            })
                          } catch (err: any) {
                            toast({
                              title: 'Cloud Upload Failed',
                              description: err?.message || 'Could not upload logo.',
                              type: 'error',
                            })
                          } finally {
                            setUploadingLogo(false)
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="url"
                      placeholder="https://.../brand-logo.png"
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                      className="flex-1"
                    />
                    {formLogoUrl && (
                      <div className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 flex items-center justify-center p-1">
                        <img
                          src={formLogoUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Website
                  </label>
                  <Input
                    type="url"
                    placeholder="https://brand-domain.com"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    English Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brand story, positioning, and manufacturing standards..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Khmer Description (🇰🇭 ការពិពណ៌នាជាភាសាខ្មែរ)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ប្រវត្តិម៉ាកសញ្ញា និងគុណភាពផលិតផល..."
                    value={formKhmerDesc}
                    onChange={(e) => setFormKhmerDesc(e.target.value)}
                    className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Display Sort Order
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="brandIsActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <label htmlFor="brandIsActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Active on Marketplace
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white hover:bg-indigo-700">
                    {submitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
