"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Gift, GripVertical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  useAdminGiftWrapTiers,
  useCreateGiftWrapTier,
  useDeleteGiftWrapTier,
  useUpdateGiftWrapTier,
} from "@/lib/api/hooks";
import type { GiftWrapTier } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type GiftWrapTierFormState = {
  name: string;
  description: string;
  price: string;
  includesCard: boolean;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: GiftWrapTierFormState = {
  name: "",
  description: "",
  price: "0",
  includesCard: false,
  sortOrder: "0",
  isActive: true,
};

function toForm(tier: GiftWrapTier): GiftWrapTierFormState {
  return {
    name: tier.name,
    description: tier.description || "",
    price: String(Math.max(0, Math.floor(Number(tier.price) || 0))),
    includesCard: tier.includesCard,
    sortOrder: String(Math.max(0, Math.floor(Number(tier.sortOrder) || 0))),
    isActive: tier.isActive,
  };
}

function parseNonNegativeInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function validateForm(form: GiftWrapTierFormState) {
  if (!form.name.trim()) {
    return "Vui lòng nhập tên mức gói quà.";
  }

  if (form.name.trim().length > 80) {
    return "Tên mức gói quà không được vượt quá 80 ký tự.";
  }

  if (form.description.trim().length > 500) {
    return "Mô tả gói quà không được vượt quá 500 ký tự.";
  }

  const price = parseNonNegativeInteger(form.price);
  if (price === null) {
    return "Phí gói quà phải là số nguyên VNĐ từ 0 trở lên.";
  }

  if (price > 500000) {
    return "Phí gói quà không nên vượt quá 500.000 VNĐ trong MVP.";
  }

  const sortOrder = parseNonNegativeInteger(form.sortOrder);
  if (sortOrder === null) {
    return "Thứ tự hiển thị phải là số nguyên từ 0 trở lên.";
  }

  return null;
}

function buildPayload(form: GiftWrapTierFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: parseNonNegativeInteger(form.price) ?? 0,
    includesCard: form.includesCard,
    sortOrder: parseNonNegativeInteger(form.sortOrder) ?? 0,
    isActive: form.isActive,
  };
}

function getMutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function DashboardGiftWrapTiersPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("ROLE_ADMIN");
  const { data: tiers = [], isLoading, isError, refetch } =
    useAdminGiftWrapTiers(Boolean(isAdmin));
  const createTier = useCreateGiftWrapTier();
  const updateTier = useUpdateGiftWrapTier();
  const deleteTier = useDeleteGiftWrapTier();
  const [form, setForm] = useState<GiftWrapTierFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedTierId, setDraggedTierId] = useState<string | null>(null);

  const sortedTiers = useMemo(
    () =>
      [...tiers].sort((a, b) => {
        const sortDiff = Number(a.sortOrder) - Number(b.sortOrder);
        if (sortDiff !== 0) return sortDiff;
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }),
    [tiers],
  );
  const activeCount = useMemo(
    () => tiers.filter((tier) => tier.isActive && !tier.deletedAt).length,
    [tiers],
  );
  const tiersWithCardCount = useMemo(
    () => tiers.filter((tier) => tier.includesCard && !tier.deletedAt).length,
    [tiers],
  );
  const isSaving = createTier.isPending || updateTier.isPending;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errorMessage = validateForm(form);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    try {
      if (editingId) {
        await updateTier.mutateAsync({ id: editingId, data: buildPayload(form) });
        toast.success("Đã cập nhật mức gói quà.");
      } else {
        await createTier.mutateAsync(buildPayload(form));
        toast.success("Đã tạo mức gói quà.");
      }
      resetForm();
    } catch (error) {
      toast.error(
        getMutationErrorMessage(error, "Không thể lưu mức gói quà."),
      );
    }
  };

  const handleToggleActive = async (tier: GiftWrapTier) => {
    try {
      await updateTier.mutateAsync({
        id: tier.id,
        data: { isActive: !tier.isActive },
      });
      toast.success(
        tier.isActive
          ? "Đã tắt mức gói quà khỏi checkout."
          : "Đã bật mức gói quà cho checkout.",
      );
    } catch (error) {
      toast.error(
        getMutationErrorMessage(error, "Không thể đổi trạng thái gói quà."),
      );
    }
  };

  const handleDelete = async (tier: GiftWrapTier) => {
    if (!confirm(`Xóa mức gói quà "${tier.name}"?`)) {
      return;
    }

    try {
      await deleteTier.mutateAsync(tier.id);
      toast.success("Đã xóa mức gói quà.");
      if (editingId === tier.id) {
        resetForm();
      }
    } catch (error) {
      toast.error(getMutationErrorMessage(error, "Không thể xóa mức gói quà."));
    }
  };

  const handleDropReorder = async (targetTierId: string) => {
    if (!draggedTierId || draggedTierId === targetTierId) {
      setDraggedTierId(null);
      return;
    }

    const fromIndex = sortedTiers.findIndex((tier) => tier.id === draggedTierId);
    const toIndex = sortedTiers.findIndex((tier) => tier.id === targetTierId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggedTierId(null);
      return;
    }

    const nextOrder = [...sortedTiers];
    const [movedTier] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, movedTier);

    const updates = nextOrder
      .map((tier, index) => ({
        id: tier.id,
        sortOrder: index * 10,
      }))
      .filter((item) => {
        const tier = sortedTiers.find((current) => current.id === item.id);
        return Number(tier?.sortOrder ?? 0) !== item.sortOrder;
      });

    if (updates.length === 0) {
      setDraggedTierId(null);
      return;
    }

    try {
      await Promise.all(
        updates.map((item) =>
          updateTier.mutateAsync({
            id: item.id,
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
      toast.success("Đã cập nhật thứ tự gói quà.");
    } catch (error) {
      toast.error(
        getMutationErrorMessage(error, "Không thể cập nhật thứ tự gói quà."),
      );
    } finally {
      setDraggedTierId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        Chỉ quản trị viên mới có thể quản lý mức gói quà.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Mức gói quà</h1>
          <p className="artisan-subtitle">
            Quản lý các lựa chọn gói quà, thiệp viết tay và phí hiển thị ở
            checkout.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={resetForm}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo mới
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng mức gói quà</p>
            <p className="text-2xl font-bold">{tiers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang hiển thị</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Có kèm thiệp</p>
            <p className="text-2xl font-bold text-primary">
              {tiersWithCardCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Danh sách mức gói quà</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tải lại
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Đang tải danh sách gói quà...
              </div>
            ) : isError ? (
              <div className="space-y-4 rounded-md border border-destructive/20 bg-destructive/5 p-5">
                <p className="text-sm text-destructive">
                  Không thể tải danh sách mức gói quà.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : tiers.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-8 text-center">
                <Gift className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 font-semibold">Chưa có mức gói quà</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tạo mức đầu tiên để khách chọn gói quà tại checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Kéo biểu tượng tay nắm để đổi thứ tự hiển thị ở checkout.
                </p>
                {sortedTiers.map((tier) => (
                  <div
                    key={tier.id}
                    draggable={!updateTier.isPending}
                    onDragStart={() => setDraggedTierId(tier.id)}
                    onDragEnd={() => setDraggedTierId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDropReorder(tier.id)}
                    className={`rounded-lg border border-border bg-background p-5 transition-colors ${
                      draggedTierId === tier.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className="mt-1 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground active:cursor-grabbing"
                          aria-label="Kéo để đổi thứ tự"
                          title="Kéo để đổi thứ tự"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-foreground">
                            {tier.name}
                          </h2>
                          <Badge variant={tier.isActive ? "default" : "secondary"}>
                            {tier.isActive ? "Đang bật" : "Đang tắt"}
                          </Badge>
                          {tier.includesCard && (
                            <Badge variant="outline">Kèm thiệp</Badge>
                          )}
                        </div>
                        {tier.description ? (
                          <p className="max-w-2xl text-sm text-muted-foreground">
                            {tier.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-muted px-3 py-1 font-medium">
                            Phí: {formatCurrency(Number(tier.price))}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1">
                            Thứ tự: {tier.sortOrder}
                          </span>
                        </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updateTier.isPending}
                          onClick={() => handleToggleActive(tier)}
                        >
                          {tier.isActive ? "Tắt" : "Bật"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(tier.id);
                            setForm(toForm(tier));
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deleteTier.isPending}
                          onClick={() => handleDelete(tier)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {editingId ? "Sửa mức gói quà" : "Tạo mức gói quà"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="gift-wrap-name">Tên mức gói quà</Label>
                <Input
                  id="gift-wrap-name"
                  value={form.name}
                  maxLength={80}
                  placeholder="Ví dụ: Hộp quà cao cấp"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-wrap-description">Mô tả</Label>
                <Textarea
                  id="gift-wrap-description"
                  value={form.description}
                  maxLength={500}
                  rows={4}
                  placeholder="Mô tả chất liệu gói, ruy băng, thiệp hoặc phụ kiện đi kèm"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {form.description.length}/500 ký tự
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gift-wrap-price">Phí gói quà</Label>
                  <Input
                    id="gift-wrap-price"
                    type="number"
                    min={0}
                    max={500000}
                    step={1000}
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-wrap-sort">Thứ tự</Label>
                  <Input
                    id="gift-wrap-sort"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="gift-wrap-card">Kèm thiệp viết tay</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Khi bật, checkout tự đánh dấu đơn có thiệp.
                    </p>
                  </div>
                  <Switch
                    id="gift-wrap-card"
                    checked={form.includesCard}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        includesCard: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="gift-wrap-active">Hiển thị tại checkout</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tier đang tắt không hiển thị cho khách.
                    </p>
                  </div>
                  <Switch
                    id="gift-wrap-active"
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isActive: checked }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-md border border-dashed border-border p-4 text-sm">
                <p className="font-semibold">Xem trước</p>
                <p className="mt-2">{form.name.trim() || "Tên mức gói quà"}</p>
                <p className="text-muted-foreground">
                  {formatCurrency(parseNonNegativeInteger(form.price) ?? 0)}
                  {form.includesCard ? " · Kèm thiệp viết tay" : ""}
                </p>
                {form.description.trim() ? (
                  <p className="mt-2 text-muted-foreground">
                    {form.description.trim()}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo mức gói quà"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Hủy sửa
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
