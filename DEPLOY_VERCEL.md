# Hướng Dẫn Deploy Dự Án Badminton PWA lên Vercel

Dự án này là một Progressive Web App (PWA) được xây dựng bằng Vite + React + TypeScript, sử dụng Firebase làm backend. Vercel hỗ trợ tốt cho các dự án static như vậy.

## Điều Kiện Tiên Quyết

- Tài khoản Vercel (đăng ký tại [vercel.com](https://vercel.com))
- Dự án Firebase đã được cấu hình (xem `FIREBASE_SETUP.MD`)
- Node.js và npm đã được cài đặt

## Các Bước Deploy

### 1. Cài Đặt Vercel CLI

```bash
npm install -g vercel
```

### 2. Đăng Nhập vào Vercel

```bash
vercel login
```

Làm theo hướng dẫn để đăng nhập bằng tài khoản Vercel của bạn.

### 3. Chuẩn Bị Dự Án

Đảm bảo dự án build thành công locally:

```bash
npm run build
```

Nếu build thành công, thư mục `dist/` sẽ được tạo chứa các file static.

### 4. Deploy lên Vercel

Trong thư mục gốc của dự án, chạy:

```bash
vercel
```

Vercel sẽ tự động phát hiện đây là dự án Vite và cấu hình phù hợp:

- **Framework Preset**: Vite
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Xác nhận các cài đặt mặc định bằng cách nhấn Enter.

### 5. Cấu Hình Environment Variables

Dự án sử dụng Firebase, cần thiết lập các biến môi trường sau trong Vercel:

Truy cập [Vercel Dashboard](https://vercel.com/dashboard), chọn dự án của bạn, vào tab "Settings" > "Environment Variables".

Thêm các biến sau (lấy từ file `.env` local hoặc Firebase Console):

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_NOTI_URL=your_backend_noti_url
```

### 6. Redeploy sau khi thiết lập Environment Variables

Sau khi thêm environment variables, trigger redeploy:

```bash
vercel --prod
```

Hoặc vào Vercel Dashboard và trigger deploy manual.

## Cấu Hình PWA

Dự án đã được cấu hình PWA với `vite-plugin-pwa`. Vercel sẽ serve service worker và manifest.json từ thư mục `dist/`.

## Kiểm Tra Deploy

Sau khi deploy thành công:

1. Truy cập URL được cung cấp bởi Vercel
2. Kiểm tra PWA: Trên mobile, có thể install như app native
3. Kiểm tra Firebase connection: Đăng nhập và sử dụng các tính năng

## Troubleshooting

### Build Fail trên Vercel

- Kiểm tra logs trong Vercel Dashboard
- Đảm bảo tất cả dependencies được liệt kê trong `package.json`
- Nếu có lỗi TypeScript, kiểm tra `tsconfig.json`

### Firebase Không Hoạt Động

- Kiểm tra environment variables đã được set đúng
- Đảm bảo Firebase project rules cho phép access từ domain Vercel

### PWA Không Hoạt Động

- Kiểm tra service worker được register trong browser dev tools
- Đảm bảo HTTPS (Vercel tự động cung cấp)

## Cập Nhật Dự Án

Để cập nhật:

```bash
# Commit changes
git add .
git commit -m "Update app"

# Deploy
vercel --prod
```

## Custom Domain (Tùy Chọn)

Trong Vercel Dashboard:
1. Vào Settings > Domains
2. Thêm custom domain
3. Cấu hình DNS theo hướng dẫn

## Lưu Ý Quan Trọng

- Đảm bảo Firebase Security Rules được cấu hình đúng để bảo mật dữ liệu
- PWA chỉ hoạt động trên HTTPS (Vercel cung cấp tự động)
- Environment variables chứa API keys - giữ bí mật và không commit vào git
