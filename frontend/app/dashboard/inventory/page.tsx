'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { useLowStockProducts, useUpdateStock, useInventoryLog } from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Product, InventoryLog } from '@/types'
import { Search, Package, TrendingUp, TrendingDown, History } from 'lucide-react'

type Reason = 'MANUAL' | 'RESTOCK' | 'RETURN'

export default function InventoryPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockChange, setStockChange] = useState(0)
  const [stockReason, setStockReason] = useState<Reason>('MANUAL')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { data: productsData, isLoading } = useLowStockProducts(showAll ? undefined : user?.id, page, limit)
  const updateStock = useUpdateStock()
  const { data: inventoryLogData } = useInventoryLog(selectedProduct?.id || '')

  const products = Array.isArray(productsData) ? productsData : (productsData as any)?.data || []
  const meta = Array.isArray(productsData) ? { total: productsData.length } : (productsData as any)?.meta

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalStock = products.reduce((sum: number, p: Product) => sum + (Number(p.stock) || 0), 0)
  const lowStockCount = products.filter((p: Product) => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 0)).length
  const outOfStockCount = products.filter((p: Product) => (Number(p.stock) || 0) === 0).length

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const openStockDialog = (product: Product) => {
    setSelectedProduct(product)
    setStockChange(0)
    setStockReason('MANUAL')
    setStockDialogOpen(true)
  }

  const openHistoryDialog = (product: Product) => {
    setSelectedProduct(product)
    setHistoryDialogOpen(true)
  }

  const handleStockUpdate = () => {
    if (!selectedProduct || stockChange === 0) return
    updateStock.mutate(
      { productId: selectedProduct.id, data: { quantity: stockChange, reason: stockReason } },
      { onSuccess: () => setStockDialogOpen(false) }
    )
  }

  const getStockStatus = (product: Product) => {
    const stock = Number(product.stock) || 0
    const threshold = Number(product.lowStockThreshold) || 0
    if (stock === 0) return { label: 'Hết hàng', className: 'bg-red-100 text-red-800' }
    if (stock <= threshold) return { label: 'Sắp hết', className: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Còn hàng', className: 'bg-green-100 text-green-800' }
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'MANUAL': return 'Điều chỉnh thủ công'
      case 'RESTOCK': return 'Nhập kho'
      case 'RETURN': return 'Trả lại'
      default: return reason
    }
  }

  return (
    <div className='space-y-7'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='artisan-title text-4xl'>Kho hàng</h1>
          <p className='artisan-subtitle mt-2'>Quản lý tồn kho và hàng tồn kho.</p>
        </div>
        <Button variant='outline' onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Chỉ sản phẩm thấp' : 'Xem tất cả'}
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Tổng tồn kho</p>
            <p className='text-2xl font-bold'>{totalStock.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Sắp hết hàng</p>
            <p className='text-2xl font-bold text-yellow-600'>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Hết hàng</p>
            <p className='text-2xl font-bold text-red-600'>{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Danh sách sản phẩm</CardTitle>
            <div className='relative w-64'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input 
                placeholder='Tìm theo tên hoặc SKU...' 
                className='pl-9' 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-center py-4'>Đang tải...</div>
          ) : filteredProducts.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <Package className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Tồn kho</TableHead>
                  <TableHead>Ngưỡng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
<TableBody>
                {filteredProducts.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell className='font-medium'>{product.name}</TableCell>
                    <TableCell className='text-muted-foreground'>{product.sku || '-'}</TableCell>
                    <TableCell>{(product as any).categoryName || (product.category?.name) || '-'}</TableCell>
                    <TableCell className='font-semibold'>{product.stock}</TableCell>
                    <TableCell className='text-muted-foreground'>{product.lowStockThreshold}</TableCell>
                    <TableCell>
                      <Badge className={getStockStatus(product).className}>
                        {getStockStatus(product).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Button 
                          variant='ghost' 
                          size='sm' 
                          onClick={() => openStockDialog(product)}
                          className='text-primary hover:text-primary hover:bg-primary/10'
                        >
                          Cập nhật
                        </Button>
                        <Button 
                          variant='ghost' 
                          size='icon' 
                          onClick={() => openHistoryDialog(product)}
                          title='Lịch sử kho'
                        >
                          <History className='h-4 w-4' />
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

      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật tồn kho - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Tồn kho hiện tại:</span>
              <span className='font-bold'>{selectedProduct?.stock}</span>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='change'>Thay đổi tồn kho (+/-)</Label>
              <Input
                id='change'
                type='number'
                value={stockChange}
                onChange={(e) => setStockChange(parseInt(e.target.value) || 0)}
                placeholder='Nhập số dương để thêm, số âm để giảm'
              />
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Tồn kho mới:</span>
              <span className={`font-bold ${(selectedProduct?.stock || 0) + stockChange < 0 ? 'text-red-500' : ''}`}>
                {(selectedProduct?.stock || 0) + stockChange}
              </span>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='reason'>Lý do</Label>
              <Select value={stockReason} onValueChange={(v) => setStockReason(v as Reason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='MANUAL'>Điều chỉnh thủ công</SelectItem>
                  <SelectItem value='RESTOCK'>Nhập kho</SelectItem>
                  <SelectItem value='RETURN'>Trả lại</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setStockDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleStockUpdate} 
              disabled={stockChange === 0 || (selectedProduct?.stock || 0) + stockChange < 0}
            >
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Lịch sử kho - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className='space-y-2 py-4 max-h-80 overflow-y-auto'>
            {inventoryLogData && (inventoryLogData as InventoryLog[]).length === 0 ? (
              <p className='text-center text-muted-foreground py-4'>Không có lịch sử</p>
            ) : (
              (inventoryLogData as InventoryLog[])?.map((log) => (
                <div key={log.id} className='flex items-center justify-between text-sm p-2 rounded bg-muted'>
                  <div className='flex items-center gap-2'>
                    {log.change > 0 ? (
                      <TrendingUp className='h-4 w-4 text-green-500' />
                    ) : (
                      <TrendingDown className='h-4 w-4 text-red-500' />
                    )}
                    <span>{getReasonLabel(log.reason)}</span>
                  </div>
                  <div className='flex items-center gap-4'>
                    <span className={log.change > 0 ? 'text-green-500' : 'text-red-500'}>
                      {log.change > 0 ? '+' : ''}{log.change}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {new Date(log.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
