"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProductOptionField =
  | "optionColors"
  | "optionMaterials"
  | "optionSizes"
  | "processingTime";

interface OptionsSectionProps {
  optionColors: string[];
  optionMaterials: string[];
  optionSizes: string[];
  processingTime: string;
  onChange: (field: ProductOptionField, value: string[] | string) => void;
}

function toTextareaValue(value: string[]) {
  return value.join("\n");
}

function fromTextareaValue(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const OptionsSection = memo(function OptionsSection({
  optionColors,
  optionMaterials,
  optionSizes,
  processingTime,
  onChange,
}: OptionsSectionProps) {
  return (
    <Card id="options" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Tùy chọn nhẹ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Dùng cho các lựa chọn đơn giản của sản phẩm handmade. Mỗi dòng là một
          lựa chọn, không tính thêm phí trong MVP.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Label htmlFor="optionColors">Màu sắc</Label>
            <Textarea
              id="optionColors"
              value={toTextareaValue(optionColors)}
              onChange={(event) =>
                onChange("optionColors", fromTextareaValue(event.target.value))
              }
              placeholder={"Đỏ rượu\nTrắng ngà\nXanh rêu"}
              className="mt-2 min-h-32"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tối đa 20 dòng, mỗi dòng tối đa 40 ký tự.
            </p>
          </div>

          <div>
            <Label htmlFor="optionMaterials">Chất liệu</Label>
            <Textarea
              id="optionMaterials"
              value={toTextareaValue(optionMaterials)}
              onChange={(event) =>
                onChange(
                  "optionMaterials",
                  fromTextareaValue(event.target.value),
                )
              }
              placeholder={"Gốm men\nLen cotton\nVải linen"}
              className="mt-2 min-h-32"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Chỉ nhập chất liệu khách có thể chọn.
            </p>
          </div>

          <div>
            <Label htmlFor="optionSizes">Kích thước</Label>
            <Textarea
              id="optionSizes"
              value={toTextareaValue(optionSizes)}
              onChange={(event) =>
                onChange("optionSizes", fromTextareaValue(event.target.value))
              }
              placeholder={"S\nM\nL\n300ml"}
              className="mt-2 min-h-32"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Có thể là size, dung tích hoặc kích thước thủ công.
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <Label htmlFor="processingTime">Thời gian làm</Label>
          <Input
            id="processingTime"
            value={processingTime}
            onChange={(event) => onChange("processingTime", event.target.value)}
            maxLength={120}
            placeholder="Ví dụ: 3-5 ngày"
            className="mt-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Hiển thị cho khách và được lưu snapshot vào đơn hàng.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
