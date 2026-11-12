import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderTree,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Package,
  Layers,
  RefreshCw,
  Tag,
  CheckCircle2,
  EyeOff,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { categoryService } from '@/services/category.service'
import { Pagination } from '@/components/common/Pagination'
import type { Category } from '@/types/category.types'

export function CategoryListPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({})
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      // Tree view for hierarchical tree display
      const data = await categoryService.getCategories({ tree: true, include_attribute_count: true })
      setCategories(data)
    } catch (err: any) {
      toast({
        title: 'Failed to load categories',
        description: err?.message || 'Could not retrieve marketplace category tree.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDelete = (category: Category) => {
    setDeleteTarget(category)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const category = deleteTarget
    try {
      await categoryService.deleteCategory(category.id)
      toast({
        title: 'Category Deleted',
        description: `Category "${category.name}" was removed.`,
        type: 'success',
      })
      fetchCategories()
      setDeleteTarget(null)
    } catch (err: any) {
      toast({
        title: 'Deletion Failed',
        description: err?.message || 'Could not delete category.',
        type: 'error',
      })
    }
  }

  // Count total categories and subcategories
  const countAll = (cats: Category[]): number => {
    let count = cats.length
    for (const c of cats) {
      if (c.children && c.children.length > 0) {
        count += countAll(c.children)
      }
    }
    return count
  }

  const totalCategories = countAll(categories)
  const rootCount = categories.length

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const matchesSelf = c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term)
    const matchesChild = c.children?.some(
      (sub) => sub.name.toLowerCase().includes(term) || sub.slug.toLowerCase().includes(term)
    )
    return matchesSelf || matchesChild
  })

  // Sorted by DESC by default (Newest departments first)
  const sortedCategories = useMemo(() => {
    const list = [...filteredCategories]
    list.sort((a, b) => {
      let valA: any = a[sortBy as keyof Category] ?? a.id
      let valB: any = b[sortBy as keyof Category] ?? b.id
      if (sortBy === 'products_count') {
        valA = a.products_count ?? 0
        valB = b.products_count ?? 0
      }
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
    return list
  }, [filteredCategories, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / perPage))
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return sortedCategories.slice(start, start + perPage)
  }, [sortedCategories, currentPage, perPage])

  return (
    <DashboardLayout
      roleTitle="Category & Attribute Control"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FolderTree className="w-6 h-6 text-purple-600" />
              Universal Marketplace Categories
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-level hierarchy, dynamic product attributes, and universal taxonomy tree.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/products">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Package className="w-4 h-4" />
                Products Catalog
              </Button>
            </Link>
            <Link to="/admin/categories/create">
              <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Marketplace Taxonomy</p>
                <p className="text-xl font-bold mt-1">{totalCategories} categories</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                <FolderTree className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Root Departments</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">{rootCount} departments</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Layers className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Nested Subcategories</p>
                <p className="text-xl font-bold mt-1 text-blue-600">
                  {Math.max(0, totalCategories - rootCount)} subcategories
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Tag className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hierarchy Nesting</p>
                <p className="text-sm font-bold mt-1 text-purple-600">Unlimited Levels</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border">
          <div className="flex-1 w-full sm:max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by department name or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Sort By Selector (Defaults to DESC / Newest First) */}
            <select
              value={`${sortBy}:${sortDirection}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(':')
                setSortBy(sb)
                setSortDirection(sd as any)
                setCurrentPage(1)
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="id:desc">Newest First (DESC)</option>
              <option value="id:asc">Oldest First (ASC)</option>
              <option value="name:asc">Department Name (A - Z)</option>
              <option value="products_count:desc">Most Products</option>
              <option value="sort_order:asc">Display Order</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCategories}
              className="h-9 px-2.5 text-xs"
              title="Refresh tree"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Hierarchical Tree Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="dashboard-table-scroll">
            <table className="dashboard-data-table w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Department / Category Name</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3 text-center">Configured Attributes</th>
                  <th className="p-3 text-center">Products</th>
                  <th className="p-3 text-center">Order</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading universal category tree...
                    </td>
                  </tr>
                ) : sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No categories found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedCategories.map((cat) => {
                    const hasChildren = Boolean(cat.children && cat.children.length > 0)
                    const isExpanded = Boolean(expandedIds[cat.id])

                    return (
                      <React.Fragment key={cat.id}>
                        {/* Parent Row */}
                        <tr className="hover:bg-muted/40 transition-colors font-medium">
                          <td className="p-3 text-center">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(cat.id)}
                                className="p-1 hover:bg-muted rounded text-muted-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 h-4 inline-block" />
                            )}
                          </td>
                          <td className="p-3 font-bold text-foreground flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                              {cat.icon ? cat.icon.charAt(0) : 'P'}
                            </div>
                            <div>
                              <span>{cat.name}</span>
                              {hasChildren && (
                                <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 font-normal">
                                  {cat.children!.length} subcategories
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">
                            {cat.slug}
                          </td>
                          <td className="p-3 text-center">
                            {(cat.attributes_count ?? cat.attributes?.length ?? 0) > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/5">
                                {cat.attributes_count ?? cat.attributes?.length ?? 0} attributes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {cat.products_count ?? 0}
                          </td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {cat.sort_order}
                          </td>
                          <td className="p-3">
                            {cat.is_active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Add Subcategory shortcut */}
                              <Link to={`/admin/categories/create?parent_id=${cat.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                  title="Add Subcategory"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              </Link>

                              {/* Configure Attributes */}
                              <Link to={`/admin/categories/${cat.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-purple-600"
                                  title="Configure Dynamic Attributes"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </Link>

                              {/* Edit */}
                              <Link to={`/admin/categories/${cat.id}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Category Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                              </Link>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete Category"
                                onClick={() => handleDelete(cat)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Nested Subcategories */}
                        {hasChildren && isExpanded && (
                          cat.children!.map((sub) => (
                            <tr key={sub.id} className="bg-muted/15 hover:bg-muted/30 transition-colors text-xs">
                              <td className="p-3 text-center">
                                <span className="text-muted-foreground/50 ml-4">&bull;</span>
                              </td>
                              <td className="p-3 pl-8">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground/60">&rdquor;</span>
                                  <span className="font-semibold text-foreground">{sub.name}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-muted-foreground">
                                {sub.slug}
                              </td>
                              <td className="p-3 text-center">
                                {(sub.attributes_count ?? sub.attributes?.length ?? 0) > 0 ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    {sub.attributes_count ?? sub.attributes?.length ?? 0} attrs
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono">
                                {sub.products_count ?? 0}
                              </td>
                              <td className="p-3 text-center font-mono text-muted-foreground">
                                {sub.sort_order}
                              </td>
                              <td className="p-3">
                                {sub.is_active ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                    Inactive
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link to={`/admin/categories/${sub.id}/edit`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDelete(sub)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Department Hierarchy Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedCategories.length}
            perPage={perPage}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage)
              setCurrentPage(1)
            }}
            perPageOptions={[10, 20, 50]}
            itemName="departments"
          />
        </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete category?"
        description={deleteTarget
          ? `Delete "${deleteTarget.name}"? Any subcategories or products will be safely reassigned to its parent.`
          : ''}
        confirmLabel="Delete category"
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  )
}

