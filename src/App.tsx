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
  Snackbar, // Thêm import
  Button,   // Thêm import
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

// Components
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

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return getLocalStorageItem("darkMode", true);
  });

  const theme = getTheme(darkMode ? "dark" : "light");
  const { isMobile } = useResponsive();

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setLocalStorageItem("darkMode", newDarkMode);
  };

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
      <Router>
        <Layout darkMode={darkMode} onDarkModeToggle={handleDarkModeToggle}>
          <Routes>
            {/* Routes cho role ADMIN - full quyền */}
            {currentUser.role === "admin" && (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courts" element={<Courts />} />
                <Route path="/members" element={<Members />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/sessions" element={isMobile ? <SessionsMobile /> : <Sessions />} />
                <Route path="/sessions/:id" element={isMobile ? <SessionDetailMobile /> : <SessionDetail />} />
                <Route path="/reports" element={isMobile ? <ReportsMobile/> :<Reports />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}

            {/* Routes cho role USER - chỉ có quyền với sessions của mình */}
            {currentUser.role === "user" && (
              <>
                <Route path="/sessions" element={isMobile ? <SessionsMobile /> : <Sessions />} />
                <Route path="/sessions/:id" element={isMobile ? <SessionDetailMobile /> : <SessionDetail />} />
                <Route path="/reports" element={isMobile ? <ReportsMobile/> : <Reports />} />
                {/* Redirect về sessions nếu cố truy cập route khác */}
                <Route path="*" element={<Navigate to="/sessions" replace />} />
              </>
            )}

            {/* Fallback route */}
            <Route path="*" element={<Navigate to={currentUser.role === 'admin' ? "/" : "/sessions"} replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  // ===== PWA UPDATE LOGIC =====
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration);

          // Lắng nghe sự kiện có phiên bản mới của Service Worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Có một phiên bản mới đang chờ
                  console.log("New version found. Waiting for user to reload.");
                  setWaitingWorker(newWorker);
                  setShowReload(true);
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log("SW registration failed:", registrationError);
        });

      // Lắng nghe sự kiện khi Service Worker mới đã được kích hoạt
      const handleControllerChange = () => {
        console.log("Controller changed, reloading page.");
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Dọn dẹp event listener khi component unmount
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const reloadPage = () => {
    if (waitingWorker) {
      // Gửi message cho Service Worker mới để nó skipWaiting()
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowReload(false);
  };
  // ===== END PWA UPDATE LOGIC =====

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LocalizationProvider>

      {/* Snackbar thông báo cập nhật */}
      <Snackbar
        open={showReload}
        message="Đã có phiên bản mới! Vui lòng tải lại để trải nghiệm tốt nhất."
        action={
          <Button color="inherit" size="small" onClick={reloadPage}>
            TẢI LẠI
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </QueryClientProvider>
  );
};

export default App;