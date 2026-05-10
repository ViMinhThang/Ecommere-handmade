# Phase 2A Backend Manual QA Checklist

Use a disposable local/dev/staging database. Do not run destructive reset or
payment tests against production data.

## Migration Rehearsal

- [ ] Point `DATABASE_URL` at a disposable database.
- [ ] Run `npx.cmd prisma migrate deploy`.
- [ ] Run `npx.cmd prisma migrate status`.
- [ ] Confirm no pending migrations remain.
- [ ] Confirm the latest migration exists in `_prisma_migrations`:
      `20260510000000_marketplace_financial_hardening`.
- [ ] Confirm existing app boot still succeeds after migration.

## Standard Stripe Order

- [ ] Checkout with `idempotencyKey`, retry the same request, and confirm the
      same order/payment intent is returned while the intent is active.
- [ ] Send `payment_intent.succeeded` for the standard order.
- [ ] Expected ledger rows:
  - `PAYMENT_CAPTURE` once for the order.
  - `SELLER_EARNING` once per sub-order.
  - `PLATFORM_FEE` once per sub-order.
  - `PLATFORM_DISCOUNT` only when product/voucher discount exists.
- [ ] Replay the same webhook event and confirm no extra ledger rows are added.

## Standard Stripe Failure Or Expiry

- [ ] Send `payment_intent.payment_failed` or allow an unpaid intent to expire.
- [ ] Confirm active sub-orders move to `CANCELLED`.
- [ ] Confirm product stock is restored once.
- [ ] Confirm `checkoutIdempotencyKey` is cleared for expired failed checkout.

## Standard Refunds

- [ ] Admin full refund without `amount`.
- [ ] Admin partial refund with `amount`.
- [ ] Admin sub-order refund with `subOrderId`.
- [ ] Expected ledger rows:
  - `REFUND` rows are negative.
  - Sub-order refund only affects that sub-order seller.
  - Total refund cannot exceed paid balance.
- [ ] Repeat the same refund request and confirm the existing refund is reused.

## COD Order

- [ ] Create COD order and confirm initial payment status is `COD_PENDING`.
- [ ] Deliver only one of multiple active sub-orders.
- [ ] Confirm master payment remains `COD_PENDING`.
- [ ] Deliver all active sub-orders.
- [ ] Confirm master order payment becomes `PAID`.
- [ ] Expected ledger rows are posted only after all active sub-orders are
      delivered.

## Custom Order

- [ ] Approve sketch and create a Stripe payment intent.
- [ ] Force/seed an expired `paymentExpiresAt`, approve again, and confirm a new
      payment intent is created.
- [ ] Send `payment_intent.succeeded` and confirm order becomes paid without
      calling client `confirm-payment`.
- [ ] Cancel unpaid custom order and confirm no refund is created.
- [ ] Cancel paid custom order and confirm full refund is created.
- [ ] Expected ledger rows:
  - `PAYMENT_CAPTURE`, `SELLER_EARNING`, `PLATFORM_FEE` on paid webhook.
  - Negative `REFUND` on paid cancellation/refund.
