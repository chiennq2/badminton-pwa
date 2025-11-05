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
import { notificationService } from "./services/notificationService";
import NotificationManagement from "./pages/NotificationManagement";

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
  const theme = getTheme(darkMode ? "dark" : "light");
  const { isMobile } = useResponsive();

  // Notification states
  const [notificationStatus, setNotificationStatus] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

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

// App.tsx - Updated notification registration section
// Replace the useEffect for notification registration with this:

useEffect(() => {
  // Đăng ký nhận thông báo khi user đăng nhập
  if (currentUser) {
    console.log('🔔 Checking notification capability...');
    
    // Đợi một chút để đảm bảo tất cả services đã sẵn sàng
    const timer = setTimeout(async () => {
      try {
        // Kiểm tra khả năng nhận thông báo
        const capability = await notificationService.checkNotificationCapability();
        console.log('📱 Notification capability:', capability);

        // Hiển thị thông báo về khả năng của thiết bị
        if (!capability.canReceive) {
          setNotificationStatus({
            open: true,
            message: `${capability.reason}${capability.suggestion ? '. ' + capability.suggestion : ''}`,
            severity: 'warning'
          });
          return;
        }

        // Nếu thiết bị hỗ trợ, thử đăng ký
        console.log('🔔 Registering device for notifications...');
        const result = await notificationService.registerDevice(currentUser.id);
        console.log('📱 Registration result:', result);
        
        if (result.success) {
          setNotificationStatus({
            open: true,
            message: 'Đã đăng ký nhận thông báo thành công!',
            severity: 'success'
          });

          // Lắng nghe thông báo khi app đang mở
          notificationService.onMessageReceived((payload) => {
            console.log('📬 Notification received:', payload);
            
            // Hiển thị notification nếu browser hỗ trợ
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(
                payload.notification?.title || 'Thông báo mới',
                {
                  body: payload.notification?.body || '',
                  icon: payload.notification?.icon || '/favicon.ico',
                  badge: '/pwa-192x192.png',
                  data: payload.data
                }
              );
            }

            // Hiển thị snackbar
            setNotificationStatus({
              open: true,
              message: payload.notification?.body || 'Có thông báo mới',
              severity: 'info'
            });
          });
        } else {
          // Không thể đăng ký - có thể do user từ chối permission
          if (result.message?.includes('từ chối')) {
            setNotificationStatus({
              open: true,
              message: result.message,
              severity: 'warning'
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to register device:', error);
        // Không hiển thị lỗi cho user nếu chỉ là vấn đề kỹ thuật
      }
    }, 2000); // Đợi 2s để đảm bảo SW đã ready

    return () => clearTimeout(timer);
  }
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

      {/* Notification Snackbar */}
      <Snackbar
        open={notificationStatus.open}
        autoHideDuration={6000}
        onClose={() => setNotificationStatus({ ...notificationStatus, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotificationStatus({ ...notificationStatus, open: false })}
          severity={notificationStatus.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notificationStatus.message}
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
      // Đăng ký Service Worker với scope đúng
      const swPath = import.meta.env.DEV ? '/sw.js' : '/sw.js';
      
      navigator.serviceWorker
        .register(swPath, {
          scope: '/',
          updateViaCache: 'none' // Quan trọng: không cache SW file
        })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration);
          console.log("[PWA] Scope:", registration.scope);
          console.log("[PWA] Active:", registration.active?.state);
          
          // Kiểm tra khi Service Worker đã sẵn sàng
          navigator.serviceWorker.ready.then((readyReg) => {
            console.log("[PWA] Service Worker ready:", {
              active: readyReg.active?.state,
              scope: readyReg.scope
            });
          });

          // Khi có SW mới được cài
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[PWA] Update found, new worker:", newWorker?.state);
            
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                console.log("[PWA] New worker state changed:", newWorker.state);
                
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] New version available");
                  setWaitingWorker(newWorker);
                  setShowReload(true);
                }
              });
            }
          });

          // Check for updates mỗi 1 phút (chỉ trong production)
          if (!import.meta.env.DEV) {
            setInterval(() => {
              registration.update().catch(err => 
                console.log("[PWA] Update check failed:", err)
              );
            }, 60000);
          }
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });

      // Lắng nghe message từ SW
      const handleSWMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "RELOAD_PAGE") {
          console.log("[PWA] Received RELOAD_PAGE from Service Worker");
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("message", handleSWMessage);

      // Khi SW mới kích hoạt
      const handleControllerChange = () => {
        console.log("[PWA] Controller changed — reloading app");
        window.location.reload();
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
    } else {
      console.warn("[PWA] Service Worker not supported");
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