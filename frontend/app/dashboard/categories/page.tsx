'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { CategoryDialog, DeleteCategoryDialog } from '@/components/dashboard/category-dialog'
import { useCategories, useCategoryStats, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Category, CategoryStatus } from '@/types'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | 'all'>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const { user } = useAuth()

  const { data: categoriesData, isLoading } = useCategories({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  })
  const { data: statsData } = useCategoryStats() as { data?: { total?: number; active?: number; inactive?: number } }
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const categories = categoriesData?.data || []
  const meta = categoriesData?.meta
  const stats = statsData || { total: 0, active: 0, inactive: 0 }

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleAddCategory = (categoryData: Partial<Category>) => {
    createCategory.mutate(categoryData as { name: string; description: string; status: CategoryStatus })
  }

  const handleEditCategory = (categoryData: Partial<Category>) => {
    if (!selectedCategory) return
    updateCategory.mutate({
      id: selectedCategory.id,
      data: categoryData,
    })
    setSelectedCategory(null)
  }

  const handleDeleteCategory = () => {
    if (!selectedCategory) return
    deleteCategory.mutate(selectedCategory.id)
    setSelectedCategory(null)
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setDeleteDialogOpen(true)
  }

  const getStatusBadgeVariant = (status: CategoryStatus) => {
    return status === 'ACTIVE' ? 'default' : 'secondary'
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Danh mục</h1>
          <p className="text-muted-foreground">Quản lý danh mục sản phẩm.</p>
        </div>
        <Button onClick={() => { setSelectedCategory(null); setEditDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm danh mục
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng danh mục</p>
            <p className="text-2xl font-bold">{meta?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hoạt động</p>
            <p className="text-2xl font-bold">{(stats as any)?.active || (stats as any)?.activeCategories || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Không hoạt động</p>
            <p className="text-2xl font-bold">{(stats as any)?.inactive || (stats as any)?.inactiveCategories || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tất cả danh mục</CardTitle>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CategoryStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm danh mục..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4">Không có dữ liệu</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ảnh</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="w-16 h-12 rounded-md overflow-hidden bg-muted">
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Không có ảnh</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{category.name}</p>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {category.description}
                    </TableCell>
                    <TableCell>{category.productsCount}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(category.status)}>
                        {category.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(category.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(category)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
</TableBody>
              </Table>
            )}
          <Pagination
            page={page}
            limit={limit}
            total={Number(meta?.total) || 0}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </CardContent>
      </Card>

      <CategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={selectedCategory}
        userId={user?.id || ''}
        onSave={selectedCategory ? handleEditCategory : handleAddCategory}
      />

      <DeleteCategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        categoryName={selectedCategory?.name || ''}
        onConfirm={handleDeleteCategory}
      />
    </div>
  )
}