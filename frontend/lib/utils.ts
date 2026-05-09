import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type ClassValue as ClassValueLucide } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function classNames(...inputs: (ClassValue[] | ClassValueLucide)[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
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
