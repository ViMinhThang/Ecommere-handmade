"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bug,
  CalendarRange,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  usePaymentReliabilityAnomalies,
  usePaymentReliabilityReconciliation,
  usePaymentReliabilitySummary,
  usePaymentReliabilityWebhooks,
} from "@/lib/api/hooks";
import type {
  PaymentReliabilityAnomalyType,
  PaymentReliabilityDateRangeQuery,
  PaymentReliabilityReconciliationStatus,
  PaymentReliabilitySeverity,
} from "@/lib/api/payment-reliability";

const ANOMALY_TYPE_OPTIONS: Array<"ALL" | PaymentReliabilityAnomalyType> = [
  "ALL",
  "STRIPE_ORDER_UNPAID_EXPIRED",
  "CUSTOM_ORDER_UNPAID_EXPIRED",
  "PAID_ORDER_MISSING_CAPTURE_LEDGER",
  "REFUND_STATUS_MISMATCH",
  "PAID_WITHOUT_WEBHOOK_RECORD",
];

const ANOMALY_SEVERITY_OPTIONS: Array<"ALL" | PaymentReliabilitySeverity> = [
  "ALL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

const RECONCILIATION_STATUS_OPTIONS: Array<
  "ALL" | PaymentReliabilityReconciliationStatus
> = [
  "ALL",
  "RECONCILED",
  "PENDING_PAYMENT",
  "UNPAID_EXPIRED",
  "MISSING_CAPTURE_LEDGER",
  "REFUND_STATUS_MISMATCH",
  "PAID_WITHOUT_WEBHOOK",
];

const ENTITY_TYPE_OPTIONS: Array<"ALL" | "ORDER" | "CUSTOM_ORDER"> = [
  "ALL",
  "ORDER",
  "CUSTOM_ORDER",
];

const severityClassMap: Record<PaymentReliabilitySeverity, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-blue-100 text-blue-800",
};

const reconciliationClassMap: Record<PaymentReliabilityReconciliationStatus, string> =
  {
    RECONCILED: "bg-green-100 text-green-800",
    PENDING_PAYMENT: "bg-amber-100 text-amber-800",
    UNPAID_EXPIRED: "bg-red-100 text-red-800",
    MISSING_CAPTURE_LEDGER: "bg-orange-100 text-orange-800",
    REFUND_STATUS_MISMATCH: "bg-yellow-100 text-yellow-800",
    PAID_WITHOUT_WEBHOOK: "bg-blue-100 text-blue-800",
  };

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDefaultDateInputRange() {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(now),
  };
}

function normalizeDateRange(from?: string, to?: string): PaymentReliabilityDateRangeQuery {
  return {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  };
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString("vi-VN");
}

function formatAmount(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: (currency || "VND").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString("vi-VN");
  }
}

function formatQueryError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function truncateId(value?: string | null) {
  if (!value) {
    return "-";
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function renderEntityLink(entityType: "ORDER" | "CUSTOM_ORDER", entityId: string) {
  if (entityType === "ORDER") {
    return (
      <Link href={`/dashboard/orders/${entityId}`} className="text-primary hover:underline">
        {truncateId(entityId)}
      </Link>
    );
  }

  return (
    <Link href={`/custom-orders/${entityId}/review`} className="text-primary hover:underline">
      {truncateId(entityId)}
    </Link>
  );
}

export default function PaymentReliabilityPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.roles?.includes("ROLE_ADMIN");

  const defaultRange = useMemo(() => getDefaultDateInputRange(), []);
  const [fromInput, setFromInput] = useState(defaultRange.from);
  const [toInput, setToInput] = useState(defaultRange.to);
  const [dateError, setDateError] = useState("");
  const [appliedRange, setAppliedRange] = useState<PaymentReliabilityDateRangeQuery>(
    normalizeDateRange(defaultRange.from, defaultRange.to),
  );

  const [anomalyType, setAnomalyType] = useState<"ALL" | PaymentReliabilityAnomalyType>("ALL");
  const [anomalySeverity, setAnomalySeverity] = useState<"ALL" | PaymentReliabilitySeverity>(
    "ALL",
  );
  const [anomalyPage, setAnomalyPage] = useState(1);
  const [anomalyLimit, setAnomalyLimit] = useState(20);

  const [reconciliationStatus, setReconciliationStatus] = useState<
    "ALL" | PaymentReliabilityReconciliationStatus
  >("ALL");
  const [reconciliationEntityType, setReconciliationEntityType] = useState<
    "ALL" | "ORDER" | "CUSTOM_ORDER"
  >("ALL");
  const [reconciliationPage, setReconciliationPage] = useState(1);
  const [reconciliationLimit, setReconciliationLimit] = useState(20);

  const [webhookType, setWebhookType] = useState("");
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhookLimit, setWebhookLimit] = useState(20);

  const summaryQuery = usePaymentReliabilitySummary(appliedRange, Boolean(isAdmin));

  const anomaliesQuery = usePaymentReliabilityAnomalies(
    {
      ...appliedRange,
      page: anomalyPage,
      limit: anomalyLimit,
      type: anomalyType === "ALL" ? undefined : anomalyType,
      severity: anomalySeverity === "ALL" ? undefined : anomalySeverity,
    },
    Boolean(isAdmin),
  );

  const reconciliationQuery = usePaymentReliabilityReconciliation(
    {
      ...appliedRange,
      page: reconciliationPage,
      limit: reconciliationLimit,
      entityType: reconciliationEntityType === "ALL" ? undefined : reconciliationEntityType,
      status: reconciliationStatus === "ALL" ? undefined : reconciliationStatus,
    },
    Boolean(isAdmin),
  );

  const webhooksQuery = usePaymentReliabilityWebhooks(
    {
      ...appliedRange,
      page: webhookPage,
      limit: webhookLimit,
      type: webhookType.trim() || undefined,
    },
    Boolean(isAdmin),
  );

  const handleApplyDateRange = () => {
    setDateError("");

    if (!fromInput && !toInput) {
      setAppliedRange({});
      setAnomalyPage(1);
      setReconciliationPage(1);
      setWebhookPage(1);
      return;
    }

    const fromDate = fromInput ? new Date(`${fromInput}T00:00:00.000Z`) : null;
    const toDate = toInput ? new Date(`${toInput}T00:00:00.000Z`) : null;

    if (
      (fromDate && Number.isNaN(fromDate.getTime())) ||
      (toDate && Number.isNaN(toDate.getTime()))
    ) {
      setDateError("Invalid date input.");
      return;
    }

    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From date must be earlier than or equal to to date.");
      return;
    }

    setAppliedRange(normalizeDateRange(fromInput || undefined, toInput || undefined));
    setAnomalyPage(1);
    setReconciliationPage(1);
    setWebhookPage(1);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Ban khong co quyen truy cap Payment Reliability Console.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold text-primary">Payment Reliability Console</h1>
        <p className="text-sm text-muted-foreground">
          Read-only dashboard for payment anomalies, reconciliation status, and webhook visibility.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Input
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Input
                type="date"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2 md:flex md:items-end">
              <Button onClick={handleApplyDateRange} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Apply Date Filter
              </Button>
            </div>
          </div>
          {dateError && <p className="text-sm text-red-600">{dateError}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Stripe Orders</p>
            <p className="mt-2 text-2xl font-bold">
              {summaryQuery.isLoading ? "-" : summaryQuery.data?.totals.stripeOrders ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Custom Orders</p>
            <p className="mt-2 text-2xl font-bold">
              {summaryQuery.isLoading ? "-" : summaryQuery.data?.totals.customOrders ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Anomalies</p>
            <p className="mt-2 text-2xl font-bold">
              {summaryQuery.isLoading ? "-" : summaryQuery.data?.totals.anomalies ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Unreconciled</p>
            <p className="mt-2 text-2xl font-bold">
              {summaryQuery.isLoading ? "-" : summaryQuery.data?.totals.unreconciled ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Webhook Events</p>
            <p className="mt-2 text-2xl font-bold">
              {summaryQuery.isLoading ? "-" : summaryQuery.data?.totals.webhookEvents ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Generated At</p>
            <p className="mt-2 text-sm font-medium">
              {summaryQuery.isLoading || !summaryQuery.data
                ? "-"
                : formatDateTime(summaryQuery.data.generatedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {summaryQuery.isError && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-muted-foreground">
                {formatQueryError(summaryQuery.error, "Failed to load summary.")}
              </p>
            </div>
            <Button variant="outline" onClick={() => summaryQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Anomalies
          </CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={anomalyType}
              onValueChange={(value) => {
                setAnomalyType(value as "ALL" | PaymentReliabilityAnomalyType);
                setAnomalyPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Anomaly type" />
              </SelectTrigger>
              <SelectContent>
                {ANOMALY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={anomalySeverity}
              onValueChange={(value) => {
                setAnomalySeverity(value as "ALL" | PaymentReliabilitySeverity);
                setAnomalyPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {ANOMALY_SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomaliesQuery.isLoading ? (
            <div className="flex min-h-[140px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : anomaliesQuery.isError ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">
                {formatQueryError(anomaliesQuery.error, "Failed to load anomalies.")}
              </p>
              <Button variant="outline" onClick={() => anomaliesQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : anomaliesQuery.data?.data.length ? (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Occurred At</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomaliesQuery.data.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.occurredAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <p>{item.type}</p>
                            {item.details?.isHeuristic && (
                              <p className="text-xs text-muted-foreground">
                                {String(item.details.note || "Heuristic signal")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${severityClassMap[item.severity]} border-0`}>
                            {item.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">{item.entityType}</span>
                            <span className="font-mono text-xs">
                              {renderEntityLink(item.entityType, item.entityId)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateId(item.paymentIntentId)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <p>Order: {item.orderStatus}</p>
                            <p className="text-muted-foreground">Payment: {item.paymentStatus}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={anomaliesQuery.data.meta.page}
                limit={anomaliesQuery.data.meta.limit}
                total={anomaliesQuery.data.meta.total}
                onPageChange={setAnomalyPage}
                onLimitChange={(value) => {
                  setAnomalyLimit(value);
                  setAnomalyPage(1);
                }}
              />
            </>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
              <Bug className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No anomalies found for selected filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Reconciliation
          </CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={reconciliationEntityType}
              onValueChange={(value) => {
                setReconciliationEntityType(value as "ALL" | "ORDER" | "CUSTOM_ORDER");
                setReconciliationPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={reconciliationStatus}
              onValueChange={(value) => {
                setReconciliationStatus(
                  value as "ALL" | PaymentReliabilityReconciliationStatus,
                );
                setReconciliationPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Reconciliation status" />
              </SelectTrigger>
              <SelectContent>
                {RECONCILIATION_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reconciliationQuery.isLoading ? (
            <div className="flex min-h-[140px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : reconciliationQuery.isError ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">
                {formatQueryError(reconciliationQuery.error, "Failed to load reconciliation rows.")}
              </p>
              <Button variant="outline" onClick={() => reconciliationQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : reconciliationQuery.data?.data.length ? (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Intent</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationQuery.data.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">{item.entityType}</span>
                            <span className="font-mono text-xs">
                              {renderEntityLink(item.entityType, item.entityId)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${reconciliationClassMap[item.status]} border-0`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(item.amount, item.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateId(item.paymentIntentId)}
                        </TableCell>
                        <TableCell>
                          {item.issues.length === 0 ? (
                            <span className="text-xs text-green-700">No issues</span>
                          ) : (
                            <div className="space-y-1">
                              {item.issues.slice(0, 2).map((issue) => (
                                <p key={issue} className="text-xs text-muted-foreground">
                                  {issue}
                                </p>
                              ))}
                              {item.issues.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{item.issues.length - 2} more
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={reconciliationQuery.data.meta.page}
                limit={reconciliationQuery.data.meta.limit}
                total={reconciliationQuery.data.meta.total}
                onPageChange={setReconciliationPage}
                onLimitChange={(value) => {
                  setReconciliationLimit(value);
                  setReconciliationPage(1);
                }}
              />
            </>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
              <Database className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No reconciliation rows found for selected filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Events
          </CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={webhookType}
              onChange={(event) => {
                setWebhookType(event.target.value);
                setWebhookPage(1);
              }}
              placeholder="Filter by webhook type (e.g. payment_intent.succeeded)"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooksQuery.isLoading ? (
            <div className="flex min-h-[140px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : webhooksQuery.isError ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-muted-foreground">
                {formatQueryError(webhooksQuery.error, "Failed to load webhook events.")}
              </p>
              <Button variant="outline" onClick={() => webhooksQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : webhooksQuery.data?.data.length ? (
            <>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Event Id</TableHead>
                      <TableHead>Payment Intent</TableHead>
                      <TableHead>Entity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooksQuery.data.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.processedAt)}
                        </TableCell>
                        <TableCell className="font-medium">{item.type}</TableCell>
                        <TableCell className="font-mono text-xs">{truncateId(item.eventId)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateId(item.paymentIntentId)}
                        </TableCell>
                        <TableCell>
                          {item.entityType && item.entityId ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{item.entityType}</span>
                              <span className="font-mono text-xs">
                                {renderEntityLink(item.entityType, item.entityId)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unlinked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={webhooksQuery.data.meta.page}
                limit={webhooksQuery.data.meta.limit}
                total={webhooksQuery.data.meta.total}
                onPageChange={setWebhookPage}
                onLimitChange={(value) => {
                  setWebhookLimit(value);
                  setWebhookPage(1);
                }}
              />
            </>
          ) : (
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
              <Webhook className="h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No webhook events found for selected filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
