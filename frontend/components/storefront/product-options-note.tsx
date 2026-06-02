"use client";

import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export function getSelectedProductOptions(
  selectedOptions: unknown,
): Array<{ label: string; value: string }> {
  if (!selectedOptions || typeof selectedOptions !== "object") {
    return [];
  }

  const value = selectedOptions as Record<string, unknown>;
  const rows = [
    { label: "Màu", value: value.color },
    { label: "Chất liệu", value: value.material },
    { label: "Kích thước", value: value.size },
    { label: "Thời gian làm", value: value.processingTime },
  ];

  return rows
    .map((row) => ({
      label: row.label,
      value: typeof row.value === "string" ? row.value.trim() : "",
    }))
    .filter((row) => row.value.length > 0);
}

interface ProductOptionsNoteProps {
  selectedOptions: unknown;
  className?: string;
  compact?: boolean;
}

export function ProductOptionsNote({
  selectedOptions,
  className,
  compact = false,
}: ProductOptionsNoteProps) {
  const rows = getSelectedProductOptions(selectedOptions);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-amber-700/15 bg-amber-50/70 text-amber-950",
        compact ? "mt-2 px-3 py-2 text-xs" : "mt-4 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Palette className={compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} />
        <div className="min-w-0">
          <p className="font-semibold">Tùy chọn sản phẩm</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-foreground/80">
            {rows.map((row) => (
              <span key={row.label} className="break-words">
                <span className="font-medium">{row.label}:</span> {row.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
