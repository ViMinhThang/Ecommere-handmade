"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface PersonalizationSectionProps {
  personalizationEnabled: boolean;
  personalizationRequired: boolean;
  personalizationInstructions: string;
  personalizationMaxLength: number;
  onChange: (
    field:
      | "personalizationEnabled"
      | "personalizationRequired"
      | "personalizationInstructions"
      | "personalizationMaxLength",
    value: boolean | string | number,
  ) => void;
}

export const PersonalizationSection = memo(function PersonalizationSection({
  personalizationEnabled,
  personalizationRequired,
  personalizationInstructions,
  personalizationMaxLength,
  onChange,
}: PersonalizationSectionProps) {
  return (
    <Card id="personalization" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Cá nhân hóa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
          <div>
            <Label htmlFor="personalizationEnabled">Cho phép cá nhân hóa</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Khách có thể nhập tên, lời nhắn hoặc nội dung riêng cho sản phẩm.
            </p>
          </div>
          <Switch
            id="personalizationEnabled"
            checked={personalizationEnabled}
            onCheckedChange={(checked) => onChange("personalizationEnabled", checked)}
          />
        </div>

        {personalizationEnabled && (
          <div className="space-y-6 rounded-lg border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="personalizationRequired">
                  Bắt buộc nhập nội dung cá nhân hóa
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bật nếu shop cần khách nhập nội dung trước khi thêm vào giỏ.
                </p>
              </div>
              <Switch
                id="personalizationRequired"
                checked={personalizationRequired}
                onCheckedChange={(checked) => onChange("personalizationRequired", checked)}
              />
            </div>

            <div>
              <Label htmlFor="personalizationInstructions">Hướng dẫn cho khách</Label>
              <Textarea
                id="personalizationInstructions"
                value={personalizationInstructions}
                maxLength={1000}
                onChange={(event) =>
                  onChange("personalizationInstructions", event.target.value)
                }
                placeholder="Ví dụ: Nhập tên muốn khắc, màu chữ hoặc lời nhắn tặng kèm."
                className="mt-2 min-h-28"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {personalizationInstructions.length}/1000 ký tự
              </p>
            </div>

            <div className="max-w-xs">
              <Label htmlFor="personalizationMaxLength">Giới hạn ký tự</Label>
              <Input
                id="personalizationMaxLength"
                type="number"
                min={1}
                max={500}
                value={personalizationMaxLength}
                onChange={(event) =>
                  onChange("personalizationMaxLength", Number(event.target.value) || 1)
                }
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cho phép từ 1 đến 500 ký tự.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
