"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { commissionsApi } from "@/lib/api/commissions";
import { SketchUpload } from "@/components/dashboard/sketch-upload";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";

export default function NewCommissionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [referenceImage, setReferenceImage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    budgetMin: "",
    budgetMax: "",
    desiredTimeline: "",
  });

  const createPost = useMutation({
    mutationFn: () =>
      commissionsApi.createPost({
        title: form.title,
        description: form.description,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        desiredTimeline: form.desiredTimeline || undefined,
        referenceImages: referenceImage ? [referenceImage] : [],
      }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["commissions", "my-posts"] });
      toast.success("Đã đăng yêu cầu commission.");
      router.push(`/commissions/${post.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đăng yêu cầu commission"));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createPost.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 shadow-sm">
      <h1 className="font-serif text-3xl font-bold text-primary">Đăng yêu cầu commission</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Mô tả món đồ bạn muốn đặt làm để người bán gửi đề xuất phù hợp.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Tiêu đề
          </label>
          <input
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
            placeholder="Ví dụ: Túi da khắc tên làm quà sinh nhật"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Mô tả chi tiết
          </label>
          <textarea
            required
            rows={7}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="w-full resize-none rounded-md border px-3 py-2 outline-none focus:border-primary"
            placeholder="Chất liệu, kích thước, màu sắc, phong cách, dịp sử dụng..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Ngân sách từ
            </label>
            <input
              type="number"
              min="0"
              value={form.budgetMin}
              onChange={(event) => setForm({ ...form, budgetMin: event.target.value })}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Đến
            </label>
            <input
              type="number"
              min="0"
              value={form.budgetMax}
              onChange={(event) => setForm({ ...form, budgetMax: event.target.value })}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Thời gian mong muốn
            </label>
            <input
              value={form.desiredTimeline}
              onChange={(event) => setForm({ ...form, desiredTimeline: event.target.value })}
              className="w-full rounded-md border px-3 py-2 outline-none focus:border-primary"
              placeholder="Ví dụ: 2-3 tuần"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Ảnh tham khảo
          </div>
          <SketchUpload
            value={referenceImage}
            onChange={setReferenceImage}
            label="Tải ảnh tham khảo"
          />
        </div>

        <Button type="submit" disabled={createPost.isPending} className="w-full">
          {createPost.isPending ? "Đang đăng..." : "Đăng yêu cầu"}
        </Button>
      </form>
    </div>
  );
}
