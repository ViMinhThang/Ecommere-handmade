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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomOrder, useSendCustomOrderOffer } from "@/lib/api/hooks";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(2, "Tiêu đề quá ngắn"),
  price: z.coerce.number().min(1000, "Giá tối thiểu 1.000đ"),
  leadTime: z.string().min(1, "Vui lòng nhập thời gian hoàn thành"),
  artisanNote: z.string().optional(),
});

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialTitle || "",
      price: 0,
      leadTime: "7-14 ngày",
      artisanNote: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // 1. Create the Custom Order
      const customOrder = await createOrderMutation.mutateAsync({
        customerId,
        ...values,
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
      form.reset();
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên tác phẩm / Yêu cầu</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Bình gốm men lam họa tiết cổ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá dự kiến (VND)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian (Dự kiến)</FormLabel>
                    <FormControl>
                      <Input placeholder="7-10 ngày" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="artisanNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú của Nghệ nhân</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Mô tả chi tiết về nguyên liệu, kỹ thuật hoặc các lưu ý khác..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
