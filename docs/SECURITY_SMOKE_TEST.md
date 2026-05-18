# Local MVP Security Smoke Test

Use this checklist after `npm run db:seed`, backend `npm run start:dev`, and frontend `npm run dev`.

## Auth Token Behavior

- [ ] Public product list works with no `Authorization` header.
- [ ] Public product list returns `401` when `Authorization: Bearer invalid-token` is sent.
- [ ] Public product detail works anonymously for an approved product.
- [ ] Public product detail returns `401` when the `auth_access_token` cookie is expired or malformed.

## Seller Customer Search

- [ ] Login seller demo account.
- [ ] Search customers through `GET /v1/users/customers?q=<unknown-customer-name>`.
- [ ] Seller cannot see a customer who has never bought from, chatted with, or requested a quote from that seller.
- [ ] Seller can still find customers who have bought from them, chatted with them, or have a custom order/quote with them.
- [ ] Login admin account and confirm admin can search all active customers.

## Order Ownership

- [ ] Customer A cannot open Customer B order through `GET /v1/orders/:id`.
- [ ] Customer A cannot open Customer B sub-order through `GET /v1/orders/sub-order/:id`.
- [ ] Seller A cannot open or update Seller B sub-order.
- [ ] Seller can update only their own sub-order.
- [ ] Admin can view and update orders across sellers.

## Chat Permission

- [ ] Customer cannot start chat with inactive/suspended/deleted seller.
- [ ] Customer cannot start product chat if product is `PENDING`, `REJECTED`, deleted, or category is inactive/deleted.
- [ ] Existing conversation messages cannot be sent if the seller becomes inactive/suspended/deleted.
- [ ] Customer/seller can view only conversations where they are a participant.

## Voucher And Flash Sale Visibility

- [ ] Public `GET /v1/vouchers` returns only active, unexpired vouchers with active category and active range.
- [ ] Public `GET /v1/vouchers/code/:code` does not return inactive or expired vouchers.
- [ ] Expired voucher code cannot be applied to cart.
- [ ] Public `GET /v1/flash-sales` and `GET /v1/flash-sales/active` return only active, current campaigns.
- [ ] Expired flash sale range does not discount cart/product prices.
- [ ] Admin-only voucher/flash-sale list can see inactive records for management.

## Status Transitions

- [ ] Seller cannot update a sub-order from `PENDING` directly to `SHIPPED` or `DELIVERED`.
- [ ] Seller cannot update another seller's sub-order.
- [ ] Customer cannot set order status to paid/shipped/delivered.
- [ ] Delivered/cancelled orders cannot be moved back to earlier states.
- [ ] Custom order status advances only `CRAFTING -> FINISHING -> SHIPPED -> DELIVERED`.
