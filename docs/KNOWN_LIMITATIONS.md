# Known Limitations

Tài liệu này ghi rõ các giới hạn đã biết của local MVP để người chấm không hiểu nhầm là lỗi bất ngờ. Các mục dưới đây không chặn demo customer/seller/admin chính.

## Scope

- Mục tiêu hiện tại là chạy local ổn định cho đồ án, chưa phải production enterprise.
- Flow demo chính dùng COD. Stripe chỉ là tích hợp optional khi cấu hình đủ key local.
- SMTP optional. Nếu chưa cấu hình SMTP, OTP được log ra terminal backend để demo.

## Deferred Features

| Feature | Hiện trạng | Ảnh hưởng demo | Hướng xử lý sau MVP |
| --- | --- | --- | --- |
| Automated browser E2E | Chưa có Playwright/Cypress flow đầy đủ | Không chặn demo nếu chạy manual smoke checklist | Thêm Playwright cho login, add cart, checkout COD, seller update order |
| Payment operations/payout | Menu nâng cao đã ẩn khỏi sidebar demo mặc định | Không ảnh hưởng COD checkout | Hoàn thiện ledger/payout workflow và bật lại menu |
| Stripe webhook end-to-end | Backend có xử lý webhook nhưng local demo chính không dùng Stripe | Không ảnh hưởng COD | Test bằng Stripe CLI và tài khoản test đồng bộ |
| Advanced flash sale guardrails | Backend có rule và test, UI demo chỉ dùng mức cơ bản | Không chặn admin xem campaign | Viết E2E load/stock reservation riêng |
| Notification realtime/push/email/preferences | MVP đã có in-app notification lưu DB, bell, unread count, dropdown và `/notifications`; chưa có realtime WebSocket, push, email, preference hoặc admin broadcast | Không chặn demo vì polling 30 giây đủ cho local MVP | Nếu cần production, thêm socket event hoặc SSE, preference theo user và email digest |
| Full generated API client | Đã ghi API contract notes, chưa generate client tự động | Không ảnh hưởng nếu build/test pass | Sinh TypeScript client từ Swagger/OpenAPI |

## Demo Caveats

- Database local có thể chứa dữ liệu cũ nếu đã seed/import nhiều lần. Dùng `cd backend && npm run db:reset` để về trạng thái demo sạch.
- Demo password `admin123` chỉ dùng trong seed local/dev, không dùng cho production.
- Một số màn hình vận hành nâng cao vẫn còn trong code để phát triển tiếp nhưng không nằm trong navigation demo mặc định.

## Before Submission

Chạy lại:

```bash
cd backend
npm run db:reset
npm test -- --runInBand
npm run build

cd ../frontend
npm run lint
npm run build
```

Sau đó đi theo `docs/SMOKE_TEST.md` và `docs/DEMO_SCRIPT.md`.
