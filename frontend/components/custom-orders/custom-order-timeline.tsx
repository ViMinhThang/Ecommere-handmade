"use client";

import { CheckCircle2, Clock, Hammer, ImageIcon, PackageCheck, Truck } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { useCustomOrderProgressEvents } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import type { CustomOrder, CustomOrderProgressEvent } from "@/lib/api/custom-orders";
import { cn, formatDate } from "@/lib/utils";

const statusLabels: Record<CustomOrder["status"], string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt phác thảo",
  REVISION_REQUESTED: "Yêu cầu chỉnh sửa",
  AWAITING_PAYMENT: "Chờ thanh toán",
  CRAFTING: "Đang chế tác",
  FINISHING: "Đang hoàn thiện",
  SHIPPED: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

function getStatusIcon(status?: CustomOrder["status"] | null) {
  if (status === "CRAFTING") return Hammer;
  if (status === "FINISHING") return PackageCheck;
  if (status === "SHIPPED") return Truck;
  if (status === "DELIVERED") return CheckCircle2;
  return Clock;
}

function getActorLabel(event: CustomOrderProgressEvent) {
  if (event.actor?.roles?.includes("ROLE_ADMIN")) return "Quản trị viên";
  if (event.actor?.roles?.includes("ROLE_SELLER")) {
    return event.actor.shopName || event.actor.name || "Người bán";
  }
  return event.actor?.name || "Người cập nhật";
}

export function CustomOrderTimeline({
  customOrderId,
  className,
}: {
  customOrderId: string;
  className?: string;
}) {
  const { data: events = [], isLoading, isError } = useCustomOrderProgressEvents(
    customOrderId,
    Boolean(customOrderId),
  );

  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A35C3D]">
            Tiến độ chế tác
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-slate-900">
            Nhật ký sản phẩm handmade
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex animate-pulse gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không thể tải tiến độ chế tác. Vui lòng thử lại sau.
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            Chưa có cập nhật tiến độ nào.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Khi người bán cập nhật quá trình chế tác, nhật ký sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-6">
          {events.map((event, index) => {
            const Icon = getStatusIcon(event.status);
            const imageUrl = event.imageUrl ? mediaApi.getImageUrl(event.imageUrl) : null;
            return (
              <li key={event.id} className="relative flex gap-4">
                {index < events.length - 1 ? (
                  <span className="absolute left-5 top-11 h-[calc(100%+0.5rem)] w-px bg-slate-200" />
                ) : null}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5C6E5E] text-white shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{event.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.status ? statusLabels[event.status] : "Cập nhật"} ·{" "}
                        {getActorLabel(event)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>

                  {event.note ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {event.note}
                    </p>
                  ) : null}

                  {imageUrl ? (
                    <div className="relative mt-4 h-44 overflow-hidden rounded-lg border border-slate-200 bg-white sm:w-72">
                      <SafeImage
                        src={imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-400">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Chưa đính kèm ảnh
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
