# 🏆 Hướng Dẫn Sử Dụng Chức Năng Giải Đấu

## 📋 Tổng quan

Chức năng Giải đấu cho phép bạn tổ chức các giải cầu lông với đầy đủ tính năng:
- ✅ Hỗ trợ 3 thể thức: **Loại trực tiếp**, **Vòng tròn**, **Kết hợp**
- ✅ 5 nội dung thi đấu: Đơn Nam, Đơn Nữ, Đôi Nam, Đôi Nữ, Đôi Nam-Nữ
- ✅ Tự động chia bảng theo trình độ (Pot 1-5)
- ✅ Quản lý lịch thi đấu và kết quả
- ✅ Xem bracket và bảng xếp hạng trực quan

---

## 🎯 Các bước tạo giải đấu

### Bước 1: Tạo giải đấu mới

1. Vào menu **"Giải đấu"**
2. Click **"Tạo Giải Đấu"**
3. Điền thông tin cơ bản:
   - **Tên giải đấu**: VD: "Giải Cầu Lông Mùa Hè 2025"
   - **Mô tả**: Thông tin chi tiết về giải
   - **Thể thức**: 
     - `Loại trực tiếp`: Thua 1 trận là bị loại (nhanh)
     - `Vòng tròn`: Đấu tất cả đối thủ trong bảng (công bằng)
     - `Kết hợp`: Vòng bảng → vòng loại trực tiếp
   - **Nội dung thi đấu**: Chọn 1 hoặc nhiều nội dung
   - **Thời gian**: Ngày bắt đầu, kết thúc, hạn đăng ký
   - **Địa điểm & Sân**: Chọn các sân sẽ thi đấu
   - **Cài đặt**: Số người tối đa, lệ phí (nếu có)

### Bước 2: Chọn thành viên

Có 2 cách thêm thành viên:

#### Cách 1: Chọn từ danh sách có sẵn
- Click vào thẻ thành viên để chọn
- Hệ thống tự động gán **Pot Level** dựa trên trình độ:
  - Pot 1 (cao nhất)
  - Pot 2
  - Pot 3
  - Pot 4
  - Pot 5 (thấp nhất)

#### Cách 2: Thêm thủ công
- Click **"+ Thêm người chơi"**
- Nhập tên, chọn Pot Level, chọn nội dung thi đấu
- Click **"Xác nhận thêm"**

> 💡 **Lưu ý**: Pot Level được dùng để chia bảng cân bằng, tránh các tay mạnh gặp nhau từ sớm

### Bước 3: Xác nhận và tạo

- Kiểm tra lại thông tin
- Click **"Tạo giải đấu"**
- Giải đấu được tạo ở trạng thái **"Nháp"**

---

## ⚙️ Quản lý giải đấu

### Xem chi tiết giải đấu

Click **"Xem Chi Tiết"** trên thẻ giải đấu để xem:

#### Tab 1: Thông tin chung
- Thể thức, thời gian, địa điểm
- Thống kê: số người đăng ký, số nội dung, số trận đấu

#### Tab 2: Danh sách
- Xem tất cả người đã đăng ký theo từng nội dung
- Hiển thị Pot Level của mỗi người

#### Tab 3: Lịch thi đấu
1. **Tạo lịch thi đấu**: Click **"Tạo lịch thi đấu"**
   - Hệ thống tự động:
     - Chia bảng theo Pot (nếu vòng tròn)
     - Seeding cân bằng (nếu loại trực tiếp)
     - Tạo tất cả các trận đấu
   
2. **Xếp lịch cho trận đấu**:
   - Click icon 📅 **Calendar**
   - Chọn sân và thời gian thi đấu
   - Click **"Xác nhận"**

3. **Nhập kết quả trận đấu**:
   - Click icon ✏️ **Edit**
   - Nhập tỉ số từng set (0-30 điểm)
   - Chọn người chiến thắng
   - Click **"Lưu kết quả"**
   - Hệ thống tự động:
     - Cập nhật bảng xếp hạng (vòng tròn)
     - Đưa người thắng vào vòng sau (loại trực tiếp)

#### Tab 4: Bracket (Loại trực tiếp)
- Xem bracket visualization
- Theo dõi diễn biến từng vòng: R1 → R2 → Tứ kết → Bán kết → Chung kết
- Người thắng được highlight màu xanh

#### Tab 5: Bảng xếp hạng (Vòng tròn)
- Xem standings của từng bảng
- Sắp xếp theo:
  1. Điểm (2 điểm/thắng)
  2. Hiệu số games
  3. Số games thắng
- Nhất bảng → màu xanh
- Nhì bảng → màu xanh nhạt

---

## 🎪 Thể thức thi đấu chi tiết

### 1. Loại trực tiếp (Single Elimination)

**Đặc điểm**:
- Thua 1 trận → bị loại
- Nhanh, căng thẳng
- Phù hợp: giải ngắn ngày, ít người

**Cách hoạt động**:
1. Hệ thống seeding người chơi theo Pot:
   - Pot 1 gặp Pot 5
   - Pot 2 gặp Pot 4
   - Pot 3 gặp Pot 3
2. Người thắng lên vòng sau
3. Cứ thế cho đến chung kết

**Số trận**:
- 16 người → 15 trận
- 32 người → 31 trận
- 64 người → 63 trận

### 2. Vòng tròn (Round Robin)

**Đặc điểm**:
- Đấu tất cả đối thủ trong bảng
- Công bằng, đánh giá đúng thực lực
- Phù hợp: giải dài ngày, nhiều sân

**Cách hoạt động**:
1. Chia người chơi thành 4 bảng (A, B, C, D)
2. Phân bổ theo Pot (snake draft):
   - Mỗi bảng có đều các Pot 1, 2, 3, 4, 5
   - VD: Bảng A có 1 người Pot 1, 1 người Pot 2, ...
3. Trong bảng: đấu vòng tròn tất cả với tất cả
4. Xếp hạng theo:
   - Điểm (2/thắng, 1/hòa, 0/thua)
   - Hiệu số games
   - Tổng games thắng

**Số trận**:
- 4 người/bảng → 6 trận/bảng
- 5 người/bảng → 10 trận/bảng
- 16 người (4 bảng x 4 người) → 24 trận

### 3. Kết hợp (Mixed)

**Đặc điểm**:
- Vòng bảng → lấy 2 đầu → loại trực tiếp
- Cân bằng giữa công bằng và thời gian
- Phù hợp: giải chuyên nghiệp

**Cách hoạt động**:
1. Giai đoạn 1: Vòng bảng (Round Robin)
2. Lấy 2 người đứng đầu mỗi bảng
3. Giai đoạn 2: Loại trực tiếp với 8 người

**Số trận**:
- 16 người → 24 trận vòng bảng + 7 trận loại = 31 trận

---

## 🎲 Cách hệ thống chia bảng

### Seeding cho Loại trực tiếp

```
Pot 1 vs Pot 5
Pot 4 vs Pot 3 (nhánh trên)
--------------
Pot 2 vs Pot 4
Pot 3 vs Pot 5 (nhánh dưới)
```

→ Pot 1 và Pot 2 chỉ gặp nhau ở chung kết

### Snake Draft cho Vòng tròn

```
Pot 1: [A] → [B] → [C] → [D]
Pot 2: [D] → [C] → [B] → [A]  ⬅ đảo chiều
Pot 3: [A] → [B] → [C] → [D]
Pot 4: [D] → [C] → [B] → [A]
Pot 5: [A] → [B] → [C] → [D]
```

→ Mỗi bảng có đều các trình độ

---

## 📊 Quản lý nội dung đôi

### Tạo cặp đôi tự động

Khi tạo lịch cho nội dung đôi, hệ thống sẽ:

1. **Shuffle ngẫu nhiên** danh sách người chơi
2. **Ghép cặp tuần tự**: Người 1 + 2, người 3 + 4, ...
3. **Tính Pot cho đội**: Trung bình Pot của 2 người
   - VD: Pot 2 + Pot 4 = Đội Pot 3
4. **Seeding/Chia bảng** theo Pot của đội

### Tạo cặp đôi thủ công (tùy chọn)

- Trước khi tạo lịch, vào tab "Đội đôi"
- Tự tay ghép các cặp
- Sau đó mới tạo lịch thi đấu

---

## 🏅 Trạng thái giải đấu

| Trạng thái | Mô tả | Có thể làm gì |
|-----------|-------|--------------|
| **Nháp** | Vừa tạo, chưa public | Sửa thông tin, thêm/bớt người |
| **Đang đăng ký** | Mở đăng ký | Người dùng có thể đăng ký |
| **Đang diễn ra** | Đã bắt đầu thi đấu | Nhập kết quả, xếp lịch |
| **Hoàn thành** | Đã kết thúc | Chỉ xem, không sửa |
| **Đã hủy** | Bị hủy | Chỉ xem |

**Chuyển trạng thái**:
- Admin có thể chuyển trạng thái thủ công
- Hoặc tự động theo thời gian:
  - Hết hạn đăng ký → "Đang diễn ra"
  - Hết thời gian kết thúc → "Hoàn thành"

---

## ⚡ Tips & Tricks

### 1. Tính số lượng sân cần thiết

```
Số sân tối thiểu = Tổng số trận / Số giờ có thể đấu
```

VD: 30 trận, mỗi trận 1h, giải 2 ngày (8h/ngày):
- Cần: 30 / 16 = ~2 sân

### 2. Lên lịch hợp lý

- **Vòng 1**: Đấu tất cả trong 1 ngày (tập trung)
- **Vòng 2 đến bán kết**: Rải đều các ngày sau
- **Chung kết**: Đặt vào giờ vàng, sân đẹp nhất

### 3. Xử lý số người lẻ

Nếu không đủ lũy thừa 2 (16, 32, 64):
- Hệ thống tạo BYE (nghỉ vòng 1)
- Người Pot cao nhất được BYE

### 4. Dự phòng trận đấu

- Thêm 15-20% thời gian dự phòng
- VD: Trận dự kiến 1h → Xếp lịch cách nhau 1h15

### 5. Live scoring

- Có thể dùng tablet/điện thoại để nhập kết quả real-time
- Khán giả xem bracket cập nhật trực tiếp

---

## 🔧 Troubleshooting

### Không tạo được lịch thi đấu?

✅ Kiểm tra:
- Có ít nhất 2 người tham gia nội dung đó
- Đã chọn đúng nội dung trong tab
- Chưa tạo lịch cho nội dung đó rồi (không tạo lại)

### Nhập kết quả bị lỗi?

✅ Kiểm tra:
- Tỉ số hợp lệ (0-30)
- Đã chọn người thắng
- Cả 2 người đã được xếp lịch (không phải TBD)

### Bracket hiển thị sai?

✅ Làm mới trang (Pull to refresh trên mobile)

### Muốn sửa kết quả đã nhập?

✅ Click lại vào trận đấu → Sửa tỉ số → Lưu lại

---

## 📱 Sử dụng trên Mobile

- **Vuốt xuống** để làm mới dữ liệu
- **Vuốt ngang** trong bracket để xem các vòng
- **Zoom in/out** trong bảng xếp hạng

---

## 🎯 Checklist tổ chức giải đấu

### Trước giải (1-2 tuần)

- [ ] Tạo giải đấu trên hệ thống
- [ ] Mở đăng ký, thông báo rộng rãi
- [ ] Chuẩn bị sân, dụng cụ
- [ ] Tạo group chat cho người tham gia

### Trước giải (2-3 ngày)

- [ ] Đóng đăng ký
- [ ] Tạo lịch thi đấu
- [ ] Xếp lịch cụ thể cho từng trận (sân + giờ)
- [ ] Gửi lịch cho người chơi

### Trong giải

- [ ] Check-in người chơi
- [ ] Nhập kết quả sau mỗi trận
- [ ] Cập nhật bracket/bảng xếp hạng
- [ ] Thông báo lịch các trận tiếp theo

### Sau giải

- [ ] Đóng giải đấu (trạng thái "Hoàn thành")
- [ ] Xuất báo cáo, thống kê
- [ ] Trao giải, chụp ảnh lưu niệm
- [ ] Thu thập feedback

---

## 💡 Các tính năng nâng cao (roadmap)

- 🔜 Live streaming trận đấu
- 🔜 Push notification nhắc lịch
- 🔜 Export bracket dạng PDF/ảnh
- 🔜 Tích hợp thanh toán online
- 🔜 Rating ELO tự động
- 🔜 Gợi ý ghép cặp đôi tối ưu

---

## 📞 Hỗ trợ

Gặp vấn đề? Liên hệ:
- 📧 Email: support@badminton.app
- 💬 Chat: Trong app (icon 💬)
---

**Chúc bạn tổ chức giải đấu thành công! 🏆🎉**