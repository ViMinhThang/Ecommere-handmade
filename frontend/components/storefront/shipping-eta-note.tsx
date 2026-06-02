"use client";

import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShippingProfile, ShippingProfileSnapshot, SubOrder } from "@/types";

function normalizeDay(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.max(0, Math.floor(numberValue));
}

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDayRange(minDays: number, maxDays: number) {
  if (minDays === maxDays) {
    return `${minDays} ngày`;
  }

  return `${minDays}-${maxDays} ngày`;
}

export function getShippingEtaText(profile?: ShippingProfile | null) {
  if (!profile) {
    return "Dự kiến nhận hàng: 3-8 ngày";
  }

  const minDays =
    normalizeDay(profile.processingMinDays, 1) +
    normalizeDay(profile.transitMinDays, 2);
  const maxDays =
    Math.max(
      normalizeDay(profile.processingMaxDays, 3),
      normalizeDay(profile.processingMinDays, 1),
    ) +
    Math.max(
      normalizeDay(profile.transitMaxDays, 5),
      normalizeDay(profile.transitMinDays, 2),
    );

  return `Dự kiến nhận hàng: ${formatDayRange(minDays, maxDays)}`;
}

export function getSubOrderEtaText(subOrder: Pick<
  SubOrder,
  | "estimatedDeliveryStartAt"
  | "estimatedDeliveryEndAt"
  | "shippingProfileSnapshot"
>) {
  const start = formatDate(subOrder.estimatedDeliveryStartAt);
  const end = formatDate(subOrder.estimatedDeliveryEndAt);

  if (start && end && start !== end) {
    return `Dự kiến nhận hàng: ${start} - ${end}`;
  }

  if (start || end) {
    return `Dự kiến nhận hàng: ${start || end}`;
  }

  const snapshot = subOrder.shippingProfileSnapshot as ShippingProfileSnapshot | null;
  const processingMin = normalizeDay(snapshot?.processingMinDays, 1);
  const processingMax = Math.max(
    processingMin,
    normalizeDay(snapshot?.processingMaxDays, 3),
  );
  const transitMin = normalizeDay(snapshot?.transitMinDays, 2);
  const transitMax = Math.max(transitMin, normalizeDay(snapshot?.transitMaxDays, 5));

  return `Dự kiến nhận hàng: ${formatDayRange(
    processingMin + transitMin,
    processingMax + transitMax,
  )}`;
}

interface ShippingEtaNoteProps {
  profile?: ShippingProfile | null;
  subOrder?: Pick<
    SubOrder,
    | "estimatedDeliveryStartAt"
    | "estimatedDeliveryEndAt"
    | "shippingProfileSnapshot"
  > | null;
  className?: string;
  compact?: boolean;
}

export function ShippingEtaNote({
  profile,
  subOrder,
  className,
  compact = false,
}: ShippingEtaNoteProps) {
  const snapshot = subOrder?.shippingProfileSnapshot as ShippingProfileSnapshot | null;
  const title =
    snapshot?.name ||
    profile?.name ||
    "Hồ sơ vận chuyển";
  const carrier =
    snapshot?.carrierName ||
    profile?.carrierName ||
    "Đơn vị vận chuyển tiêu chuẩn";
  const etaText = subOrder ? getSubOrderEtaText(subOrder) : getShippingEtaText(profile);

  return (
    <div
      className={cn(
        "rounded-md border border-emerald-700/15 bg-emerald-50/70 text-emerald-950",
        compact ? "mt-2 px-3 py-2 text-xs" : "mt-4 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Truck className={compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-foreground/80">{etaText}</p>
          <p className="mt-0.5 text-foreground/65">Đơn vị: {carrier}</p>
        </div>
      </div>
    </div>
  );
}
