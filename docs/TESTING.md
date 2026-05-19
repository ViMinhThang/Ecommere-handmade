# Testing Guide Local MVP

## Mục Tiêu

Tài liệu này mô tả cách kiểm tra nhanh local MVP sau khi clone repo, migrate và seed dữ liệu demo. Phase 5 không thêm Playwright hoặc DB e2e harness mới để tránh tăng độ phức tạp đồ án; backend hiện có Jest unit/service tests và checklist smoke thủ công cho flow end-to-end.

## Commands

Backend:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run build
npm test
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

## Manual Smoke

Chạy theo thứ tự:

1. `docs/SMOKE_TEST.md`
2. `docs/SECURITY_SMOKE_TEST.md`
3. `docs/DEMO_SCRIPT.md`

Ưu tiên xác nhận các flow:

- Customer browse/search/filter product.
- Customer add/update/remove cart item.
- Customer apply `HANDMADE10`, reject `EXPIRED5` và `INACTIVE15`.
- Customer checkout COD.
- Customer view/cancel/review order nếu trạng thái cho phép.
- Seller view products, create/edit product, upload/select image.
- Seller view/update only own sub-orders.
- Seller custom order status `CRAFTING -> FINISHING -> SHIPPED -> DELIVERED`.
- Admin approve/reject product, view orders/reports/vouchers/flash sales/settings.
- Invalid token returns `401`.
- Customer/seller/admin permission boundaries are enforced by backend.

## Automated Coverage Hiện Có

Backend Jest specs đã cover các nhóm quan trọng:

- Auth controller and optional JWT guard.
- User/customer search authorization.
- Product/service ownership behavior.
- Chat permission and product/seller validation.
- Order status, checkout, refund and payment reliability logic.
- Voucher and flash sale visibility/validation.
- Reports/reviews/settings/custom orders service behavior.

Frontend hiện chưa có Playwright/Cypress harness. Khi chuyển sang Phase 6, nên thêm e2e test tối thiểu cho customer login -> add cart -> checkout COD.

## Seed Idempotency Check

```bash
cd backend
npm run db:seed
npm run db:seed
```

Kỳ vọng:

- Không lỗi duplicate.
- Account demo vẫn login bằng `admin123`.
- Nếu cần kiểm tra database sạch theo migration thật, dùng `cd backend && npm run db:reset` trên database local không chứa dữ liệu quan trọng.
- Số lượng product/category/order/voucher không nhân đôi bất thường.
- Ảnh demo vẫn nằm trong `backend/uploads/products`.
