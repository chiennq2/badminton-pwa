# 🏸 Quản Lý Cầu Lông - Badminton Session Management PWA

Ứng dụng Progressive Web App (PWA) quản lý lịch đánh cầu lông được xây dựng với React + Firebase, hoàn toàn bằng tiếng Việt.

## ✨ Tính năng chính

### 🎯 Quản lý cơ bản
- **Quản lý sân cầu lông**: CRUD sân với thông tin giá cả, địa chỉ
- **Quản lý thành viên**: Thông tin cá nhân, trình độ, lịch sử tham gia
- **Quản lý nhóm**: Tạo và quản lý các nhóm thành viên
- **Quản lý người dùng**: Phân quyền admin/user

### 📅 Quản lý lịch đánh
- **Tạo lịch với Stepper**: 4 bước (Thông tin → Thành viên → Sảnh chờ → Chi phí)
- **Điểm danh thành viên**: Checkbox cho từng thành viên
- **Sảnh chờ**: Drag & drop để sắp xếp thứ tự ưu tiên
- **Quản lý chi phí**: Tự động tính toán và chia đều chi phí
- **Hoàn thành lịch**: Xuất thông tin thanh toán cho từng thành viên

### 📊 Báo cáo và thống kê
- **Biểu đồ doanh thu**: Chart.js với dữ liệu theo tháng
- **Top thành viên**: Thống kê thành viên tích cực nhất
- **Sử dụng sân**: Phân tích tần suất sử dụng các sân
- **Xuất báo cáo**: CSV export cho tất cả dữ liệu

### 🖼️ Xuất ảnh và chia sẻ
- **Export hình ảnh**: html-to-image để xuất thông tin lịch
- **Chia sẻ**: Tạo ảnh summary cho mỗi lịch đánh

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** + **TypeScript** - UI framework
- **Material UI v5** - Component library với theme tùy chỉnh
- **React Router v6** - Routing
- **React Query** - Data fetching và caching
- **Formik + Yup** - Form validation
- **Chart.js** - Biểu đồ và thống kê
- **html-to-image** - Export ảnh
- **react-beautiful-dnd** - Drag & drop cho sảnh chờ

### Backend & Database
- **Firebase Authentication** - Đăng nhập/đăng ký
- **Firestore** - NoSQL database với offline persistence
- **Firebase Storage** - Lưu trữ file
- **Cloud Functions** - Server-side logic (tùy chọn)

### PWA Features
- **Service Worker** - Offline caching
- **Web App Manifest** - Cài đặt như native app
- **Push Notifications** - Thông báo (tùy chọn)
- **Background Sync** - Đồng bộ dữ liệu offline

## 🚀 Cài đặt và chạy

### 1. Clone repository
```bash
git clone <repository-url>
cd badminton-pwa
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình Firebase
1. Tạo project mới trên [Firebase Console](https://console.firebase.google.com)
2. Bật Authentication với Email/Password
3. Tạo Firestore database
4. Copy cấu hình Firebase vào file `.env`

```bash
cp .env.example .env
```

Điền thông tin Firebase vào file `.env`:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Cấu hình Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // All authenticated users can read courts, members, groups
    match /{collection=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Sessions can be read by all, written by authenticated users
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

### 5. Chạy ứng dụng

#### Development
```bash
npm run dev
```

#### Production build
```bash
npm run build
npm run preview
```

## 📱 PWA Installation

Ứng dụng hỗ trợ cài đặt như native app:

1. Mở ứng dụng trên browser (Chrome, Edge, Safari)
2. Click "Cài đặt" khi popup xuất hiện
3. Hoặc dùng menu "Add to Home Screen" của browser

## 🎨 Giao diện và UX

### Theme
- **Primary Color**: Green (#4caf50) - đặc trưng cầu lông
- **Dark/Light Mode**: Toggle đầy đủ
- **Typography**: Inter font với các size chuẩn
- **Border Radius**: 12px cho modern look

### Components
- **AppBar + Drawer**: Navigation layout responsive
- **DataGrid**: Hiển thị dữ liệu với search, filter, export
- **Stepper**: Form tạo lịch 4 bước
- **Dialog**: Modal forms thay vì redirect pages
- **Drag & Drop**: Sắp xếp sảnh chờ
- **Charts**: Bar và Doughnut charts cho báo cáo

### Mobile-first
- Responsive design cho tất cả màn hình
- Touch-friendly interface
- Drawer navigation cho mobile
- Optimized performance

## 📊 Database Schema

### Collections

#### `users`
```typescript
{
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `courts`
```typescript
{
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `members`
```typescript
{
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skillLevel: 'Mới bắt đầu' | 'Trung bình' | 'Khá' | 'Giỏi' | 'Chuyên nghiệp';
  joinDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `sessions`
```typescript
{
  id: string;
  name: string;
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  members: SessionMember[];
  waitingList: WaitingListMember[];
  expenses: SessionExpense[];
  totalCost: number;
  costPerPerson: number;
  settlements: Settlement[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint           # Run ESLint

# Firebase
firebase deploy        # Deploy to Firebase Hosting
firebase emulators:start # Run local emulators
```

## 🌟 Tính năng nổi bật

### 1. Offline-first
- Firestore offline persistence
- Service Worker caching
- Background sync khi có kết nối

### 2. Real-time
- Real-time updates từ Firestore
- React Query caching và synchronization
- Optimistic updates

### 3. Mobile-friendly
- PWA cài đặt được
- Touch gestures
- Responsive design
- Fast loading

### 4. Production-ready
- TypeScript cho type safety
- Error boundaries
- Loading states
- Form validation
- Security rules

## 📁 Cấu trúc project

```
src/
├── components/          # Shared components
│   ├── Layout.tsx      # Main app layout
│   └── SessionForm.tsx # Session creation form
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── hooks/              # Custom hooks
│   └── index.ts       # React Query hooks
├── pages/              # Page components
│   ├── Dashboard.tsx   # Dashboard page
│   ├── Courts.tsx     # Courts management
│   ├── Members.tsx    # Members management
│   ├── Groups.tsx     # Groups management
│   ├── Sessions.tsx   # Sessions management
│   ├── SessionDetail.tsx # Session detail view
│   ├── Reports.tsx    # Reports and analytics
│   ├── AdminUsers.tsx # User management
│   └── Settings.tsx   # System settings
├── types/              # TypeScript types
│   └── index.ts       # Type definitions
├── utils/              # Utility functions
│   └── index.ts       # Helper functions
├── config/             # Configuration
│   └── firebase.ts    # Firebase config
├── theme/              # MUI theme
│   └── index.ts       # Theme configuration
├── App.tsx            # Main app component
└── main.tsx           # Entry point
```

## 🔐 Security

- **Authentication**: Firebase Auth với email/password
- **Authorization**: Role-based access control
- **Firestore Rules**: Secure database access
- **Input Validation**: Client và server-side validation
- **XSS Protection**: Sanitized inputs

## 🚀 Deployment

### Firebase Hosting
```bash
# Build và deploy
npm run build
firebase deploy
```

### Vercel/Netlify
1. Connect repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables

## 📱 PWA Features

- ✅ **Installable**: Add to home screen
- ✅ **Offline support**: Service worker caching
- ✅ **Responsive**: Mobile-first design  
- ✅ **Fast loading**: Code splitting và lazy loading
- ✅ **App-like**: Standalone display mode
- ✅ **Shortcuts**: Quick actions từ home screen

## 🎯 Roadmap

- [ ] Push notifications cho lịch sắp tới
- [ ] Export PDF cho settlements
- [ ] Tích hợp payment gateway
- [ ] Chat trong lịch đánh
- [ ] Đánh giá và feedback
- [ ] Machine learning cho gợi ý nhóm

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Create pull request

---

**Phát triển bởi**: Chien Nguyen
**Liên hệ**: chiennq.dev@gmail.com