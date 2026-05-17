"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { RoleRoute } from "@/components/role-route";
import { QuoteTemplateDialog } from "@/components/dashboard/quote-template-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateQuoteTemplate,
  useDeleteQuoteTemplate,
  useQuoteTemplates,
  useUpdateQuoteTemplate,
} from "@/lib/api/hooks";
import type {
  CreateCustomOrderQuoteTemplateDto,
  CustomOrderQuoteTemplate,
  UpdateCustomOrderQuoteTemplateDto,
} from "@/lib/api/custom-order-quote-templates";
import { getErrorMessage } from "@/lib/utils";

function formatVnd(value: string | null) {
  if (value === null) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `${new Intl.NumberFormat("vi-VN").format(amount)} vnđ`;
}

function formatTemplatePrice(template: CustomOrderQuoteTemplate) {
  if (template.estimatedPrice !== null) {
    return formatVnd(template.estimatedPrice);
  }

  if (template.minPrice !== null && template.maxPrice !== null) {
    return `${formatVnd(template.minPrice)} - ${formatVnd(template.maxPrice)}`;
  }

  if (template.minPrice !== null) {
    return `Từ ${formatVnd(template.minPrice)}`;
  }

  if (template.maxPrice !== null) {
    return `Đến ${formatVnd(template.maxPrice)}`;
  }

  return "Chưa đặt giá";
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function QuoteTemplatesContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CustomOrderQuoteTemplate | null>(null);

  const {
    data: templatesData,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuoteTemplates();
  const createTemplate = useCreateQuoteTemplate();
  const updateTemplate = useUpdateQuoteTemplate();
  const deleteTemplate = useDeleteQuoteTemplate();

  const templates = useMemo(() => templatesData ?? [], [templatesData]);
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;

    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(query) ||
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        (template.estimatedLeadTime ?? "").toLowerCase().includes(query)
      );
    });
  }, [searchQuery, templates]);

  const activeTemplates = templates.filter((template) => template.isActive);
  const inactiveTemplates = templates.length - activeTemplates.length;
  const pricedTemplates = templates.filter(
    (template) =>
      template.estimatedPrice !== null ||
      template.minPrice !== null ||
      template.maxPrice !== null,
  );
  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  const openCreateDialog = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: CustomOrderQuoteTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleSave = (
    data:
      | CreateCustomOrderQuoteTemplateDto
      | UpdateCustomOrderQuoteTemplateDto,
  ) => {
    if (selectedTemplate) {
      updateTemplate.mutate(
        {
          id: selectedTemplate.id,
          data,
        },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật mẫu báo giá");
            setDialogOpen(false);
            setSelectedTemplate(null);
          },
          onError: (mutationError) => {
            toast.error(
              getErrorMessage(mutationError, "Không thể cập nhật mẫu báo giá"),
            );
          },
        },
      );
      return;
    }

    createTemplate.mutate(data as CreateCustomOrderQuoteTemplateDto, {
      onSuccess: () => {
        toast.success("Đã tạo mẫu báo giá");
        setDialogOpen(false);
        setSelectedTemplate(null);
      },
      onError: (mutationError) => {
        toast.error(
          getErrorMessage(mutationError, "Không thể tạo mẫu báo giá"),
        );
      },
    });
  };

  const handleDelete = (template: CustomOrderQuoteTemplate) => {
    if (
      !window.confirm(
        `Xóa mẫu báo giá "${template.name}"? Mẫu đã gửi trong chat sẽ không bị thay đổi.`,
      )
    ) {
      return;
    }

    deleteTemplate.mutate(template.id, {
      onSuccess: () => {
        toast.success("Đã xóa mẫu báo giá");
      },
      onError: (mutationError) => {
        toast.error(
          getErrorMessage(mutationError, "Không thể xóa mẫu báo giá"),
        );
      },
    });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Mẫu báo giá</h1>
          <p className="mt-2 text-muted-foreground">
            Quản lý các mẫu báo giá để phản hồi đơn thiết kế riêng nhanh và
            nhất quán hơn.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Tạo mẫu báo giá
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng mẫu</p>
            <p className="text-2xl font-bold">{templates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-700">
              {activeTemplates.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Có cấu hình giá</p>
            <p className="text-2xl font-bold text-primary">
              {pricedTemplates.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Danh sách mẫu báo giá</CardTitle>
              {inactiveTemplates > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {inactiveTemplates} mẫu đang tạm tắt.
                </p>
              )}
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                placeholder="Tìm theo tên, tiêu đề..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải mẫu báo giá...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <FileText className="h-11 w-11 text-muted-foreground/60" />
              <div>
                <p className="font-medium">Không tải được danh sách mẫu</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getErrorMessage(error, "Vui lòng thử lại sau.")}
                </p>
              </div>
              <Button variant="outline" onClick={() => void refetch()}>
                <RefreshCcw className="h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {templates.length === 0
                    ? "Chưa có mẫu báo giá"
                    : "Không tìm thấy mẫu phù hợp"}
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Tạo mẫu cho các loại đơn thiết kế thường gặp để giảm thời gian
                  nhập lại nội dung trong chat.
                </p>
              </div>
              {templates.length === 0 && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Tạo mẫu báo giá
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên mẫu</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Thời gian dự kiến</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="min-w-48">
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="mt-1 max-w-72 truncate text-xs text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <span className="line-clamp-2">{template.title}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-primary">
                        {formatTemplatePrice(template)}
                      </TableCell>
                      <TableCell className="max-w-48 text-sm text-muted-foreground">
                        {template.estimatedLeadTime || "Chưa đặt"}
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            Hoạt động
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Tạm tắt</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatUpdatedAt(template.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(template)}
                            aria-label={`Sửa mẫu ${template.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(template)}
                            disabled={deleteTemplate.isPending}
                            aria-label={`Xóa mẫu ${template.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </div>
  );
}

export default function SellerQuoteTemplatesPage() {
  return (
    <RoleRoute allowedRoles={["ROLE_SELLER"]} fallbackPath="/dashboard">
      <QuoteTemplatesContent />
    </RoleRoute>
  );
}
