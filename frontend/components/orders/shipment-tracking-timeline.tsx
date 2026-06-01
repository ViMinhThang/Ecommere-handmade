"use client";

import { Badge } from "@/components/ui/badge";
import type { ShipmentTrackingEvent, SubOrder } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

const statusLabels: Record<SubOrder["status"], string> = {
  PENDING: "Chờ xác nhận",
  PAID: "Đã thanh toán",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đang vận chuyển",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
};

const typeLabels: Record<ShipmentTrackingEvent["type"], string> = {
  STATUS_UPDATED: "Cập nhật trạng thái",
  INFO: "Thông tin",
  LOCATION: "Vị trí vận chuyển",
  EXCEPTION: "Sự cố",
  DELIVERED: "Hoàn tất",
};

const typeIcons = {
  STATUS_UPDATED: PackageCheck,
  INFO: Info,
  LOCATION: Truck,
  EXCEPTION: AlertTriangle,
  DELIVERED: CheckCircle2,
} satisfies Record<ShipmentTrackingEvent["type"], typeof Info>;

const carrierTrackingPages = [
  {
    keys: ["ghn", "giao hang nhanh", "giaohangnhanh"],
    label: "GHN",
    url: "https://donhang.ghn.vn/",
  },
  {
    keys: ["ghtk", "giao hang tiet kiem", "giaohangtietkiem"],
    label: "GHTK",
    url: "https://i.ghtk.vn/",
  },
  {
    keys: ["viettel", "viettel post", "viettelpost", "vtpost"],
    label: "Viettel Post",
    url: "https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/",
  },
  {
    keys: ["j&t", "jt", "jtexpress", "j&t express"],
    label: "J&T Express",
    url: "https://jtexpress.vn/vi/tracking",
  },
  {
    keys: ["ninja", "ninja van", "ninjavan"],
    label: "Ninja Van",
    url: "https://www.ninjavan.co/en-vn/tracking",
  },
  {
    keys: ["spx", "spx express", "shopee express"],
    label: "SPX Express",
    url: "https://spx.vn/",
  },
];

function normalizeCarrier(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getTrackingLink(carrier?: string | null, trackingCode?: string | null) {
  const code = trackingCode?.trim();
  if (!code) {
    return null;
  }

  const normalizedCarrier = normalizeCarrier(carrier);
  const matchedCarrier = carrierTrackingPages.find((candidate) =>
    candidate.keys.some((key) => normalizedCarrier.includes(key)),
  );

  if (matchedCarrier) {
    return {
      label: `Tra cứu trên ${matchedCarrier.label}`,
      url: matchedCarrier.url,
    };
  }

  const query = encodeURIComponent(
    [carrier, trackingCode, "tra cứu vận đơn"].filter(Boolean).join(" "),
  );

  return {
    label: "Tra cứu vận đơn",
    url: `https://www.google.com/search?q=${query}`,
  };
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface ShipmentTrackingTimelineProps {
  events?: ShipmentTrackingEvent[];
  status?: SubOrder["status"];
  emptyMessage?: string;
}

export function ShipmentTrackingTimeline({
  events = [],
  status,
  emptyMessage = "Chưa có cập nhật vận chuyển nào.",
}: ShipmentTrackingTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = new Date(a.occurredAt).getTime();
    const bTime = new Date(b.occurredAt).getTime();
    if (aTime !== bTime) {
      return bTime - aTime;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (sortedEvents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {status ? statusLabels[status] : "Theo dõi vận chuyển"}
        </div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => {
        const Icon = typeIcons[event.type] || Info;
        const isLatest = index === 0;
        const trackingLink = getTrackingLink(event.carrier, event.trackingCode);

        return (
          <div key={event.id} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                  isLatest
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < sortedEvents.length - 1 && (
                <div className="mt-2 h-full min-h-10 w-px bg-border" />
              )}
            </div>

            <div className="flex-1 rounded-lg border bg-card p-4 text-card-foreground">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={isLatest ? "default" : "secondary"}>
                    {typeLabels[event.type]}
                  </Badge>
                  {event.status && (
                    <Badge variant="outline">{statusLabels[event.status]}</Badge>
                  )}
                </div>
              </div>

              {event.description && (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              )}

              {(event.location || event.carrier || event.trackingCode) && (
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </span>
                  )}
                  {event.carrier && <span>Đơn vị: {event.carrier}</span>}
                  {event.trackingCode && (
                    <span>Mã vận đơn: {event.trackingCode}</span>
                  )}
                </div>
              )}

              {trackingLink && (
                <a
                  href={trackingLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {trackingLink.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {event.createdBy && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Cập nhật bởi {event.createdBy.shopName || event.createdBy.name}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
