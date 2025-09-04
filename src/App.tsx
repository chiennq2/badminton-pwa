import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import getTheme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courts from './pages/Courts';
import Members from './pages/Members';
import Groups from './pages/Groups';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';
import { getLocalStorageItem, setLocalStorageItem } from './utils';

// Set dayjs locale to Vietnamese
dayjs.locale('vi');

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return getLocalStorageItem('darkMode', false);
  });

  const theme = getTheme(darkMode ? 'dark' : 'light');

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setLocalStorageItem('darkMode', newDarkMode);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Đang tải...</div>
        </div>
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
            {currentUser.role === 'admin' && (
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
};

export default App;