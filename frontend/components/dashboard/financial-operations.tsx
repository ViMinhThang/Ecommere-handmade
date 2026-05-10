"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ReceiptText, RotateCcw, WalletCards } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import type {
  FinancialSummary,
  MarketplaceLedgerEntry,
  RefundRequest,
  SubOrder,
} from "@/types"

const ledgerTypeLabels: Record<MarketplaceLedgerEntry["type"], string> = {
  PAYMENT_CAPTURE: "Payment capture",
  SELLER_EARNING: "Seller earning",
  PLATFORM_FEE: "Platform fee",
  PLATFORM_DISCOUNT: "Platform discount",
  REFUND: "Refund",
  PAYOUT: "Payout",
}

const ledgerStatusClasses: Record<MarketplaceLedgerEntry["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  POSTED: "bg-green-100 text-green-800",
  VOIDED: "bg-slate-100 text-slate-700",
}

function toMoney(value?: number | string | null) {
  return formatCurrency(Number(value || 0))
}

function formatLedgerDate(value: MarketplaceLedgerEntry["createdAt"]) {
  return new Date(value).toLocaleString("vi-VN")
}

export function FinancialSummaryPanel({
  summary,
  remainingRefundable,
  title = "Financial summary",
}: {
  summary?: FinancialSummary | null
  remainingRefundable?: number
  title?: string
}) {
  const rows = [
    { label: "Gross", value: summary?.gross },
    { label: "Customer paid", value: summary?.customerPaid },
    { label: "Platform discount", value: summary?.platformDiscount },
    { label: "Platform fee", value: summary?.platformFee },
    { label: "Seller net", value: summary?.sellerNet },
    { label: "Refunded", value: summary?.refundedAmount },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <WalletCards className="h-5 w-5" />
          {title}
        </CardTitle>
        {typeof remainingRefundable === "number" && (
          <Badge variant="outline">Refundable: {toMoney(remainingRefundable)}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {toMoney(row.value)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function LedgerTable({
  entries,
  isLoading,
  title = "Ledger audit",
}: {
  entries?: MarketplaceLedgerEntry[]
  isLoading?: boolean
  title?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading ledger...
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No ledger rows yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {ledgerTypeLabels[entry.type]}
                        </span>
                        <span className="max-w-44 truncate font-mono text-[11px] text-muted-foreground">
                          {entry.idempotencyKey}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${ledgerStatusClasses[entry.status]} border-0`}
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {toMoney(entry.amount)}
                    </TableCell>
                    <TableCell>
                      {entry.seller?.shopName || entry.seller?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {entry.customer?.name || entry.customer?.email || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.refundId?.slice(0, 8) || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLedgerDate(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function RefundDialog({
  open,
  onOpenChange,
  onSubmit,
  maxAmount,
  isSubmitting,
  subOrders,
  title = "Create refund",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RefundRequest) => Promise<void> | void
  maxAmount: number
  isSubmitting?: boolean
  subOrders?: SubOrder[]
  title?: string
}) {
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [subOrderId, setSubOrderId] = useState("ALL")
  const [error, setError] = useState("")

  const subOrderOptions = useMemo(() => subOrders || [], [subOrders])

  const resetForm = () => {
    setReason("")
    setAmount("")
    setSubOrderId("ALL")
    setError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const trimmedReason = reason.trim()
    const parsedAmount = amount.trim() ? Number(amount) : undefined

    if (!trimmedReason) {
      setError("Reason is required.")
      return
    }

    if (
      parsedAmount !== undefined &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      setError("Amount must be greater than zero.")
      return
    }

    if (parsedAmount !== undefined && parsedAmount > maxAmount) {
      setError("Amount exceeds refundable balance.")
      return
    }

    await onSubmit({
      reason: trimmedReason,
      amount: parsedAmount,
      subOrderId: subOrderId === "ALL" ? undefined : subOrderId,
    })
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Refundable balance: {toMoney(maxAmount)}
            </DialogDescription>
          </DialogHeader>

          {subOrderOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-order</Label>
              <Select
                value={subOrderId}
                onValueChange={(value) => setSubOrderId(value ?? "ALL")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sub-orders</SelectItem>
                  {subOrderOptions.map((subOrder) => (
                    <SelectItem key={subOrder.id} value={subOrder.id}>
                      {subOrder.seller?.shopName ||
                        subOrder.seller?.name ||
                        subOrder.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="refund-amount">Amount</Label>
            <Input
              id="refund-amount"
              inputMode="numeric"
              min={1}
              max={maxAmount}
              placeholder="Blank for full refundable balance"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Customer support note"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={isSubmitting || maxAmount <= 0}
            >
              <RotateCcw className="h-4 w-4" />
              {isSubmitting ? "Refunding..." : "Create refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
