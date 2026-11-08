import React, { useState, useEffect } from 'react'
import {
  Sliders,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Sparkles,
  MousePointerClick,
  X,
  Play,
  UploadCloud,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { bannerService, type Banner, type CreateBannerPayload } from '@/services/banner.service'
import { mediaService } from '@/services/media.service'

export function BannerListPage() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [placementFilter, setPlacementFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Preview State
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form Fields
  const [formTitle, setFormTitle] = useState('')
  const [formSubtitle, setFormSubtitle] = useState('')
  const [formBadgeText, setFormBadgeText] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formVideoUrl, setFormVideoUrl] = useState('')
  const [formLinkUrl, setFormLinkUrl] = useState('/products')
  const [formButtonText, setFormButtonText] = useState('Explore Catalog')
  const [formBackgroundStyle, setFormBackgroundStyle] = useState('gradient-primary')
  const [formPlacement, setFormPlacement] = useState('hero')
  const [formSortOrder, setFormSortOrder] = useState(1)
  const [formIsActive, setFormIsActive] = useState(true)

  // Cloud Upload State
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (type === 'image') setUploadingImage(true)
    else setUploadingVideo(true)

    try {
      const res = await mediaService.uploadMedia(file, type === 'image' ? 'banners' : 'videos')
      if (type === 'image') {
        setFormImageUrl(res.url)
      } else {
        setFormVideoUrl(res.url)
      }
      toast({
        title: 'Cloud Upload Succeeded',
        description: `Uploaded ${file.name} to Cloud Storage (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Cloud Upload Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      if (type === 'image') setUploadingImage(false)
      else setUploadingVideo(false)
    }
  }

  const fetchBanners = async () => {
    setLoading(true)
    try {
      const res = await bannerService.getAdminBanners({
        search: search || undefined,
        placement: placementFilter !== 'all' ? placementFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      if (res.data) {
        setBanners(res.data)
        if (res.data.length > 0 && !previewBanner) {
          setPreviewBanner(res.data[0])
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error loading banners',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [placementFilter, statusFilter])

  const openCreateModal = () => {
    setEditingBanner(null)
    setFormTitle('')
    setFormSubtitle('')
    setFormBadgeText('')
    setFormImageUrl('/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg')
    setFormVideoUrl('')
    setFormLinkUrl('/products')
    setFormButtonText('Explore Catalog')
    setFormBackgroundStyle('gradient-primary')
    setFormPlacement('hero')
    setFormSortOrder(banners.length + 1)
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner)
    setFormTitle(banner.title)
    setFormSubtitle(banner.subtitle || '')
    setFormBadgeText(banner.badge_text || '')
    setFormImageUrl(banner.image_url || '')
    setFormVideoUrl(banner.video_url || '')
    setFormLinkUrl(banner.link_url || '/products')
    setFormButtonText(banner.button_text || 'Explore Catalog')
    setFormBackgroundStyle(banner.background_style || 'gradient-primary')
    setFormPlacement(banner.placement || 'hero')
    setFormSortOrder(banner.sort_order)
    setFormIsActive(banner.is_active)
    setIsModalOpen(true)
  }

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Title is required', type: 'error' })
      return
    }

    setFormLoading(true)
    const payload: CreateBannerPayload = {
      title: formTitle.trim(),
      subtitle: formSubtitle.trim() || null,
      badge_text: formBadgeText.trim() || null,
      image_url: formImageUrl.trim() || null,
      video_url: formVideoUrl.trim() || null,
      link_url: formLinkUrl.trim() || null,
      button_text: formButtonText.trim() || 'Explore Catalog',
      background_style: formBackgroundStyle,
      placement: formPlacement,
      sort_order: Number(formSortOrder),
      is_active: formIsActive,
    }

    try {
      if (editingBanner) {
        const res = await bannerService.updateBanner(editingBanner.id, payload)
        toast({ title: 'Banner Updated', description: `"${res.data?.title}" updated.`, type: 'success' })
      } else {
        const res = await bannerService.createBanner(payload)
        toast({ title: 'Banner Created', description: `"${res.data?.title}" created.`, type: 'success' })
      }
      setIsModalOpen(false)
      fetchBanners()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      const res = await bannerService.toggleBannerActive(banner.id)
      toast({
        title: 'Status Updated',
        description: `Banner is now ${res.data?.is_active ? 'Active' : 'Inactive'}.`,
        type: 'info',
      })
      fetchBanners()
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err.message, type: 'error' })
    }
  }

  const handleDeleteBanner = async (banner: Banner) => {
    if (!confirm(`Are you sure you want to permanently delete slide banner "${banner.title}"?`)) return

    try {
      await bannerService.deleteBanner(banner.id)
      toast({ title: 'Banner Deleted', description: `"${banner.title}" deleted.`, type: 'info' })
      if (previewBanner?.id === banner.id) {
        setPreviewBanner(null)
      }
      fetchBanners()
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, type: 'error' })
    }
  }

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const current = banners[index]
    const target = banners[targetIndex]

    const items = [
      { id: current.id, sort_order: target.sort_order },
      { id: target.id, sort_order: current.sort_order },
    ]

    try {
      await bannerService.reorderBanners(items)
      fetchBanners()
    } catch (err: any) {
      toast({ title: 'Reorder Failed', description: err.message, type: 'error' })
    }
  }

  return (
    <DashboardLayout
      roleTitle="Admin Banner Management"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sliders className="w-6 h-6 text-purple-500" />
              Slide Banner & Hero Carousel Manager
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control the storefront hero banner slides, headlines, promotional badges, CTA links, and media assets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchBanners} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Add Slide Banner
            </Button>
          </div>
        </div>

        {/* Live Preview Card */}
        {previewBanner && (
          <Card className="border-purple-500/30 overflow-hidden shadow-lg bg-gradient-to-r from-purple-500/5 via-transparent to-primary/5">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Eye className="w-4 h-4 text-purple-500" />
                  Live Storefront Preview: "{previewBanner.title}"
                </CardTitle>
                <CardDescription className="text-xs">
                  This preview renders the banner using exact storefront typography and aspect ratio.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={previewBanner.is_active ? 'outline' : 'secondary'} className="text-[10px]">
                  {previewBanner.is_active ? 'Active on Storefront' : 'Draft / Inactive'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(previewBanner)}
                  className="h-7 text-xs gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 space-y-3">
                  {previewBanner.badge_text && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      <Sparkles className="w-3 h-3" />
                      <span>{previewBanner.badge_text}</span>
                    </div>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    {previewBanner.title}
                  </h2>
                  {previewBanner.subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {previewBanner.subtitle}
                    </p>
                  )}
                  <div className="pt-2 flex items-center gap-3">
                    <Button size="sm" className="rounded-full gap-1.5 text-xs font-semibold">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {previewBanner.button_text || 'Explore Catalog'}
                    </Button>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      Target Link: <code className="text-foreground">{previewBanner.link_url}</code>
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-md border border-border/50">
                    {previewBanner.video_url ? (
                      <video
                        src={mediaService.resolveMediaUrl(previewBanner.video_url)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : previewBanner.image_url ? (
                      <img
                        src={mediaService.resolveMediaUrl(previewBanner.image_url)}
                        alt={previewBanner.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/40">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-background/80 backdrop-blur-md border text-[10px] flex items-center justify-between">
                      <span className="font-bold">TYUSHOP Official</span>
                      <span className="text-muted-foreground">{previewBanner.placement.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search banners..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchBanners()}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={fetchBanners} className="text-xs">
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="text-xs p-1.5 border rounded-lg bg-background text-foreground"
            >
              <option value="all">All Placements</option>
              <option value="hero">Hero Slider</option>
              <option value="promo">Promotional</option>
              <option value="category">Category</option>
              <option value="sidebar">Sidebar</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 border rounded-lg bg-background text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Banners Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Registered Slide Banners ({banners.length})</CardTitle>
            <CardDescription className="text-xs">
              Banners are displayed on the storefront in ascending order of Sort Order.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">Order</th>
                    <th className="py-2.5 px-4 w-16">Preview</th>
                    <th className="py-2.5 px-4">Banner Details</th>
                    <th className="py-2.5 px-4">Placement</th>
                    <th className="py-2.5 px-4">Clicks</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                        Loading slide banners...
                      </td>
                    </tr>
                  ) : banners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No slide banners found. Click <strong>Add Slide Banner</strong> to create one.
                      </td>
                    </tr>
                  ) : (
                    banners.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          previewBanner?.id === b.id ? 'bg-purple-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-foreground">#{b.sort_order}</span>
                            <div className="flex items-center gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveOrder(idx, 'up')}
                                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                disabled={idx === banners.length - 1}
                                onClick={() => handleMoveOrder(idx, 'down')}
                                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div
                            onClick={() => setPreviewBanner(b)}
                            className="w-14 h-10 rounded-lg overflow-hidden bg-slate-950 border cursor-pointer hover:ring-2 hover:ring-primary transition-all relative"
                          >
                            {b.video_url ? (
                              <div className="w-full h-full flex items-center justify-center bg-purple-900/40 text-purple-300">
                                <Play className="w-4 h-4" />
                              </div>
                            ) : b.image_url ? (
                              <img src={mediaService.resolveMediaUrl(b.image_url)} alt={b.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                No media
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{b.title}</span>
                            {b.badge_text && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                {b.badge_text}
                              </Badge>
                            )}
                          </div>
                          {b.subtitle && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-md">{b.subtitle}</p>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            CTA: <span className="font-medium text-foreground">{b.button_text}</span> →{' '}
                            <code>{b.link_url}</code>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {b.placement}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
                            <span className="font-semibold text-foreground">{b.clicks_count}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleActive(b)}
                            className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                            title="Click to toggle status"
                          >
                            {b.is_active ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewBanner(b)}
                              className="h-7 text-xs gap-1"
                              title="Preview"
                            >
                              <Eye className="w-3 h-3" /> Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(b)}
                              className="h-7 text-xs gap-1"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBanner(b)}
                              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal: Create or Edit Banner */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="max-w-xl w-full shadow-2xl border my-8">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  {editingBanner ? 'Edit Slide Banner' : 'Create New Slide Banner'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Banner Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Khmer New Year Mega Deals"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Subtitle / Description</label>
                    <textarea
                      rows={2}
                      placeholder="Detailed promotional description or platform feature highlight..."
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Badge Text (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Universal Marketplace, Exclusive Deal"
                        value={formBadgeText}
                        onChange={(e) => setFormBadgeText(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Placement Location</label>
                      <select
                        value={formPlacement}
                        onChange={(e) => setFormPlacement(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      >
                        <option value="hero">Hero Carousel (Home Page)</option>
                        <option value="promo">Promotional Strip</option>
                        <option value="category">Category Header</option>
                        <option value="sidebar">Sidebar Widget</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold block">Image URL</label>
                        <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline">
                          <UploadCloud className="w-3.5 h-3.5" />
                          {uploadingImage ? 'Uploading...' : 'Upload Image to Cloud'}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImage}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleFileUpload(f, 'image')
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="/api/v1/media/branding/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg or https://..."
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold block">Video URL (Optional)</label>
                        <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline">
                          <UploadCloud className="w-3.5 h-3.5" />
                          {uploadingVideo ? 'Uploading...' : 'Upload Video to Cloud'}
                          <input
                            type="file"
                            accept="video/*"
                            disabled={uploadingVideo}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleFileUpload(f, 'video')
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="/api/v1/media/branding/gemini_generated_video_4b7f1e53.mp4"
                        value={formVideoUrl}
                        onChange={(e) => setFormVideoUrl(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        placeholder="Explore Catalog, Shop Now"
                        value={formButtonText}
                        onChange={(e) => setFormButtonText(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Destination Link URL</label>
                      <input
                        type="text"
                        placeholder="/products, /categories/fashion-clothing"
                        value={formLinkUrl}
                        onChange={(e) => setFormLinkUrl(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Background Gradient</label>
                      <select
                        value={formBackgroundStyle}
                        onChange={(e) => setFormBackgroundStyle(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      >
                        <option value="gradient-primary">Primary (Blue / Indigo)</option>
                        <option value="gradient-purple">Purple / Violet</option>
                        <option value="gradient-emerald">Emerald / Teal</option>
                        <option value="gradient-amber">Amber / Orange</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Sort Order</label>
                      <input
                        type="number"
                        min={0}
                        value={formSortOrder}
                        onChange={(e) => setFormSortOrder(Number(e.target.value))}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="rounded text-purple-600"
                        />
                        <span>Active on Storefront</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {formLoading ? 'Saving...' : editingBanner ? 'Update Slide Banner' : 'Create Slide Banner'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
