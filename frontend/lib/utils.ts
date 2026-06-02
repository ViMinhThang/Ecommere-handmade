import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type ClassValue as ClassValueLucide } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function classNames(...inputs: (ClassValue[] | ClassValueLucide)[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number | string | null | undefined) {
  const numericAmount = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  return `${new Intl.NumberFormat("vi-VN").format(safeAmount)}\u00A0vnđ`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function stripProductSource(description: string) {
  return description
    .replace(/\s*(Nguồn|Source):\s*(https?:\/\/|www\.)[^\s<]+/gi, "")
    .trim();
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error !== "object" || error === null) {
    return fallback;
  }

  const maybeResponse = error as {
    response?: { data?: { message?: unknown } };
    data?: { message?: unknown };
    message?: unknown;
  };
  const message =
    maybeResponse.response?.data?.message ??
    maybeResponse.data?.message ??
    maybeResponse.message;

  if (Array.isArray(message)) {
    const messages = message.map((item) => String(item)).filter(Boolean);
    return messages.length > 0 ? messages.join(", ") : fallback;
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}
