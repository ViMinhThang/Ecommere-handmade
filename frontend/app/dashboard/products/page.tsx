/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ProductDialog } from '@/components/dashboard/product-dialog'
import { useProducts, useCategories, useProductStats, useCreateProduct, useUpdateProduct, useDeleteProduct, useApproveProduct, useRejectProduct } from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Product } from '@/types'
import { Search, Plus, Pencil, Trash2, Eye, Check, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { mediaApi } from '@/lib/api/media'

export default function ProductsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const isAdmin = user?.roles?.includes('ROLE_ADMIN')
  const isSeller = user?.roles?.includes('ROLE_SELLER')

  const { data: productsData, isLoading } = useProducts({
    status: statusFilter === 'all' ? undefined : statusFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    sellerId: isSeller && !isAdmin ? user?.id : undefined,
    page,
    limit,
  })
  const { data: categoriesData } = useCategories({ status: 'ACTIVE' })
  const { data: statsData } = useProductStats() as { data?: { total?: number; pending?: number; approved?: number } }
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const approveProduct = useApproveProduct()
  const rejectProduct = useRejectProduct()

  const products = productsData?.data || []
  const meta = productsData?.meta
  const categories = categoriesData?.data || []
  const stats = statsData || { total: 0, pending: 0, approved: 0 }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
    }
    return <Badge className={styles[status] || ''}>{labels[status] || status}</Badge>
  }

  const getMainImage = (product: Product): string => {
    const mainImage = product.images?.find(img => img.isMain)
    return mainImage?.url || product.images?.[0]?.url || ''
  }

  const handleAddProduct = (productData: { name: string; description: string; price: number; categoryId: string; images: { url: string; isMain: boolean }[]; stock: number; lowStockThreshold: number; sku?: string }) => {
    createProduct.mutate({
      name: productData.name,
      description: productData.description,
      price: productData.price,
      categoryId: productData.categoryId,
      images: productData.images,
      stock: productData.stock,
      lowStockThreshold: productData.lowStockThreshold,
      sku: productData.sku,
    })
  }

  const handleEditProduct = (productData: { name: string; description: string; price: number; categoryId: string; images: { url: string; isMain: boolean }[]; stock: number; lowStockThreshold: number; sku?: string }) => {
    if (!selectedProduct) return
    updateProduct.mutate({
      id: selectedProduct.id,
      data: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        categoryId: productData.categoryId,
        images: productData.images,
        stock: productData.stock,
        lowStockThreshold: productData.lowStockThreshold,
        sku: productData.sku,
      },
    })
    setSelectedProduct(null)
  }

  const handleDeleteProduct = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      deleteProduct.mutate(id)
    }
  }

  const handleApproveProduct = (id: string) => {
    approveProduct.mutate(id)
  }

  const handleRejectProduct = (id: string) => {
    rejectProduct.mutate(id)
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  return (
    <div className='space-y-7'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='artisan-title text-4xl'>Sản phẩm</h1>
          <p className='artisan-subtitle mt-2'>Quản lý và duyệt sản phẩm trên nền tảng của bạn.</p>
        </div>
        {isSeller && (
          <Button onClick={() => router.push('/dashboard/new-listing')}>
            <Plus className='h-4 w-4 mr-2' />
            Thêm sản phẩm
          </Button>
        )}
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Tổng sản phẩm</p>
            <p className='text-2xl font-bold'>{meta?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Chờ duyệt</p>
            <p className='text-2xl font-bold'>{(stats as any)?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Đã duyệt</p>
            <p className='text-2xl font-bold'>{(stats as any)?.approved || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Tất cả sản phẩm</CardTitle>
            <div className='flex items-center gap-2'>
              <div className='relative w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input 
                  placeholder='Tìm kiếm sản phẩm...' 
                  className='pl-9' 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='Trạng thái' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tất cả</SelectItem>
                  <SelectItem value='PENDING'>Chờ duyệt</SelectItem>
                  <SelectItem value='APPROVED'>Đã duyệt</SelectItem>
                  <SelectItem value='REJECTED'>Từ chối</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value || "all")}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='Danh mục' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tất cả danh mục</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-center py-4'>Đang tải...</div>
          ) : filteredProducts.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ảnh</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Nhà bán</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className='w-12 h-12 rounded-lg overflow-hidden bg-muted'>
                        {getMainImage(product) ? (
                          <img src={mediaApi.getImageUrl(getMainImage(product))} alt={product.name} className='w-full h-full object-cover' />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-xs text-muted-foreground'>Không có ảnh</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='font-medium'>{product.name}</TableCell>
                    <TableCell>{product.seller?.shopName || '-'}</TableCell>
                    <TableCell>{product.category?.name || '-'}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button variant='ghost' size='icon'>
                          <Eye className='h-4 w-4' />
                        </Button>
                        {isSeller && product.sellerId === user?.id && (
                          <>
                            <Button variant='ghost' size='icon' onClick={() => router.push(`/dashboard/new-listing?id=${product.id}`)}>
                              <Pencil className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='icon' onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </>
                        )}
                        {isAdmin && product.status === 'PENDING' && (
                          <>
                            <Button variant='ghost' size='icon' className='text-green-600' onClick={() => handleApproveProduct(product.id)}>
                              <Check className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='icon' className='text-red-600' onClick={() => handleRejectProduct(product.id)}>
                              <X className='h-4 w-4' />
                            </Button>
                          </>
                        )}
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        categories={categories}
        sellerId={user?.id || ''}
        onSave={selectedProduct ? handleEditProduct : handleAddProduct}
      />
    </div>
  )
}