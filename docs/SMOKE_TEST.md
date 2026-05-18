# Local MVP Smoke Test

Checklist này dùng để kiểm tra nhanh sau khi clone repo, migrate và seed local.

## Setup

- [ ] PostgreSQL đang chạy ở `localhost:5432`.
- [ ] Backend `.env` có `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, `FRONTEND_URL=http://localhost:3000`.
- [ ] Frontend `.env` có `NEXT_PUBLIC_API_URL=http://localhost:3001/v1`.
- [ ] Đã chạy `cd backend && npm run db:migrate && npm run db:seed`.
- [ ] Nếu cần demo từ database sạch, chạy `cd backend && npm run db:reset` trên database local không chứa dữ liệu cần giữ.
- [ ] Backend chạy bằng `npm run start:dev`.
- [ ] Frontend chạy bằng `npm run dev`.

## Auth

- [ ] Login admin: `admin@ecommerce.com / admin123`.
- [ ] Login seller: `seller@ecommerce.com / admin123`.
- [ ] Login seller 2: `seller2@ecommerce.com / admin123`.
- [ ] Login customer: `customer@ecommerce.com / admin123`.
- [ ] Login customer 2/3: `customer2@ecommerce.com / admin123`, `customer3@ecommerce.com / admin123`.
- [ ] Logout rồi login lại bằng role khác không bị giữ menu/session cũ.
- [ ] Refresh browser sau login không làm mất session nếu token còn hạn.
- [ ] Register account mới và lấy OTP từ terminal backend nếu SMTP chưa cấu hình.

## Admin Flow

- [ ] Mở dashboard admin.
- [ ] Xem danh sách users/categories/products.
- [ ] Tạo một category hoặc kiểm tra category seed.
- [ ] Kiểm tra product status và approve/reject nếu có product pending.
- [ ] Xem orders và reports.
- [ ] Xem settings/platform commission.
- [ ] Xem voucher active `HANDMADE10`, expired `EXPIRED5`, inactive `INACTIVE15`.
- [ ] Xem flash sale active/upcoming/ended trong admin flash sale page.

## Seller Flow

- [ ] Login seller.
- [ ] Mở dashboard products và thấy sản phẩm demo.
- [ ] Tạo sản phẩm mới với ảnh từ media folder seed `Ảnh demo sản phẩm` hoặc ảnh placeholder.
- [ ] Sửa một sản phẩm của seller và kiểm tra status cần admin duyệt nếu flow yêu cầu.
- [ ] Mở seller orders và thấy order COD seed.
- [ ] Cập nhật order từ `PENDING` sang bước tiếp theo nếu action khả dụng.
- [ ] Mở reviews/questions nếu có dữ liệu.
- [ ] Mở `/seller/custom-orders` và chuyển custom order `SHIPPED` sang `DELIVERED` nếu còn action.
- [ ] Mở `/seller/quote-templates` và thấy template báo giá seed nếu UI/API khả dụng.

## Customer Flow

- [ ] Login customer.
- [ ] Mở home/discovery và thấy sản phẩm có ảnh.
- [ ] Mở product detail.
- [ ] Add to cart.
- [ ] Update cart quantity.
- [ ] Remove cart item.
- [ ] Apply voucher `HANDMADE10` nếu sản phẩm thuộc category phù hợp.
- [ ] Apply voucher `EXPIRED5` và xác nhận bị từ chối.
- [ ] Checkout bằng COD.
- [ ] Xem order trong profile orders.
- [ ] Hủy pending order nếu action khả dụng.
- [ ] Mở delivered order seed và kiểm tra review đã có hoặc tạo review nếu chưa có.
- [ ] Mở chat với seller từ product detail nếu flow khả dụng.

## Expected Result

- [ ] Không có broken image trong home/discovery/cart/orders/wishlist/dashboard products.
- [ ] Không có lỗi startup do thiếu SMTP.
- [ ] Không có lỗi startup do thiếu Stripe khi chỉ test COD.
- [ ] `npm run start:dev` không reset database.
- [ ] Refresh browser không làm mất session nếu token còn hạn.

## Phase 3 API Contract Smoke

- [ ] Customer adds a product to cart from product detail; header cart count updates after refresh/query invalidation.
- [ ] Customer updates cart item quantity; cart totals stay correct and no runtime error occurs from mutation response shape.
- [ ] Customer removes one cart item; item disappears and cart count changes.
- [ ] Customer checks out with COD; order is created and visible in profile orders.
- [ ] Admin opens standard order detail and creates refund when the order is refundable; detail/ledger refresh without treating the response as an order.
- [ ] Admin opens custom order detail and creates refund when the custom order is refundable; detail/ledger refresh without treating the response as a custom order.
- [ ] Seller moves a custom order through `CRAFTING -> FINISHING -> SHIPPED -> DELIVERED`; customer detail shows the final delivery phase.
- [ ] Admin voucher page can list inactive/future/expired vouchers via the admin endpoint.
- [ ] Public cart voucher suggestions show only active and valid vouchers.
- [ ] Admin flash sale page can list inactive/future/expired campaigns via the admin endpoint.
- [ ] Home, discovery, product detail, cart, checkout, order detail, wishlist, dashboard category/product/avatar images render without hardcoded `localhost:3001` in components.

## Phase 4 UI Demo Smoke

- [ ] Header shows `Khám phá`, seller pages show Vietnamese report labels, and dashboard order/report pages do not show English action labels like `Update`, `Cancel`, `Saving`, or `No image`.
- [ ] Dashboard sidebar hides `Đối soát thanh toán` in the default local demo menu.
- [ ] Customer, seller, and admin do not see menu actions outside their role.
- [ ] Checkout defaults to COD; Stripe option is disabled when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not configured.
- [ ] Checkout summary shows subtotal, voucher discount if applied, reward points, shipping fee, total, payment method, and shipping address.
- [ ] Product images render on home/discovery/category/product detail/cart/wishlist/profile orders/seller products; missing images show a clean fallback instead of a broken image icon.
- [ ] Profile order detail opens when an order item has no product image; the fallback icon renders instead of an empty `next/image` source.
- [ ] Seller can open `/dashboard/orders`, update a standard shop sub-order, and see Vietnamese success/error messages.
- [ ] Seller can open `/seller/custom-orders`; shipped custom orders show `Xác nhận đã giao`.
- [ ] Admin can open `/dashboard/orders/:id`, update status, and see localized payment/status labels.
- [ ] Admin can open `/dashboard/reports`, filter reports, and update report status with localized labels.
- [ ] Seeded category/product/review/question/report names display Vietnamese with accents after `npm run db:seed`.
- [ ] `docs/DEMO_SCRIPT.md` matches the seeded demo accounts and the current navigation.

## Phase 5 Seed And Final MVP Smoke

- [ ] Chạy `cd backend && npm run db:seed` hai lần liên tiếp không lỗi duplicate.
- [ ] Seed tạo đủ account demo: 1 admin, 2 seller, 3 customer.
- [ ] Seed tạo 8 category handmade active có slug và mô tả.
- [ ] Seed tạo khoảng 25 sản phẩm demo, có sản phẩm approved, pending, rejected và hết hàng.
- [ ] Seed tạo order COD ở các trạng thái `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
- [ ] Customer chỉ thấy order của chính mình trong `/profile/orders`.
- [ ] Seller chỉ thấy/cập nhật sub-order thuộc shop mình trong `/dashboard/orders`.
- [ ] Admin thấy toàn bộ order trong `/dashboard/orders`.
- [ ] Seed tạo voucher active `HANDMADE10`, expired `EXPIRED5`, inactive `INACTIVE15`.
- [ ] Public/customer không apply được voucher expired hoặc inactive.
- [ ] Seed tạo review/question/report/chat/custom order/quote template/commission tối thiểu để các màn hình demo không trống.
- [ ] Ảnh demo tồn tại trong `backend/uploads/products` và media library của seller có ảnh để chọn.
- [ ] Feature chưa hoàn chỉnh không xuất hiện trong menu chính demo.
- [ ] Security smoke trong `docs/SECURITY_SMOKE_TEST.md` vẫn pass sau seed mới.

## Notification MVP Smoke

- [ ] Login customer `customer@ecommerce.com`; header hiển thị chuông thông báo và unread badge nếu còn thông báo chưa đọc.
- [ ] Mở dropdown chuông; thấy tối đa 5 thông báo mới nhất, có loading/empty/error state rõ ràng.
- [ ] Click một notification chưa đọc; notification được đánh dấu đã đọc và điều hướng tới link nếu có.
- [ ] Mở `/notifications`; filter `Tất cả` và `Chưa đọc` hoạt động, pagination không vỡ layout.
- [ ] Bấm `Đánh dấu tất cả đã đọc`; unread count giảm về 0 cho đúng user hiện tại.
- [ ] Login seller `seller@ecommerce.com`; thấy notification đơn hàng mới hoặc duyệt sản phẩm theo seed.
- [ ] Login admin `admin@ecommerce.com`; thấy notification sản phẩm chờ duyệt hoặc báo cáo mới theo seed.
- [ ] Checkout COD bằng customer tạo notification `ORDER_CREATED` cho customer và seller liên quan.
- [ ] Seller/admin cập nhật trạng thái đơn hàng; customer nhận notification `ORDER_STATUS_UPDATED` hoặc `ORDER_CANCELLED`.
- [ ] Seller tạo product pending; admin nhận notification `PRODUCT_SUBMITTED`.
- [ ] Admin approve/reject product; seller owner nhận notification `PRODUCT_APPROVED` hoặc `PRODUCT_REJECTED`.
- [ ] Tạo report; admin nhận notification `REPORT_CREATED`, reporter nhận `REPORT_STATUS_UPDATED` khi admin xử lý.
- [ ] Anonymous không thấy chuông notification.
- [ ] Dùng token/user khác không mark read/delete được notification không thuộc mình; API trả 404/401 thay vì update nhầm.
