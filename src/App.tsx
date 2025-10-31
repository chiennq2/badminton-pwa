import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Snackbar,
  Button,
  Alert,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import updateLocale from "dayjs/plugin/updateLocale";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import localeData from "dayjs/plugin/localeData";

import getTheme from "./theme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getLocalStorageItem, setLocalStorageItem } from "./utils";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Courts from "./pages/Courts";
import Members from "./pages/Members";
import Groups from "./pages/Groups";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
import Settings from "./pages/Settings";
import { useResponsive } from "./hooks/useResponsive";
import SessionsMobile from "./components/SessionsMobile";
import ReportsMobile from "./components/ReportsMobile";
import SessionDetailMobile from "./pages/SessionDetailMobile";
import usePullToRefresh from "./hooks/usePullToRefresh";
import PullToRefreshIndicator from "./components/PullToRefreshIndicator";
import Tournaments from "./pages/Tournaments";
import Profile from "./pages/Profile";
import NotificationManagement from "./pages/NotificationManagement";
import notificationService from "./services/notificationService";

// ===== CONFIG DAYJS =====
dayjs.extend(updateLocale);
dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(localeData);

dayjs.locale("vi");
dayjs.updateLocale("vi", {
  weekStart: 1,
  weekdays: [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ],
  weekdaysShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  weekdaysMin: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  months: [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ],
  monthsShort: [
    "Th1",
    "Th2",
    "Th3",
    "Th4",
    "Th5",
    "Th6",
    "Th7",
    "Th8",
    "Th9",
    "Th10",
    "Th11",
    "Th12",
  ],
  formats: {
    LT: "HH:mm",
    LTS: "HH:mm:ss",
    L: "DD/MM/YYYY",
    LL: "D MMMM YYYY",
    LLL: "D MMMM YYYY HH:mm",
    LLLL: "dddd, D MMMM YYYY HH:mm",
  },
});

// ===== REACT QUERY CONFIG =====
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// ===== APP CONTENT (USER ROUTES) =====
const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    getLocalStorageItem("darkMode", true)
  );
  const [notificationError, setNotificationError] = useState<string>("");
  const [notificationSuccess, setNotificationSuccess] = useState<string>("");
  
  const theme = getTheme(darkMode ? "dark" : "light");
  const { isMobile } = useResponsive();

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setLocalStorageItem("darkMode", newDarkMode);
  };

  const handleRefresh = async () => {
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log("[PWA] Cleared all caches before reload");
      } catch (e) {
        console.warn("[PWA] Cache clear failed:", e);
      }
    }
    window.location.reload();
  };

  const { isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    threshold: 150,
    onRefresh: handleRefresh,
  });

  // ✅ FIX: Đăng ký thiết bị ĐÚNG CÁCH
  useEffect(() => {
    if (!currentUser) return;

    const registerForNotifications = async () => {
      try {
        console.log('[Notification] Starting registration process...');
        
        // 1️⃣ Kiểm tra browser support
        if (!('Notification' in window)) {
          throw new Error('Browser không hỗ trợ thông báo');
        }

        if (!('serviceWorker' in navigator)) {
          throw new Error('Browser không hỗ trợ Service Worker');
        }

        // 2️⃣ Đợi Service Worker sẵn sàng
        console.log('[Notification] Waiting for Service Worker...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[Notification] Service Worker ready:', registration);

        // 3️⃣ Kiểm tra quyền thông báo
        let permission = Notification.permission;
        console.log('[Notification] Current permission:', permission);

        if (permission === 'default') {
          console.log('[Notification] Requesting permission...');
          permission = await Notification.requestPermission();
          console.log('[Notification] Permission result:', permission);
        }

        if (permission !== 'granted') {
          throw new Error('Người dùng từ chối quyền thông báo');
        }

        // 4️⃣ Đăng ký thiết bị với Firebase
        console.log('[Notification] Registering device with Firebase...');
        const token = await notificationService.registerDevice(currentUser.id);
        
        if (token) {
          console.log('[Notification] Device registered successfully:', token);
          setNotificationSuccess('Đã bật thông báo thành công!');
          
          // 5️⃣ Lắng nghe thông báo khi app đang mở
          notificationService.onMessageReceived((payload) => {
            console.log('[Notification] Message received:', payload);
            
            // Hiển thị notification nếu browser hỗ trợ
            if (Notification.permission === 'granted') {
              new Notification(
                payload.notification?.title || 'Thông báo mới',
                {
                  body: payload.notification?.body || '',
                  icon: '/favicon.ico',
                  badge: '/pwa-192x192.png',
                  tag: payload.data?.tag || 'default',
                  requireInteraction: false,
                }
              );
            }
          });
        } else {
          throw new Error('Không lấy được FCM token');
        }

      } catch (error: any) {
        console.error('[Notification] Registration failed:', error);
        
        // Xử lý các lỗi cụ thể
        let errorMessage = 'Không thể đăng ký thông báo';
        
        if (error.code === 'messaging/permission-blocked') {
          errorMessage = 'Vui lòng bật quyền thông báo trong cài đặt trình duyệt';
        } else if (error.code === 'messaging/token-subscribe-failed') {
          errorMessage = 'Không thể kết nối với máy chủ thông báo';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setNotificationError(errorMessage);
      }
    };

    // Delay 1 giây để đảm bảo Service Worker đã sẵn sàng
    const timer = setTimeout(() => {
      registerForNotifications();
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentUser]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PullToRefreshIndicator
        isPulling={isPulling}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
      />
      <Router>
        <Layout darkMode={darkMode} onDarkModeToggle={handleDarkModeToggle}>
          <Routes>
            {/* ADMIN */}
            {currentUser.role === "admin" && (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courts" element={<Courts />} />
                <Route path="/members" element={<Members />} />
                <Route path="/groups" element={<Groups />} />
                <Route
                  path="/sessions"
                  element={isMobile ? <SessionsMobile /> : <Sessions />}
                />
                <Route
                  path="/sessions/:id"
                  element={
                    isMobile ? <SessionDetailMobile /> : <SessionDetail />
                  }
                />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route
                  path="/reports"
                  element={isMobile ? <ReportsMobile /> : <Reports />}
                />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/notifications" element={<NotificationManagement />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}

            {/* USER */}
            {currentUser.role === "user" && (
              <>
                <Route path="/groups" element={<Groups />} />
                <Route
                  path="/sessions"
                  element={isMobile ? <SessionsMobile /> : <Sessions />}
                />
                <Route
                  path="/sessions/:id"
                  element={
                    isMobile ? <SessionDetailMobile /> : <SessionDetail />
                  }
                />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route
                  path="/reports"
                  element={isMobile ? <ReportsMobile /> : <Reports />}
                />
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="*"
                  element={<Navigate to="/sessions" replace />}
                />
              </>
            )}

            <Route
              path="*"
              element={
                <Navigate
                  to={currentUser.role === "admin" ? "/" : "/sessions"}
                  replace
                />
              }
            />
          </Routes>
        </Layout>
      </Router>

      {/* Snackbar cho lỗi thông báo */}
      <Snackbar
        open={!!notificationError}
        autoHideDuration={6000}
        onClose={() => setNotificationError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setNotificationError("")}>
          {notificationError}
        </Alert>
      </Snackbar>

      {/* Snackbar cho thành công */}
      <Snackbar
        open={!!notificationSuccess}
        autoHideDuration={3000}
        onClose={() => setNotificationSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setNotificationSuccess("")}>
          {notificationSuccess}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

// ===== MAIN APP COMPONENT =====
const App: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let isReloading = false;

      // ✅ CHỈ đăng ký 1 Service Worker duy nhất
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Service Worker registered:", registration);
          
          // Kiểm tra khi Service Worker đã sẵn sàng
          navigator.serviceWorker.ready.then((readyReg) => {
            console.log("[SW] Service Worker ready and active:", readyReg.active?.state);
          });

          // Khi có SW mới được cài
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[SW] New version found");
                  setWaitingWorker(newWorker);
                  setShowReload(true);
                }
              });
            }
          });
        })
        .catch((err) =>
          console.log("[SW] Service Worker registration failed:", err)
        );

      // Lắng nghe message từ SW
      const handleSWMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "RELOAD_PAGE" && !isReloading) {
          console.log("[SW] Received RELOAD_PAGE from Service Worker");
          isReloading = true;
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      };
      navigator.serviceWorker.addEventListener("message", handleSWMessage);

      // Khi SW mới kích hoạt → reload app
      const handleControllerChange = () => {
        if (!isReloading) {
          console.log("[SW] Controller changed – reloading app");
          isReloading = true;
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange
      );

      // Cleanup
      return () => {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange
        );
      };
    }
  }, []);

  const reloadPage = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShowReload(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LocalizationProvider>

      <Snackbar
        open={showReload}
        message="Đã có phiên bản mới! Ứng dụng sẽ tự động cập nhật."
        action={
          <Button color="inherit" size="small" onClick={reloadPage}>
            TẢI LẠI
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </QueryClientProvider>
  );
};

export default App;