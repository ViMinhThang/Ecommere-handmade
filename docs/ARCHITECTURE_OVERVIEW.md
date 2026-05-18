# Architecture Overview

HandCraft Market là marketplace handmade local MVP gồm frontend Next.js, backend NestJS và PostgreSQL qua Prisma.

## Runtime

| Layer | Tech | Local port |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, Tailwind CSS, TanStack Query | `3000` |
| Backend API | NestJS 11, Prisma, JWT, Socket.IO | `3001` |
| Database | PostgreSQL | `5432` |
| Static media | Express static `/uploads` từ backend | `3001/uploads` |

## Main Modules

- Auth: email/password, JWT access token, refresh token, optional OTP email.
- Catalog: categories, products, product images, approval status.
- Customer commerce: discovery, product detail, cart, voucher, checkout COD, orders.
- Seller operations: products, media library, shop orders, custom orders, quote templates.
- Admin operations: users, categories, products, orders, reports, vouchers, flash sales, settings.
- Communication: chat conversation/customer-seller message flow.

## Auth And Roles

Seed local tạo 3 nhóm role:

- Customer: browse, cart, checkout COD, own orders, review/chat where allowed.
- Seller: manage own products, media, own shop sub-orders, own custom orders.
- Admin: platform-wide management and moderation.

Backend guards/services enforce ownership for order/product/chat/customer search flows; frontend role navigation only hides UI and is not trusted as security boundary.

## API Shape

- REST API dùng global URI versioning, default `/v1`.
- Swagger chạy ở `/api` trong local/dev.
- Frontend đọc `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:3001/v1`.
- Backend CORS đọc `FRONTEND_URL`, mặc định `http://localhost:3000`.

## Local Data

Prisma seed idempotent tạo demo accounts, handmade categories, products, orders, vouchers, reviews, reports, chat, custom orders, commissions và flash sales. `start:dev` chỉ chạy server, không reset database; `db:reset` mới xóa và seed lại dữ liệu local.
