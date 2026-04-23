"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomOrder, useSendCustomOrderOffer } from "@/lib/api/hooks";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(2, "Tiêu đề quá ngắn"),
  price: z.number().min(1000, "Giá tối thiểu 1.000đ"),
  leadTime: z.string().min(1, "Vui lòng nhập thời gian hoàn thành"),
  artisanNote: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomOfferDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  customerId: string;
  initialTitle?: string;
}

export function CustomOfferDialog({
  isOpen,
  onOpenChange,
  conversationId,
  customerId,
  initialTitle,
}: CustomOfferDialogProps) {
  const createOrderMutation = useCreateCustomOrder();
  const sendOfferMutation = useSendCustomOrderOffer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialTitle || "",
      price: 0,
      leadTime: "7-14 ngày",
      artisanNote: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // 1. Create the Custom Order
      const customOrder = await createOrderMutation.mutateAsync({
        customerId,
        ...values,
        price: values.price.toString(),
        specifications: [],
      });

      // 2. Send the offer message in chat
      await sendOfferMutation.mutateAsync({
        conversationId,
        customOrderId: customOrder.id,
        message: `Tôi đã tạo một báo giá mới cho yêu cầu của bạn: ${values.title}. Vui lòng xem chi tiết bên dưới.`,
      });

      toast.success("Đã gửi báo giá thành công!");
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || "Không thể gửi báo giá.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo báo giá tùy chỉnh</DialogTitle>
          <DialogDescription>
            Gửi một báo giá chính thức cho khách hàng. Sau khi khách hàng thanh toán, đơn hàng sẽ chính thức được tạo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tên sản phẩm / Yêu cầu</Label>
            <Input 
              id="title" 
              placeholder="Ví dụ: Bình gốm men lam họa tiết cổ" 
              {...register("title")} 
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Giá dự kiến (VND)</Label>
              <Input 
                id="price" 
                type="number" 
                {...register("price", { valueAsNumber: true })} 
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTime">Thời gian (Dự kiến)</Label>
              <Input 
                id="leadTime" 
                placeholder="7-10 ngày" 
                {...register("leadTime")} 
              />
              {errors.leadTime && (
                <p className="text-xs text-destructive">{errors.leadTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artisanNote">Ghi chú của Người bán</Label>
            <Textarea 
              id="artisanNote"
              placeholder="Mô tả chi tiết về nguyên liệu, kỹ thuật hoặc các lưu ý khác..." 
              className="resize-none"
              {...register("artisanNote")} 
            />
            {errors.artisanNote && (
              <p className="text-xs text-destructive">{errors.artisanNote.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={createOrderMutation.isPending || sendOfferMutation.isPending}
            >
              {createOrderMutation.isPending || sendOfferMutation.isPending ? "Đang gửi..." : "Gửi báo giá"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
