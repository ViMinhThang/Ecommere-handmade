"use client";

import { memo } from "react";
import { Truck } from "lucide-react";
import type { ShippingProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShippingEtaNote } from "@/components/storefront/shipping-eta-note";

interface ShippingSectionProps {
  shippingProfileId: string;
  shippingProfiles: ShippingProfile[];
  isLoading?: boolean;
  onChange: (field: "shippingProfileId", value: string) => void;
}

export const ShippingSection = memo(function ShippingSection({
  shippingProfileId,
  shippingProfiles,
  isLoading = false,
  onChange,
}: ShippingSectionProps) {
  const activeProfiles = shippingProfiles.filter(
    (profile) => profile.isActive && !profile.deletedAt,
  );
  const selectedProfile =
    activeProfiles.find((profile) => profile.id === shippingProfileId) ||
    activeProfiles.find((profile) => profile.isDefault) ||
    null;

  return (
    <Card id="shipping" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Vận chuyển
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Chọn hồ sơ vận chuyển để hiển thị ETA cho khách và lưu snapshot vào
          đơn hàng khi checkout. Phí vận chuyển vẫn dùng cấu hình hiện tại của hệ
          thống.
        </p>

        <Select
          value={shippingProfileId || "default"}
          onValueChange={(value) =>
            onChange(
              "shippingProfileId",
              !value || value === "default" ? "" : value,
            )
          }
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                isLoading
                  ? "Đang tải hồ sơ vận chuyển..."
                  : "Chọn hồ sơ vận chuyển"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Dùng hồ sơ mặc định của shop</SelectItem>
            {activeProfiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
                {profile.isDefault ? " (mặc định)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProfile ? (
          <ShippingEtaNote profile={selectedProfile} />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Chưa có hồ sơ vận chuyển. Sản phẩm sẽ dùng ETA mặc định 3-8 ngày
            cho đến khi shop tạo hồ sơ vận chuyển.
          </div>
        )}
      </CardContent>
    </Card>
  );
});
