"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { RoleRoute } from "@/components/role-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCategories,
  usePlatformSettings,
  useUpdatePlatformSettings,
} from "@/lib/api/hooks";
import type { PlatformSettings } from "@/lib/api/settings";
import { getErrorMessage } from "@/lib/utils";

function PlatformSettingsForm({
  platformSettings,
}: {
  platformSettings: PlatformSettings;
}) {
  const updateSettings = useUpdatePlatformSettings();
  const [settings, setSettings] = useState({
    platformName: platformSettings.platformName,
    platformDescription: platformSettings.platformDescription,
    commissionRate: platformSettings.commissionBps / 100,
  });

  const handleSave = () => {
    const commissionBps = Math.round(settings.commissionRate * 100);
    if (commissionBps < 0 || commissionBps > 10000) {
      toast.error("Tỷ lệ hoa hồng phải nằm trong khoảng 0-100%.");
      return;
    }

    updateSettings.mutate(
      {
        platformName: settings.platformName,
        platformDescription: settings.platformDescription,
        commissionBps,
      },
      {
        onSuccess: () => toast.success("Cài đặt nền tảng đã được lưu."),
        onError: (error) =>
          toast.error(getErrorMessage(error, "Không thể lưu cài đặt.")),
      },
    );
  };

  return (
    <>
      <Card className="bg-[#ffffffd9]">
        <CardHeader>
          <CardTitle>Thông tin nền tảng</CardTitle>
          <CardDescription>Cập nhật tên và mô tả marketplace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platformName">Tên nền tảng</Label>
            <Input
              id="platformName"
              value={settings.platformName}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  platformName: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platformDescription">Mô tả</Label>
            <Input
              id="platformDescription"
              value={settings.platformDescription}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  platformDescription: event.target.value,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#f7f3ed]">
        <CardHeader>
          <CardTitle>Cài đặt hoa hồng</CardTitle>
          <CardDescription>
            Tỷ lệ này áp dụng cho order/custom order mới
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commissionRate">Tỷ lệ hoa hồng (%)</Label>
            <Input
              id="commissionRate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={settings.commissionRate}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  commissionRate: Number(event.target.value),
                }))
              }
            />
          </div>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu thay đổi
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { data: platformSettings, isLoading } = usePlatformSettings();
  const { data: categoriesData } = useCategories({
    status: "ACTIVE",
    limit: 50,
  });

  if (isLoading || !platformSettings) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="artisan-title text-4xl">Cài đặt</h1>
        <p className="artisan-subtitle mt-2">
          Quản lý thông tin nền tảng, hoa hồng và trải nghiệm dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlatformSettingsForm
          key={platformSettings.updatedAt}
          platformSettings={platformSettings}
        />

        <Card className="bg-[#ebe8e2]">
          <CardHeader>
            <CardTitle>Giao diện</CardTitle>
            <CardDescription>Tùy chỉnh giao diện bảng điều khiển</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Chế độ tối</Label>
                <p className="text-sm text-muted-foreground">
                  Chuyển đổi giữa giao diện sáng và tối
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={() =>
                  setTheme(theme === "dark" ? "light" : "dark")
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#ffffffd9]">
          <CardHeader>
            <CardTitle>Danh mục đang hoạt động</CardTitle>
            <CardDescription>Dữ liệu lấy từ API danh mục thật</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(categoriesData?.data || []).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg bg-muted/70 px-3 py-2"
                >
                  <span>{category.name}</span>
                </div>
              ))}
              {(!categoriesData?.data || categoriesData.data.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Chưa có danh mục hoạt động.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RoleRoute allowedRoles={["ROLE_ADMIN"]}>
      <SettingsContent />
    </RoleRoute>
  );
}
