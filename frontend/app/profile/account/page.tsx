"use client";

import { FormEvent, useState } from "react";
import { Coins, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useChangePassword, useMe, useRewardBalance, useRewardLedger } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/utils";

export default function AccountPage() {
  const { data: user, isLoading } = useMe();
  const rewardBalanceQuery = useRewardBalance(Boolean(user));
  const rewardLedgerQuery = useRewardLedger({ limit: 5 }, Boolean(user));
  const changePassword = useChangePassword();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Xác nhận mật khẩu không khớp.");
      return;
    }

    changePassword.mutate(
      {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      },
      {
        onSuccess: () => {
          setFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          toast.success("Mật khẩu đã được cập nhật.");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Không thể đổi mật khẩu."));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2">
          Cài đặt tài khoản
        </h1>
        <p className="text-muted-foreground italic">
          Quản lý bảo mật đăng nhập và thông tin định danh của tài khoản.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-border/40 bg-white p-8 shadow-[0_20px_40px_-24px_rgba(84,67,60,0.2)]">
          <div className="mb-8 flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-bold text-primary">
              Đổi mật khẩu
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className="input-minimal"
                value={formData.currentPassword}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="input-minimal"
                value={formData.newPassword}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="input-minimal"
                value={formData.confirmPassword}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                required
              />
            </div>

            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Lưu mật khẩu mới
            </Button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Coins className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-xl font-bold text-primary">
                Diem thuong
              </h3>
            </div>
            <p className="text-3xl font-bold text-primary">
              {rewardBalanceQuery.isLoading
                ? "..."
                : rewardBalanceQuery.data?.balance || 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Diem co the dung de giam gia khi thanh toan.
            </p>
            <div className="mt-5 space-y-3">
              {(rewardLedgerQuery.data?.data || []).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-t border-primary/10 pt-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{entry.type}</p>
                    <p className="text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className={
                      entry.points >= 0
                        ? "font-bold text-green-700"
                        : "font-bold text-red-700"
                    }
                  >
                    {entry.points >= 0 ? "+" : ""}
                    {entry.points}
                  </span>
                </div>
              ))}
              {!rewardLedgerQuery.isLoading &&
                (rewardLedgerQuery.data?.data || []).length === 0 && (
                  <p className="border-t border-primary/10 pt-3 text-xs text-muted-foreground">
                    Chua co giao dich diem.
                  </p>
                )}
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-xl font-bold text-primary">
                Email đăng nhập
              </h3>
            </div>
            <p className="break-all text-sm font-medium text-foreground">
              {user?.email}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Email được giữ cố định để bảo vệ lịch sử đơn hàng và thanh toán.
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-xl font-bold text-primary">
                Bảo mật phiên đăng nhập
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Phiên đăng nhập được lưu bằng cookie bảo mật. Hãy đăng xuất trên
              thiết bị dùng chung sau khi hoàn tất.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
