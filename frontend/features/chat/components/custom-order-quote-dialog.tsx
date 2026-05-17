"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuoteTemplates } from "@/lib/api/hooks";
import type { SendCustomOrderQuoteDto } from "@/lib/api/chat";
import type { CustomOrderQuoteTemplate } from "@/lib/api/custom-order-quote-templates";

interface CustomOrderQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting?: boolean;
  onSubmit: (data: SendCustomOrderQuoteDto) => void;
}

const emptyForm = {
  templateId: "",
  title: "",
  description: "",
  price: "",
  leadTime: "",
  materialsText: "",
  sizeOptionsText: "",
  revisionPolicy: "",
  shippingNote: "",
  termsNote: "",
  message: "",
};

function linesFromStructuredValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : JSON.stringify(item),
      )
      .join("\n");
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const printable =
          typeof item === "string" || typeof item === "number"
            ? String(item)
            : JSON.stringify(item);
        return `${key}: ${printable}`;
      })
      .join("\n");
  }

  return "";
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function formatVnd(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `${new Intl.NumberFormat("vi-VN").format(amount)} vnđ`;
}

function formatTemplateRange(template: CustomOrderQuoteTemplate | null) {
  if (!template) return "";
  if (template.estimatedPrice) return formatVnd(template.estimatedPrice);
  if (template.minPrice && template.maxPrice) {
    return `${formatVnd(template.minPrice)} - ${formatVnd(template.maxPrice)}`;
  }
  if (template.minPrice) return `Từ ${formatVnd(template.minPrice)}`;
  if (template.maxPrice) return `Đến ${formatVnd(template.maxPrice)}`;
  return "";
}

function textLengthError(label: string, value: string, max: number) {
  return value.length > max ? `${label} không được vượt quá ${max} ký tự` : null;
}

export function CustomOrderQuoteDialog({
  open,
  onOpenChange,
  isSubmitting = false,
  onSubmit,
}: CustomOrderQuoteDialogProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const { data: templatesData, isLoading, isError, refetch } =
    useQuoteTemplates(open);

  const templates = useMemo(
    () => (templatesData ?? []).filter((template) => template.isActive),
    [templatesData],
  );
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === formData.templateId) ??
      null,
    [formData.templateId, templates],
  );
  const selectedRange = formatTemplateRange(selectedTemplate);

  useEffect(() => {
    if (open) {
      setFormData(emptyForm);
      setErrors([]);
    }
  }, [open]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      setFormData((current) => ({ ...current, templateId: "" }));
      return;
    }

    setFormData({
      templateId: template.id,
      title: template.title ?? "",
      description: template.description ?? "",
      price: template.estimatedPrice ?? "",
      leadTime: template.estimatedLeadTime ?? "",
      materialsText: linesFromStructuredValue(template.materials),
      sizeOptionsText: linesFromStructuredValue(template.sizeOptions),
      revisionPolicy: template.revisionPolicy ?? "",
      shippingNote: template.shippingNote ?? "",
      termsNote: template.termsNote ?? "",
      message: "",
    });
    setErrors([]);
  };

  const validationErrors = useMemo(() => {
    const nextErrors: string[] = [];
    const title = formData.title.trim();
    const price = Number(formData.price);

    if (!title) nextErrors.push("Tiêu đề báo giá không được để trống");
    if (title.length > 200) {
      nextErrors.push("Tiêu đề báo giá không được vượt quá 200 ký tự");
    }

    [
      textLengthError("Mô tả", formData.description, 4000),
      textLengthError("Thời gian dự kiến", formData.leadTime, 120),
      textLengthError("Chính sách chỉnh sửa", formData.revisionPolicy, 2000),
      textLengthError("Ghi chú vận chuyển", formData.shippingNote, 2000),
      textLengthError("Điều khoản", formData.termsNote, 2000),
      textLengthError("Tin nhắn", formData.message, 2000),
    ].forEach((error) => {
      if (error) nextErrors.push(error);
    });

    if (!formData.price.trim()) {
      nextErrors.push("Giá báo giá không được để trống");
    } else if (!Number.isFinite(price) || price <= 0) {
      nextErrors.push("Giá báo giá phải lớn hơn 0");
    }

    if (JSON.stringify(splitLines(formData.materialsText)).length > 6000) {
      nextErrors.push("Danh sách vật liệu quá dài");
    }
    if (JSON.stringify(splitLines(formData.sizeOptionsText)).length > 6000) {
      nextErrors.push("Danh sách kích thước/tùy chọn quá dài");
    }

    return nextErrors;
  }, [formData]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    onSubmit({
      templateId: optionalText(formData.templateId),
      title: formData.title.trim(),
      description: optionalText(formData.description),
      price: Number(formData.price),
      leadTime: optionalText(formData.leadTime),
      materials: splitLines(formData.materialsText),
      sizeOptions: splitLines(formData.sizeOptionsText),
      revisionPolicy: optionalText(formData.revisionPolicy),
      shippingNote: optionalText(formData.shippingNote),
      termsNote: optionalText(formData.termsNote),
      message: optionalText(formData.message),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Gửi báo giá thiết kế riêng</DialogTitle>
          <DialogDescription>
            Báo giá sẽ tạo đơn thiết kế riêng và gửi tin nhắn trong cùng một
            thao tác.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Vui lòng sửa các lỗi sau:
              </div>
              <ul className="list-inside list-disc space-y-1">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="quote-template">Mẫu báo giá</Label>
            <select
              id="quote-template"
              value={formData.templateId}
              onChange={(event) => applyTemplate(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
              disabled={isSubmitting || isLoading}
            >
              <option value="">Không dùng mẫu</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {isLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải mẫu báo giá...
              </p>
            ) : isError ? (
              <p className="text-xs text-destructive">
                Không tải được mẫu.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => void refetch()}
                >
                  Thử lại
                </button>
              </p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có mẫu đang hoạt động. Bạn vẫn có thể gửi báo giá thủ
                công hoặc{" "}
                <Link href="/seller/quote-templates" className="text-primary underline">
                  tạo mẫu mới
                </Link>
                .
              </p>
            ) : null}
            {selectedTemplate && selectedRange ? (
              <p className="text-xs text-muted-foreground">
                Khoảng giá từ mẫu: {selectedRange}. Giá cuối cùng phải nhập ở
                trường bên dưới.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
            <div className="grid gap-2">
              <Label htmlFor="quote-title">Tiêu đề báo giá</Label>
              <Input
                id="quote-title"
                value={formData.title}
                maxLength={200}
                onChange={(event) =>
                  setFormData({ ...formData, title: event.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-price">Giá cuối cùng</Label>
              <Input
                id="quote-price"
                type="number"
                min="1"
                step="1000"
                inputMode="decimal"
                value={formData.price}
                onChange={(event) =>
                  setFormData({ ...formData, price: event.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quote-description">Mô tả</Label>
            <Textarea
              id="quote-description"
              value={formData.description}
              maxLength={4000}
              rows={4}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="quote-materials">Vật liệu</Label>
              <Textarea
                id="quote-materials"
                value={formData.materialsText}
                rows={5}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    materialsText: event.target.value,
                  })
                }
                placeholder="Mỗi dòng là một vật liệu"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-options">Kích thước / tùy chọn</Label>
              <Textarea
                id="quote-options"
                value={formData.sizeOptionsText}
                rows={5}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    sizeOptionsText: event.target.value,
                  })
                }
                placeholder="Mỗi dòng là một tùy chọn"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quote-lead-time">Thời gian dự kiến</Label>
            <Input
              id="quote-lead-time"
              value={formData.leadTime}
              maxLength={120}
              onChange={(event) =>
                setFormData({ ...formData, leadTime: event.target.value })
              }
              placeholder="Ví dụ: 10-14 ngày"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="quote-revision">Chính sách chỉnh sửa</Label>
              <Textarea
                id="quote-revision"
                value={formData.revisionPolicy}
                maxLength={2000}
                rows={4}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    revisionPolicy: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-shipping">Ghi chú vận chuyển</Label>
              <Textarea
                id="quote-shipping"
                value={formData.shippingNote}
                maxLength={2000}
                rows={4}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    shippingNote: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-terms">Điều khoản</Label>
              <Textarea
                id="quote-terms"
                value={formData.termsNote}
                maxLength={2000}
                rows={4}
                onChange={(event) =>
                  setFormData({ ...formData, termsNote: event.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quote-message">Tin nhắn kèm theo</Label>
            <Textarea
              id="quote-message"
              value={formData.message}
              maxLength={2000}
              rows={3}
              onChange={(event) =>
                setFormData({ ...formData, message: event.target.value })
              }
              placeholder="Nếu để trống, hệ thống sẽ dùng tin nhắn mặc định."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang gửi..." : "Gửi báo giá"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
