import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type ClassValue as ClassValueLucide } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function classNames(...inputs: (ClassValue[] | ClassValueLucide)[]) {
  return twMerge(clsx(inputs))
}
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' vnđ';
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
