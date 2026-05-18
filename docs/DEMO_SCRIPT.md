# Demo Script Local MVP

Script này dùng cho demo đồ án sau khi đã chạy `npm run db:migrate`, `npm run db:seed`, backend ở `http://localhost:3001` và frontend ở `http://localhost:3000`.

## Tài Khoản Demo

Tất cả tài khoản seed local dùng password `admin123`.

| Role | Email | Mục đích demo |
| --- | --- | --- |
| Admin | `admin@ecommerce.com` | Duyệt sản phẩm, quản lý đơn hàng/báo cáo/cấu hình |
| Seller 1 | `seller@ecommerce.com` | Shop gốm/trang sức/gỗ, có order và custom order |
| Seller 2 | `seller2@ecommerce.com` | Shop quà tặng/vải/nến/crochet, có order và custom order |
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
3. Vào `/dashboard/new-listing`, tạo hoặc sửa sản phẩm demo, chọn ảnh từ thư viện ảnh seed `Ảnh demo sản phẩm` nếu cần.
4. Vào `/dashboard/orders`, mở kiện hàng của shop và cập nhật trạng thái theo thứ tự hợp lệ.
5. Vào `/seller/custom-orders`, kiểm tra đơn thiết kế riêng nếu seed/demo có dữ liệu, chuyển trạng thái `Đang chế tác -> Đang hoàn thiện -> Đang giao -> Đã giao`.
6. Vào `/dashboard/chat` nếu cần demo trao đổi với khách hàng.
7. Mở chuông thông báo hoặc `/notifications`, kiểm tra notification đơn hàng mới/sản phẩm đã duyệt và bấm đánh dấu đã đọc.

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
11. Mở chuông thông báo hoặc `/notifications`, kiểm tra notification trạng thái đơn/báo giá và unread count.

Kết quả mong đợi: customer không thấy action seller/admin, COD checkout chạy được khi Stripe chưa cấu hình, không có broken image hoặc text `undefined/null`.

## Lưu Ý Demo

- Stripe là optional local; demo chính dùng COD.
- SMTP là optional local; OTP được log ra terminal backend nếu chưa cấu hình SMTP.
- Notification MVP dùng in-app polling 30 giây, chưa cần realtime/push/email cho demo local.
- Menu `Đối soát thanh toán` đang ẩn khỏi sidebar demo vì đây là màn hình vận hành nâng cao, không thuộc flow local MVP chính.
- Seed có 8 category, khoảng 25 sản phẩm, order `PENDING/PROCESSING/SHIPPED/DELIVERED/CANCELLED`, voucher active/expired/inactive, review, question, report, chat, custom order, quote template, commission và flash sale.
- Nếu cần demo từ trạng thái sạch, chạy `cd backend && npm run db:reset` rồi đăng nhập lại bằng các account ở trên.
