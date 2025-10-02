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

// ===== CONFIG DAYJS =====
dayjs.extend(updateLocale);
dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(localeData);

dayjs.locale("vi");

dayjs.updateLocale("vi", {
  weekStart: 1, // Monday
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/courts" element={<Courts />} />
            <Route path="/members" element={<Members />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/reports" element={<Reports />} />
            {currentUser.role === "admin" && (
              <>
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed:", registrationError);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="vi"
        localeText={{
          cancelButtonLabel: "Hủy",
          clearButtonLabel: "Xóa",
          okButtonLabel: "OK",
          todayButtonLabel: "Hôm nay",
          calendarWeekNumberHeaderLabel: "Tuần",
          calendarWeekNumberHeaderText: "#",
          calendarWeekNumberAriaLabelText: (weekNumber: number) =>
            `Tuần ${weekNumber}`,
          calendarWeekNumberText: (weekNumber: number) => `${weekNumber}`,
          datePickerToolbarTitle: "Chọn ngày",
          dateTimePickerToolbarTitle: "Chọn ngày và giờ",
          timePickerToolbarTitle: "Chọn giờ",
          openPreviousView: "Mở khung trước",
          openNextView: "Mở khung tiếp",
          previousMonth: "Tháng trước",
          nextMonth: "Tháng sau",
          clockLabelText: (view, time, adapter) =>
            `Chọn ${view}. ${
              time === null
                ? "Chưa chọn giờ"
                : `Giờ đã chọn: ${adapter.format(time, "fullTime")}`
            }`,
          hoursClockNumberText: (hours: string) => `${hours} giờ`,
          minutesClockNumberText: (minutes: string) => `${minutes} phút`,
          secondsClockNumberText: (seconds: string) => `${seconds} giây`,
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;
