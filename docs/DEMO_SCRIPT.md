# Demo Script Local MVP

Script này dùng cho demo đồ án sau khi đã chạy `npm run db:migrate`, `npm run db:seed`, backend ở `http://localhost:3001` và frontend ở `http://localhost:3000`.

## Tài Khoản Demo

Tất cả tài khoản seed local dùng password `admin123`.

| Role | Email | Mục đích demo |
| --- | --- | --- |
| Admin | `admin@ecommerce.com` | Duyệt sản phẩm, quản lý đơn hàng/báo cáo/cấu hình |
| Seller 1 | `seller@ecommerce.com` | Linh Ceramic Studio, shop gốm/trang sức/decor, có order và custom order |
| Seller 2 | `seller2@ecommerce.com` | Túi Vải Lá Xanh, shop vải/quà tặng/giấy thủ công |
| Seller 3 | `seller3@ecommerce.com` | Mộc Nhiên Studio, shop đồ gỗ/đồ da/decor |
| Seller 4 | `seller4@ecommerce.com` | Len Nhà Mây, shop đồ len/crochet/phụ kiện tóc |
| Seller 5 | `seller5@ecommerce.com` | Gốm An Nhiên, shop gốm thủ công |
| Seller 6 | `seller6@ecommerce.com` | Nến Thơm Hoa Cỏ, shop nến/xà phòng/mỹ phẩm handmade |
| Real Importer | `seller7@ecommerce.com` và các `*.importer@local.dev` | Tài khoản local chứa 227 sản phẩm thật từ eBay + Shopify JSON |
| Customer 1 | `customer@ecommerce.com` | Cart, COD checkout, order delivered, review, chat |
| Customer 2 | `customer2@ecommerce.com` | Order pending/shipped, question, report |
| Customer 3 | `customer3@ecommerce.com` | Order cancelled/delivered, commission request |

## Admin Flow

Account: `admin@ecommerce.com / admin123`

1. Vào `/login`, đăng nhập admin.
2. Vào `/dashboard`, kiểm tra số liệu tổng quan.
3. Vào `/dashboard/products`, lọc trạng thái `Chờ duyệt`, approve hoặc reject một sản phẩm pending nếu có.
4. Vào `/dashboard/orders`, xem danh sách đơn hàng, mở chi tiết một đơn tại `/dashboard/orders/:id`.
5. Vào `/dashboard/reports`, mở báo cáo mẫu và cập nhật trạng thái xử lý.
6. Vào `/dashboard/vouchers` để thấy voucher active, expired và inactive.
7. Vào `/dashboard/flash-sales` để thấy campaign active, upcoming và ended.
8. Vào `/dashboard/categories` và `/dashboard/settings` để chứng minh admin quản lý dữ liệu nền tảng.
9. Mở chuông thông báo hoặc `/notifications`, kiểm tra notification sản phẩm chờ duyệt/báo cáo mới và bấm đánh dấu đã đọc.

Kết quả mong đợi: admin chỉ thấy menu vận hành admin/seller phù hợp, bảng có loading/empty/error state rõ, thao tác nguy hiểm có xác nhận ở các màn hình đã hỗ trợ.

## Seller Flow

Account: `seller@ecommerce.com / admin123`

1. Vào `/login`, đăng nhập seller.
2. Vào `/dashboard/products`, kiểm tra sản phẩm demo của shop.
3. Vào `/dashboard/shipping-profiles`, tạo hoặc kiểm tra hồ sơ vận chuyển mặc định của shop và ETA dự kiến.
4. Vào `/dashboard/new-listing`, tạo hoặc sửa sản phẩm demo; có thể nhập URL ảnh hợp lệ hoặc chọn ảnh trong thư viện media seed nếu UI đang hiển thị, rồi chọn hồ sơ vận chuyển cho sản phẩm.
5. Vào `/dashboard/orders`, mở kiện hàng của shop và cập nhật trạng thái theo thứ tự hợp lệ.
6. Vào `/seller/custom-orders`, kiểm tra đơn thiết kế riêng nếu seed/demo có dữ liệu, chuyển trạng thái `Đang chế tác -> Đang hoàn thiện -> Đang giao -> Đã giao`.
7. Trong `/seller/custom-orders`, bấm `Tiến độ` trên một đơn custom order, thêm tiêu đề/ghi chú/URL ảnh để khách hàng thấy nhật ký chế tác.
8. Vào `/dashboard/chat` nếu cần demo trao đổi với khách hàng.
9. Mở chuông thông báo hoặc `/notifications`, kiểm tra notification đơn hàng mới/sản phẩm đã duyệt và bấm đánh dấu đã đọc.

Kết quả mong đợi: seller không thấy menu admin-only, chỉ cập nhật đơn/sản phẩm thuộc shop của mình, UI hiển thị rõ sản phẩm đang chờ admin duyệt.

## Customer Flow

Account: `customer@ecommerce.com / admin123`

1. Vào `/login`, đăng nhập customer.
2. Vào `/discovery` hoặc trang chủ, tìm sản phẩm handmade có ảnh.
3. Mở `/products/:id`, xem ảnh, mô tả, review/question và thông tin seller.
4. Bấm thêm vào giỏ, vào `/cart`, cập nhật số lượng hoặc xóa sản phẩm.
5. Áp voucher `HANDMADE10` nếu sản phẩm thuộc category phù hợp.
   - Có thể thử `EXPIRED5` hoặc `INACTIVE15` để chứng minh voucher không hợp lệ bị chặn.
6. Vào `/checkout`, chọn địa chỉ giao hàng, giữ phương thức COD và đặt hàng.
7. Sau khi checkout COD thành công, vào `/profile/orders`, mở chi tiết đơn hàng.
8. Nếu có đơn delivered, tạo review hoặc kiểm tra review seed đã hiển thị.
9. Vào `/profile/wishlist` để kiểm tra wishlist và ảnh fallback.
10. Vào `/profile/commissions` để xem yêu cầu commission seed nếu cần demo custom quote.
11. Mở `/custom-orders/:id/review` từ thông báo hoặc flow commission/custom order, kiểm tra timeline `Tiến độ chế tác` có các mốc handmade.
12. Mở chuông thông báo hoặc `/notifications`, kiểm tra notification trạng thái đơn/báo giá và unread count.

Kết quả mong đợi: customer không thấy action seller/admin, COD checkout chạy được khi Stripe chưa cấu hình, không có broken image hoặc text `undefined/null`.

## Lưu Ý Demo

- Stripe là optional local; demo chính dùng COD.
- SMTP là optional local; OTP được log ra terminal backend nếu chưa cấu hình SMTP.
- Notification MVP dùng in-app polling 30 giây, chưa cần realtime/push/email cho demo local.
- Custom order progress MVP dùng nhật ký lưu DB và polling/query thường; chưa cần realtime tracking.
- Menu `Đối soát thanh toán` đang ẩn khỏi sidebar demo vì đây là màn hình vận hành nâng cao, không thuộc flow local MVP chính.
- Seed có 11 category, 62 sản phẩm curated và 227 sản phẩm thật từ `backend/prisma/fixtures/handmade-real-products.json`, order `PENDING/PROCESSING/SHIPPED/DELIVERED/CANCELLED`, voucher active/expired/inactive, review, question, report, chat, custom order, quote template, commission, notification và flash sale.
- Nếu cần demo từ trạng thái sạch, chạy `cd backend && npm run db:reset` rồi đăng nhập lại bằng các account ở trên.
