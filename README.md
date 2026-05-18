# HandCraft Market

Web thương mại điện tử bán đồ handmade, phục vụ demo/local MVP cho đồ án. Hệ thống có 3 nhóm người dùng chính: customer, seller và admin.

Mục tiêu hiện tại là chạy local ổn định, demo được các flow mua hàng, bán hàng và vận hành marketplace. Đây chưa phải cấu hình production.

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS, TanStack Query
- Backend: NestJS 11, Prisma ORM, PostgreSQL, JWT auth
- Realtime: Socket.IO chat
- Notification: in-app notification bằng database + polling, chưa dùng realtime/push/email
- Payment: COD chạy local mặc định, Stripe là optional
- Tooling: npm, Prisma migrate/seed, Jest

## Local Ports

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/v1 |
| Swagger | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |

## Prerequisites

- Node.js 18+ hoặc 20+
- npm
- PostgreSQL local
- Git

## PostgreSQL Local Setup

Tạo database local tên `ecommerce_handmade`.

Ví dụ nếu dùng `psql`:

```bash
createdb ecommerce_handmade
```

Hoặc tạo bằng pgAdmin với:

- Database: `ecommerce_handmade`
- Host: `localhost`
- Port: `5432`

Sau đó cập nhật `DATABASE_URL` trong `backend/.env`.

Ví dụ:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce_handmade?schema=public"
```

## Backend Setup

```bash
cd backend
npm install
```

Tạo file env:

```powershell
Copy-Item .env.example .env
```

Hoặc trên bash:

```bash
cp .env.example .env
```

Cập nhật tối thiểu:

```env
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/ecommerce_handmade?schema=public"
JWT_SECRET="replace-with-long-random-jwt-secret"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Chạy migration và seed:

```bash
npm run db:migrate
npm run db:seed
```

Chạy backend dev server:

```bash
npm run start:dev
```

`start:dev` chỉ chạy NestJS watch mode, không reset database.

Nếu muốn reset toàn bộ database local để demo lại từ đầu:

```bash
npm run db:reset
```

Lệnh `db:reset` dùng `prisma migrate reset --force`, sẽ xóa database local, apply migrations và chạy seed lại.

## Frontend Setup

Mở terminal khác:

```bash
cd frontend
npm install
```

Tạo file env:

```powershell
Copy-Item .env.example .env
```

Hoặc trên bash:

```bash
cp .env.example .env
```

Giữ cấu hình local mặc định:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/v1"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
```

Chạy frontend:

```bash
npm run dev
```

Mở http://localhost:3000.

## Environment Variables

Backend bắt buộc:

| Variable | Required | Ghi chú |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL local |
| `JWT_SECRET` | Yes | Dùng chuỗi dài, không commit secret thật |
| `PORT` | Yes | Mặc định `3001` |
| `FRONTEND_URL` | Yes | Mặc định `http://localhost:3000` |

Backend optional local:

| Variable | Required | Ghi chú |
| --- | --- | --- |
| `SMTP_USER`, `SMTP_PASS` | No | Nếu trống, OTP được log ra terminal backend |
| `STRIPE_SECRET_KEY` | No | Chỉ cần khi test Stripe payment |
| `STRIPE_WEBHOOK_SECRET` | No | Chỉ cần khi test Stripe webhook |
| `GOOGLE_CLIENT_ID` | No | Chỉ cần khi test Google login |
| `AUTO_IMPORT_PRODUCTS_ON_BOOT` | No | Mặc định false để seed demo ổn định |

Frontend optional local:

| Variable | Required | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Chỉ cần khi test Stripe |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Chỉ cần khi test Google login |
| `NEXT_PUBLIC_DEMO_ADMIN_EMAIL` | No | Shortcut login demo |
| `NEXT_PUBLIC_DEMO_ADMIN_PASSWORD` | No | Shortcut login demo |

## Demo Accounts

Các account này chỉ dành cho local/dev seed. Tất cả dùng chung password:

```txt
Password: admin123
```

| Role | Email | Mục đích demo |
| --- | --- | --- |
| Admin | `admin@ecommerce.com` | Duyệt sản phẩm, xem users/orders/reports/settings |
| Seller 1 | `seller@ecommerce.com` | Shop gốm/trang sức/gỗ, có order và custom order |
| Seller 2 | `seller2@ecommerce.com` | Shop quà tặng/vải/nến/crochet, có order và custom order |
| Customer 1 | `customer@ecommerce.com` | Browse/cart/checkout COD/review/chat |
| Customer 2 | `customer2@ecommerce.com` | Order pending/shipped, question, report |
| Customer 3 | `customer3@ecommerce.com` | Order cancelled/delivered, commission request |

Seed tạo 8 category handmade, khoảng 25 sản phẩm demo có ảnh local, sản phẩm approved/pending/rejected/hết hàng, voucher `HANDMADE10`, voucher expired/inactive, cart, wishlist, order COD nhiều trạng thái, review, question, report, chat, custom order, quote template, commission và flash sale demo.

## Main Demo Flow

1. Admin login và kiểm tra dashboard.
2. Seller login, xem sản phẩm và đơn hàng.
3. Customer login, duyệt sản phẩm, thêm giỏ hàng.
4. Customer checkout bằng COD.
5. Seller cập nhật trạng thái đơn.
6. Customer xem đơn hàng và review khi đơn đã delivered.
7. Customer/seller/admin mở chuông thông báo để xem unread count và notification mới.
8. Admin xem reports/orders/settings.

## Documentation

- [Demo script](docs/DEMO_SCRIPT.md)
- [Smoke checklist](docs/SMOKE_TEST.md)
- [Security smoke checklist](docs/SECURITY_SMOKE_TEST.md)
- [Testing guide](docs/TESTING.md)
- [API contract notes](docs/API_CONTRACT_NOTES.md)
- [Architecture overview](docs/ARCHITECTURE_OVERVIEW.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)

Chi tiết từng bước demo theo role nằm trong `docs/DEMO_SCRIPT.md`.
Chi tiết checklist nằm ở [docs/SMOKE_TEST.md](docs/SMOKE_TEST.md).
Hướng dẫn test/build nằm ở [docs/TESTING.md](docs/TESTING.md).

## Troubleshooting

### Backend báo thiếu `DATABASE_URL` hoặc không kết nối database

- Kiểm tra PostgreSQL đã chạy.
- Kiểm tra database `ecommerce_handmade` đã tồn tại.
- Kiểm tra username/password trong `DATABASE_URL`.

### Không nhận được email OTP khi register/forgot password

Trong local, SMTP là optional. Nếu không cấu hình SMTP, OTP sẽ xuất hiện trong terminal backend:

```txt
[DEV MAIL] register OTP for user@email.com: 123456
```

### Checkout Stripe không chạy

Local MVP dùng COD mặc định. Muốn test Stripe cần cấu hình cả:

- `backend/.env`: `STRIPE_SECRET_KEY`
- `frontend/.env`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- webhook nếu test webhook: `STRIPE_WEBHOOK_SECRET`

### Ảnh demo không hiển thị

Chạy lại:

```bash
cd backend
npm run db:seed
```

Seed sẽ tạo ảnh demo trong `backend/uploads/products`.

### CORS hoặc API không gọi được

- Backend phải chạy ở `http://localhost:3001`.
- Frontend `.env` phải có `NEXT_PUBLIC_API_URL="http://localhost:3001/v1"`.
- Backend `.env` phải có `FRONTEND_URL="http://localhost:3000"`.

## Notes

- Không commit file `.env`.
- Không đưa secret thật vào `.env.example`.
- `db:reset` chỉ dùng local vì sẽ xóa dữ liệu database, apply migrations và seed lại từ đầu.
- Notification MVP chỉ là in-app notification có lưu DB và polling 30 giây; realtime WebSocket, push, email, preferences và admin broadcast để sau MVP.
- Những phần chưa thuộc phạm vi local MVP được ghi rõ trong [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).
