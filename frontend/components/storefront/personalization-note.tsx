"use client";

import { PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

export type PersonalizationValue =
  | {
      text?: string | null;
    }
  | null
  | undefined;

export function getPersonalizationText(personalization: unknown): string {
  if (!personalization || typeof personalization !== "object") {
    return "";
  }

  const value = (personalization as { text?: unknown }).text;
  return typeof value === "string" ? value.trim() : "";
}

interface PersonalizationNoteProps {
  personalization: unknown;
  className?: string;
  compact?: boolean;
}

export function PersonalizationNote({
  personalization,
  className,
  compact = false,
}: PersonalizationNoteProps) {
  const text = getPersonalizationText(personalization);

  if (!text) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-primary/15 bg-primary/5 text-primary",
        compact ? "mt-2 px-3 py-2 text-xs" : "mt-4 px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <PencilLine className={compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} />
        <div className="min-w-0">
          <p className="font-semibold">Yêu cầu cá nhân hóa</p>
          <p className="mt-1 break-words text-foreground/80">{text}</p>
        </div>
      </div>
    </div>
  );
}
