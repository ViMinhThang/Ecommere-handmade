# Product Personalization Smoke

- [ ] Login seller, mở `/dashboard/new-listing`, bật `Cho phép cá nhân hóa`, nhập hướng dẫn và giới hạn ký tự, lưu sản phẩm thành công.
- [ ] Seller sửa lại sản phẩm, bật `Bắt buộc nhập nội dung cá nhân hóa`, reload form vẫn thấy cấu hình đã lưu.
- [ ] Customer mở product detail của sản phẩm có cá nhân hóa; box `Cá nhân hóa sản phẩm` hiển thị hướng dẫn, counter và giới hạn ký tự.
- [ ] Customer bấm thêm vào giỏ khi personalization required nhưng chưa nhập text; UI chặn và backend vẫn là source of truth.
- [ ] Customer nhập text hợp lệ, thêm vào giỏ; cart hiển thị `Yêu cầu cá nhân hóa` dưới tên sản phẩm.
- [ ] Checkout hiển thị personalization text cho từng item, không đổi giá, voucher, COD hoặc Stripe flow.
- [ ] Checkout COD thành công; customer order detail hiển thị personalization snapshot đã nhập.
- [ ] Seller mở `/dashboard/orders/:id`; thấy `Yêu cầu cá nhân hóa` của item trong sub-order thuộc shop mình.
- [ ] Admin mở `/dashboard/orders/:id`; thấy section `Yêu cầu cá nhân hóa` cho các item có personalization.
- [ ] Product không bật personalization vẫn add cart, checkout và tạo order bình thường.
