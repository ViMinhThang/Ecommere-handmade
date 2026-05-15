# Checklist bật Flash Sale Guardrails

Tài liệu này dùng trước khi bật `FLASH_SALE_GUARDRAILS_ENABLED=true` trên staging hoặc production. Flag phải giữ mặc định OFF cho đến khi tất cả mục bên dưới pass.

## Điều kiện bắt buộc

- Migration flash sale guardrails đã apply sạch trên môi trường cần bật flag.
- `FLASH_SALE_GUARDRAILS_ENABLED` vẫn default `false` trong env example và cấu hình deploy.
- Unit tests checkout/orders pass.
- Concurrency tests với PostgreSQL thật pass ít nhất 3 lần liên tiếp.
- Stripe happy path QA pass: checkout, client confirm, webhook success, duplicate webhook.
- COD happy path QA pass: checkout COD, delivered/paid transition, duplicate transition.
- Failed/canceled/expired QA pass: Stripe failed webhook, expired order sweep, customer/admin/seller cancel trước paid.
- F8 Payment Reliability Console được dùng để theo dõi anomalies trong rollout.
- Log không chứa password, token, cookie, Stripe signature, raw webhook body, địa chỉ/email/phone đầy đủ.

## Lệnh test khuyến nghị

```bash
npm test -- orders.service.spec.ts --runInBand
npm test -- flash-sale-guardrails.concurrency.spec.ts --runInBand
npx prisma validate
npm run build
```

Concurrency tests mặc định bị skip nếu thiếu env. Chạy với PostgreSQL test database thật:

```bash
RUN_FLASH_SALE_CONCURRENCY_TESTS=true TEST_DATABASE_URL="postgresql://..." npm test -- flash-sale-guardrails.concurrency.spec.ts --runInBand
```

Trên Windows PowerShell:

```powershell
$env:RUN_FLASH_SALE_CONCURRENCY_TESTS="true"
$env:TEST_DATABASE_URL="postgresql://..."
npm test -- flash-sale-guardrails.concurrency.spec.ts --runInBand
```

## Checklist staging

- Apply migration trên staging thành công, không có drift.
- Seed/test campaign có `maxUnits`, `perUserLimit`, `reserveStock` phù hợp.
- Bật flag trên staging bằng `FLASH_SALE_GUARDRAILS_ENABLED=true` và restart backend.
- Chạy concurrency tests với PostgreSQL staging/test riêng ít nhất 3 lần.
- QA checkout Stripe và COD với campaign active.
- QA stale cart: pause/end sale sau khi cart đã tính giá, checkout phải báo refresh cart.
- QA sold-out: vượt `maxUnits` phải bị chặn bằng lỗi an toàn.
- QA per-user limit: cùng user vượt quota phải bị chặn bằng lỗi an toàn.
- QA reserve stock: tồn kho còn bằng reserve floor phải bị chặn.
- QA duplicate webhook/confirm/cancel/expired không double convert/release counters.
- Theo dõi F8 console và log checkout trong ít nhất một vòng smoke test.

## Checklist rollout production

- Flag vẫn OFF cho đến khi staging checklist pass.
- Rollout vào thời điểm traffic thấp.
- Bật flag cho backend bằng env deploy, restart từng instance nếu có nhiều instance.
- Theo dõi trong 30-60 phút đầu:
  - checkout error rate
  - payment webhook failed/duplicate rate
  - F8 payment anomalies
  - flash sale `reservedUnits`/`soldUnits` drift
  - product stock anomalies
- Nếu có bất thường, rollback ngay bằng cách tắt flag.

## Rollback

- Set `FLASH_SALE_GUARDRAILS_ENABLED=false`.
- Restart backend để env mới có hiệu lực.
- Không cần rollback migration vì schema là additive.
- Kiểm tra orders đang pending và counters sau rollback.
- Dùng F8 console để kiểm tra payment/order mismatch sau rollback.

## Checklist repair counter drift cấp cao

- Xác định campaign bị drift bằng cách so sánh `FlashSale.reservedUnits`, `soldUnits` với order items có `flashSaleId` và discount > 0.
- Recompute reserved từ order chưa paid/chưa canceled có snapshot flash sale.
- Recompute sold từ order đã paid/có trạng thái thành công theo business rule hiện tại.
- Recompute per-user usage từ cùng tập order items, group theo `flashSaleId` và `customerId`.
- Chỉ chạy repair sau khi đã backup DB và có approval vận hành.
- Không trừ `soldUnits` khi refund nếu business rule refund chưa được thông qua.
