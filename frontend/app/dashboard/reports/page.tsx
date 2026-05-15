'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { useAdminReports, useUpdateAdminReportStatus } from '@/lib/api/hooks'
import type { Report, ReportStatus, ReportType } from '@/types'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const REPORT_STATUSES: ReportStatus[] = [
  'PENDING',
  'REVIEWING',
  'RESOLVED',
  'REJECTED',
]

const REPORT_TYPES: ReportType[] = ['SHOP', 'CUSTOMER', 'PRODUCT', 'ORDER']

const statusClasses: Record<ReportStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

function targetLabel(report: Report) {
  if (report.targetUser) {
    return report.targetUser.shopName || report.targetUser.name
  }
  if (report.targetProduct) {
    return report.targetProduct.name
  }
  if (report.order) {
    return `Order #${report.order.id.slice(0, 8)}`
  }
  return '-'
}

export default function DashboardReportsPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('ROLE_ADMIN')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReportStatus>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | ReportType>('ALL')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [nextStatus, setNextStatus] = useState<ReportStatus>('REVIEWING')
  const [adminNote, setAdminNote] = useState('')

  const query = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      limit: 50,
    }),
    [statusFilter, typeFilter],
  )
  const reportsQuery = useAdminReports(query, Boolean(isAdmin))
  const updateStatus = useUpdateAdminReportStatus()

  const reports = reportsQuery.data?.data || []

  const openStatusDialog = (report: Report) => {
    setSelectedReport(report)
    setNextStatus(report.status)
    setAdminNote(report.adminNote || '')
  }

  const handleUpdateStatus = async () => {
    if (!selectedReport) return

    try {
      await updateStatus.mutateAsync({
        id: selectedReport.id,
        data: {
          status: nextStatus,
          adminNote: adminNote || undefined,
        },
      })
      toast.success('Report status updated')
      setSelectedReport(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update report',
      )
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Ban khong co quyen truy cap bao cao.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-4xl font-semibold text-primary">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Xem va xu ly bao cao gian hang, khach hang, san pham va don hang.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Report list</CardTitle>
            <div className="flex gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'ALL' | ReportStatus)
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All status</SelectItem>
                  {REPORT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as 'ALL' | ReportType)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All type</SelectItem>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : reportsQuery.error ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-red-500/60" />
              <p className="text-sm text-muted-foreground">
                Khong the tai danh sach bao cao.
              </p>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              Chua co bao cao nao.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.type}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {report.reporter?.name || report.reporterId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {report.reporter?.email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{targetLabel(report)}</TableCell>
                      <TableCell>
                        <div className="max-w-[280px]">
                          <p className="font-medium">{report.reason}</p>
                          {report.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {report.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusClasses[report.status]} border-0`}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusDialog(report)}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update report</DialogTitle>
            <DialogDescription>
              Chuyen trang thai va ghi chu xu ly cho bao cao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={nextStatus}
              onValueChange={(value) => setNextStatus(value as ReportStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Admin note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
