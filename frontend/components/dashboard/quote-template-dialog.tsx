"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateCustomOrderQuoteTemplateDto,
  CustomOrderQuoteTemplate,
  UpdateCustomOrderQuoteTemplateDto,
} from "@/lib/api/custom-order-quote-templates";

interface QuoteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CustomOrderQuoteTemplate | null;
  isSaving?: boolean;
  onSave: (
    data:
      | CreateCustomOrderQuoteTemplateDto
      | UpdateCustomOrderQuoteTemplateDto,
  ) => void;
}

const emptyForm = {
  name: "",
  title: "",
  description: "",
  estimatedPrice: "",
  minPrice: "",
  maxPrice: "",
  materialsText: "",
  sizeOptionsText: "",
  estimatedLeadTime: "",
  revisionPolicy: "",
  shippingNote: "",
  termsNote: "",
  isActive: true,
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

function optionalNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function textLengthError(label: string, value: string, max: number) {
  return value.length > max ? `${label} không được vượt quá ${max} ký tự` : null;
}

export function QuoteTemplateDialog({
  open,
  onOpenChange,
  template,
  isSaving = false,
  onSave,
}: QuoteTemplateDialogProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);

  const isEdit = !!template;

  useEffect(() => {
    if (!open) return;

    if (template) {
      setFormData({
        name: template.name ?? "",
        title: template.title ?? "",
        description: template.description ?? "",
        estimatedPrice: template.estimatedPrice ?? "",
        minPrice: template.minPrice ?? "",
        maxPrice: template.maxPrice ?? "",
        materialsText: linesFromStructuredValue(template.materials),
        sizeOptionsText: linesFromStructuredValue(template.sizeOptions),
        estimatedLeadTime: template.estimatedLeadTime ?? "",
        revisionPolicy: template.revisionPolicy ?? "",
        shippingNote: template.shippingNote ?? "",
        termsNote: template.termsNote ?? "",
        isActive: template.isActive,
      });
    } else {
      setFormData(emptyForm);
    }

    setErrors([]);
  }, [open, template]);

  const validationErrors = useMemo(() => {
    const nextErrors: string[] = [];
    const name = formData.name.trim();
    const title = formData.title.trim();
    const estimatedPrice = optionalNumber(formData.estimatedPrice);
    const minPrice = optionalNumber(formData.minPrice);
    const maxPrice = optionalNumber(formData.maxPrice);

    if (!name) nextErrors.push("Tên mẫu không được để trống");
    if (name.length > 120) nextErrors.push("Tên mẫu không được vượt quá 120 ký tự");
    if (!title) nextErrors.push("Tiêu đề báo giá không được để trống");
    if (title.length > 200) {
      nextErrors.push("Tiêu đề báo giá không được vượt quá 200 ký tự");
    }

    [
      textLengthError("Mô tả", formData.description, 4000),
      textLengthError("Thời gian dự kiến", formData.estimatedLeadTime, 120),
      textLengthError("Chính sách chỉnh sửa", formData.revisionPolicy, 2000),
      textLengthError("Ghi chú vận chuyển", formData.shippingNote, 2000),
      textLengthError("Điều khoản", formData.termsNote, 2000),
    ].forEach((error) => {
      if (error) nextErrors.push(error);
    });

    [
      ["Giá ước tính", estimatedPrice],
      ["Giá thấp nhất", minPrice],
      ["Giá cao nhất", maxPrice],
    ].forEach(([label, value]) => {
      if (typeof value === "number" && !Number.isFinite(value)) {
        nextErrors.push(`${label} phải là số hợp lệ`);
      }
      if (typeof value === "number" && Number.isFinite(value) && value < 0) {
        nextErrors.push(`${label} phải lớn hơn hoặc bằng 0`);
      }
    });

    if (
      typeof minPrice === "number" &&
      Number.isFinite(minPrice) &&
      typeof maxPrice === "number" &&
      Number.isFinite(maxPrice) &&
      minPrice > maxPrice
    ) {
      nextErrors.push("Giá thấp nhất phải nhỏ hơn hoặc bằng giá cao nhất");
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

    const estimatedPrice = optionalNumber(formData.estimatedPrice);
    const minPrice = optionalNumber(formData.minPrice);
    const maxPrice = optionalNumber(formData.maxPrice);

    onSave({
      name: formData.name.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      estimatedPrice,
      minPrice,
      maxPrice,
      materials: splitLines(formData.materialsText),
      sizeOptions: splitLines(formData.sizeOptionsText),
      estimatedLeadTime: formData.estimatedLeadTime.trim(),
      revisionPolicy: formData.revisionPolicy.trim(),
      shippingNote: formData.shippingNote.trim(),
      termsNote: formData.termsNote.trim(),
      isActive: formData.isActive,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa mẫu báo giá" : "Tạo mẫu báo giá"}
          </DialogTitle>
          <DialogDescription>
            Lưu các nội dung báo giá thường dùng để dùng lại trong cuộc trò
            chuyện với khách hàng.
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="template-name">Tên mẫu</Label>
              <Input
                id="template-name"
                value={formData.name}
                maxLength={120}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
                placeholder="Ví dụ: Cốc gốm cá nhân hóa"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-title">Tiêu đề báo giá</Label>
              <Input
                id="template-title"
                value={formData.title}
                maxLength={200}
                onChange={(event) =>
                  setFormData({ ...formData, title: event.target.value })
                }
                placeholder="Báo giá cốc gốm thủ công"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-description">Mô tả</Label>
            <Textarea
              id="template-description"
              value={formData.description}
              maxLength={4000}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  description: event.target.value,
                })
              }
              placeholder="Mô tả phạm vi chế tác, phong cách và các chi tiết khách cần xác nhận..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="estimated-price">Giá ước tính</Label>
              <Input
                id="estimated-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={formData.estimatedPrice}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    estimatedPrice: event.target.value,
                  })
                }
                placeholder="1500000"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="min-price">Giá thấp nhất</Label>
              <Input
                id="min-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={formData.minPrice}
                onChange={(event) =>
                  setFormData({ ...formData, minPrice: event.target.value })
                }
                placeholder="1000000"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="max-price">Giá cao nhất</Label>
              <Input
                id="max-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={formData.maxPrice}
                onChange={(event) =>
                  setFormData({ ...formData, maxPrice: event.target.value })
                }
                placeholder="2500000"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="materials">Vật liệu</Label>
              <Textarea
                id="materials"
                value={formData.materialsText}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    materialsText: event.target.value,
                  })
                }
                placeholder={"Gốm stoneware\nMen tro tự nhiên\nHộp giấy tái chế"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Mỗi dòng sẽ được lưu thành một mục vật liệu.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="size-options">Kích thước / tùy chọn</Label>
              <Textarea
                id="size-options"
                value={formData.sizeOptionsText}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    sizeOptionsText: event.target.value,
                  })
                }
                placeholder={"Dung tích 250ml\nKhắc tên tối đa 12 ký tự\nChọn men xanh hoặc nâu"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Mỗi dòng sẽ được lưu thành một mục tùy chọn.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-time">Thời gian dự kiến</Label>
            <Input
              id="lead-time"
              value={formData.estimatedLeadTime}
              maxLength={120}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  estimatedLeadTime: event.target.value,
                })
              }
              placeholder="Ví dụ: 10-14 ngày sau khi xác nhận thiết kế"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="revision-policy">Chính sách chỉnh sửa</Label>
              <Textarea
                id="revision-policy"
                value={formData.revisionPolicy}
                maxLength={2000}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    revisionPolicy: event.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shipping-note">Ghi chú vận chuyển</Label>
              <Textarea
                id="shipping-note"
                value={formData.shippingNote}
                maxLength={2000}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    shippingNote: event.target.value,
                  })
                }
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="terms-note">Điều khoản</Label>
              <Textarea
                id="terms-note"
                value={formData.termsNote}
                maxLength={2000}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    termsNote: event.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/35 px-3 py-3">
            <div>
              <Label htmlFor="template-active">Trạng thái hoạt động</Label>
              <p className="text-xs text-muted-foreground">
                Chỉ mẫu đang hoạt động nên được dùng để gửi báo giá.
              </p>
            </div>
            <Switch
              id="template-active"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo mẫu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
