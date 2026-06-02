"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Pencil, Plus, Star, Trash2, Truck } from "lucide-react";
import {
  useCreateShippingProfile,
  useDeleteShippingProfile,
  useSetDefaultShippingProfile,
  useShippingProfiles,
  useUpdateShippingProfile,
} from "@/lib/api/hooks";
import type { ShippingProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { ShippingEtaNote } from "@/components/storefront/shipping-eta-note";

type ShippingProfileFormState = {
  name: string;
  carrierName: string;
  trackingUrlTemplate: string;
  processingMinDays: number;
  processingMaxDays: number;
  transitMinDays: number;
  transitMaxDays: number;
  isDefault: boolean;
  isActive: boolean;
};

const emptyForm: ShippingProfileFormState = {
  name: "",
  carrierName: "",
  trackingUrlTemplate: "",
  processingMinDays: 1,
  processingMaxDays: 3,
  transitMinDays: 2,
  transitMaxDays: 5,
  isDefault: false,
  isActive: true,
};

function toForm(profile: ShippingProfile): ShippingProfileFormState {
  return {
    name: profile.name,
    carrierName: profile.carrierName,
    trackingUrlTemplate: profile.trackingUrlTemplate || "",
    processingMinDays: profile.processingMinDays,
    processingMaxDays: profile.processingMaxDays,
    transitMinDays: profile.transitMinDays,
    transitMaxDays: profile.transitMaxDays,
    isDefault: profile.isDefault,
    isActive: profile.isActive,
  };
}

function normalizeDays(value: number) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function validateForm(form: ShippingProfileFormState) {
  if (!form.name.trim()) {
    return "Vui lòng nhập tên hồ sơ vận chuyển.";
  }
  if (!form.carrierName.trim()) {
    return "Vui lòng nhập đơn vị vận chuyển.";
  }

  const processingMin = normalizeDays(form.processingMinDays);
  const processingMax = normalizeDays(form.processingMaxDays);
  const transitMin = normalizeDays(form.transitMinDays);
  const transitMax = normalizeDays(form.transitMaxDays);

  if (processingMax < processingMin) {
    return "Thời gian chuẩn bị tối đa phải lớn hơn hoặc bằng tối thiểu.";
  }
  if (transitMax < transitMin) {
    return "Thời gian giao tối đa phải lớn hơn hoặc bằng tối thiểu.";
  }
  if (processingMax > 60 || transitMax > 60) {
    return "Mỗi khoảng thời gian không nên vượt quá 60 ngày trong MVP.";
  }

  return null;
}

function buildPayload(form: ShippingProfileFormState) {
  return {
    name: form.name.trim(),
    carrierName: form.carrierName.trim(),
    trackingUrlTemplate: form.trackingUrlTemplate.trim() || null,
    processingMinDays: normalizeDays(form.processingMinDays),
    processingMaxDays: normalizeDays(form.processingMaxDays),
    transitMinDays: normalizeDays(form.transitMinDays),
    transitMaxDays: normalizeDays(form.transitMaxDays),
    isDefault: form.isDefault,
    isActive: form.isActive,
  };
}

export default function ShippingProfilesPage() {
  const { user } = useAuth();
  const isSeller = user?.roles?.includes("ROLE_SELLER");
  const { data: profiles = [], isLoading, error, refetch } = useShippingProfiles();
  const createProfile = useCreateShippingProfile();
  const updateProfile = useUpdateShippingProfile();
  const deleteProfile = useDeleteShippingProfile();
  const setDefaultProfile = useSetDefaultShippingProfile();
  const [form, setForm] = useState<ShippingProfileFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => profile.isActive && !profile.deletedAt),
    [profiles],
  );
  const isSaving = createProfile.isPending || updateProfile.isPending;

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
        await updateProfile.mutateAsync({ id: editingId, data: buildPayload(form) });
        toast.success("Đã cập nhật hồ sơ vận chuyển.");
      } else {
        await createProfile.mutateAsync(buildPayload(form));
        toast.success("Đã tạo hồ sơ vận chuyển.");
      }
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu hồ sơ vận chuyển.",
      );
    }
  };

  if (!isSeller) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        Chỉ tài khoản người bán mới quản lý hồ sơ vận chuyển.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2">
        <h1 className="artisan-title text-4xl">Hồ sơ vận chuyển</h1>
        <p className="artisan-subtitle">
          Cấu hình đơn vị vận chuyển và ETA dự kiến cho sản phẩm handmade.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách hồ sơ</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Đang tải hồ sơ vận chuyển...
              </div>
            ) : error ? (
              <div className="space-y-4 rounded-md border border-destructive/20 bg-destructive/5 p-5">
                <p className="text-sm text-destructive">
                  Không thể tải hồ sơ vận chuyển.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-8 text-center">
                <Truck className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 font-semibold">Chưa có hồ sơ vận chuyển</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tạo hồ sơ đầu tiên để sản phẩm hiển thị thời gian giao dự kiến.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-lg border border-border bg-background p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-foreground">
                            {profile.name}
                          </h2>
                          {profile.isDefault && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                              <Star className="h-3 w-3" />
                              Mặc định
                            </span>
                          )}
                          {!profile.isActive && (
                            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                              Đang tắt
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Đơn vị: {profile.carrierName}
                        </p>
                        {profile.trackingUrlTemplate && (
                          <p className="break-all text-xs text-muted-foreground">
                            Tracking URL: {profile.trackingUrlTemplate}
                          </p>
                        )}
                        <ShippingEtaNote profile={profile} compact />
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!profile.isDefault && profile.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setDefaultProfile.isPending}
                            onClick={async () => {
                              try {
                                await setDefaultProfile.mutateAsync(profile.id);
                                toast.success("Đã đặt làm hồ sơ mặc định.");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Không thể đặt mặc định.",
                                );
                              }
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mặc định
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(profile.id);
                            setForm(toForm(profile));
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deleteProfile.isPending}
                          onClick={async () => {
                            if (!confirm("Xóa hồ sơ vận chuyển này?")) {
                              return;
                            }
                            try {
                              await deleteProfile.mutateAsync(profile.id);
                              toast.success("Đã xóa hồ sơ vận chuyển.");
                              if (editingId === profile.id) {
                                resetForm();
                              }
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Không thể xóa hồ sơ vận chuyển.",
                              );
                            }
                          }}
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
              <Plus className="h-5 w-5" />
              {editingId ? "Sửa hồ sơ" : "Tạo hồ sơ"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="shipping-name">Tên hồ sơ</Label>
                <Input
                  id="shipping-name"
                  value={form.name}
                  maxLength={80}
                  placeholder="Ví dụ: Giao hàng tiêu chuẩn"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-carrier">Đơn vị vận chuyển</Label>
                <Input
                  id="shipping-carrier"
                  value={form.carrierName}
                  maxLength={80}
                  placeholder="Ví dụ: GHN, GHTK, Viettel Post"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      carrierName: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-url-template">
                  Mẫu tracking URL
                </Label>
                <Input
                  id="tracking-url-template"
                  value={form.trackingUrlTemplate}
                  maxLength={300}
                  placeholder="https://example.com/track/{trackingCode}"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      trackingUrlTemplate: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Có thể dùng {"{trackingCode}"} để tạo link theo mã vận đơn.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Chuẩn bị tối thiểu</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.processingMinDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        processingMinDays: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chuẩn bị tối đa</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.processingMaxDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        processingMaxDays: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giao tối thiểu</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.transitMinDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transitMinDays: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giao tối đa</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.transitMaxDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transitMaxDays: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="shipping-active">Đang sử dụng</Label>
                  <Switch
                    id="shipping-active"
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isActive: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="shipping-default">Đặt làm mặc định</Label>
                  <Switch
                    id="shipping-default"
                    checked={form.isDefault}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, isDefault: checked }))
                    }
                  />
                </div>
              </div>

              <ShippingEtaNote profile={buildPayload(form) as ShippingProfile} />

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo hồ sơ"}
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

      {activeProfiles.length === 0 && profiles.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tất cả hồ sơ đang bị tắt. Sản phẩm sẽ dùng ETA mặc định cho đến khi có
          ít nhất một hồ sơ active.
        </div>
      )}
    </div>
  );
}
