# API Contract Notes

Phase 3 tightened the local MVP contract between the Next.js frontend and the NestJS backend.

## Cart

- `GET /v1/cart` returns the enriched cart used by cart page, checkout, and header count.
- `POST /v1/cart/items` returns the raw `CartItem` mutation result.
- `PATCH /v1/cart/items/:productId` returns either a raw `CartItem` or `{ count }` when quantity is zero or below.
- `DELETE /v1/cart/items/:productId` and `DELETE /v1/cart` return `{ count }`.
- Frontend mutations should invalidate `GET /cart` instead of assuming mutation responses are full carts.

## Refunds

- `POST /v1/orders/admin/:id/refunds` returns `Refund`.
- `POST /v1/custom-orders/admin/:id/refunds` returns `Refund`.
- Frontend should refresh order/custom-order detail and ledger queries after refund mutations.

## Custom Orders

- Seller status transition used by the UI is:
  `CRAFTING -> FINISHING -> SHIPPED -> DELIVERED`.
- Customer/admin detail views should treat `DELIVERED` as the final delivery phase.

## Voucher And Flash Sale Lists

- Public voucher/flash-sale endpoints return only active and currently valid data.
- Admin dashboards must use:
  - `GET /v1/vouchers/admin/all`
  - `GET /v1/flash-sales/admin/all`

## Media

- Frontend media rendering should go through `getMediaUrl()` / `getImageUrl()` from `frontend/lib/api/media.ts`.
- Stored media paths should prefer backend-relative paths such as `products/file.jpg` or `userId/folderId/file.jpg`.
- The helper also accepts absolute URLs, `data:` URLs, `blob:` previews, and `/uploads/...` paths.

## Error Messages

- Frontend API errors should use the shared error parser so Nest validation arrays do not render as `undefined`.

## Generated Client

The backend exposes Swagger setup in local development, but a generated TypeScript client was not added in Phase 3 to avoid a large refactor. A later phase can generate types from OpenAPI and replace the hand-written API client incrementally.
