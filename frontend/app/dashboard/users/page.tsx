'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pagination } from '@/components/ui/pagination'
import { UserDialog, DeleteDialog } from '@/components/dashboard/user-dialog'
import { useUsers, useUserStats, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/api/hooks'
import { User, UserRole } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'

type UsersResponse = {
  data?: User[]
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

type UserStats = {
  total?: number
  admins?: number
  sellers?: number
  customers?: number
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { data: usersData, isLoading } = useUsers({
    role: roleFilter !== 'all' ? roleFilter : undefined,
    page,
    limit,
  })
  const { data: statsData } = useUserStats() as { data?: UserStats | { data?: UserStats } }
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const users: User[] = Array.isArray(usersData)
    ? usersData
    : ((usersData as UsersResponse | undefined)?.data ?? [])
  const meta = Array.isArray(usersData)
    ? { total: usersData.length, page: 1, limit: usersData.length }
    : (usersData as UsersResponse | undefined)?.meta
  const statsResponse = statsData as UserStats | { data?: UserStats } | undefined
  const normalizedStats: UserStats | undefined = statsResponse && typeof statsResponse === 'object' && 'data' in statsResponse
    ? statsResponse.data
    : (statsResponse as UserStats | undefined)
  const stats: UserStats = normalizedStats || { total: 0, admins: 0, sellers: 0, customers: 0 }
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleAddUser = (userData: Partial<User> & { password?: string }) => {
    createUser.mutate(userData)
  }

  const handleEditUser = (userData: Partial<User>) => {
    if (!selectedUser) return
    updateUser.mutate({
      id: selectedUser.id,
      data: userData,
    })
    setSelectedUser(null)
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    deleteUser.mutate(selectedUser.id)
    setSelectedUser(null)
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const getRoleBadgeVariant = (roles: UserRole[]) => {
    if (roles.includes('ROLE_ADMIN')) return 'default'
    if (roles.includes('ROLE_SELLER')) return 'secondary'
    return 'outline'
  }

  const getDisplayRole = (roles: UserRole[]) => {
    if (roles.includes('ROLE_ADMIN')) return 'Quản trị viên'
    if (roles.includes('ROLE_SELLER')) return 'Người bán'
    return 'Khách hàng'
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'PENDING': return 'outline'
      case 'SUSPENDED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động'
      case 'INACTIVE': return 'Không hoạt động'
      case 'PENDING': return 'Chờ duyệt'
      case 'SUSPENDED': return 'Bị khóa'
      default: return status
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Người dùng</h1>
          <p className="text-muted-foreground">Quản lý tất cả người dùng - quản trị viên, người bán và khách hàng.</p>
        </div>
        <Button onClick={() => { setSelectedUser(null); setEditDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm người dùng
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng người dùng</p>
            <p className="text-2xl font-bold">{meta?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Quản trị viên</p>
            <p className="text-2xl font-bold">{stats?.admins || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Người bán</p>
            <p className="text-2xl font-bold">{stats?.sellers || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Khách hàng</p>
            <p className="text-2xl font-bold">{stats?.customers || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tất cả người dùng</CardTitle>
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Lọc theo vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="ROLE_ADMIN">Quản trị viên</SelectItem>
                  <SelectItem value="ROLE_SELLER">Người bán</SelectItem>
                  <SelectItem value="ROLE_USER">Khách hàng</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm người dùng..."
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
) : users.length === 0 ? (
            <div className="text-center py-4">Không có dữ liệu</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tên shop</TableHead>
                  <TableHead>Đơn hàng/Doanh số</TableHead>
                  <TableHead>Đã chi tiêu</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.roles)}>
                        {getDisplayRole(user.roles)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {getDisplayStatus(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.shopName || '-'}</TableCell>
                    <TableCell>
                      {user.roles?.includes('ROLE_SELLER') 
                        ? `${user.sales} đơn` 
                        : `${user.ordersCount} đơn`}
                    </TableCell>
                    <TableCell>
                      {user.roles?.includes('ROLE_USER') && !user.roles?.includes('ROLE_SELLER') ? formatCurrency(user.totalSpent || 0) : '-'}
                    </TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(user)}>
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

      <UserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSave={selectedUser ? handleEditUser : handleAddUser}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userName={selectedUser?.name || ''}
        onConfirm={handleDeleteUser}
      />
    </div>
  )
}
