import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  SportsTennis,
  People,
  Groups,
  CalendarMonth,
  AdminPanelSettings,
  Assessment,
  Logout,
  Settings,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

const drawerWidth = 280;

// Menu cho admin - full quyền
const adminMenuItems = [
  { text: 'Tổng quan', icon: <Dashboard />, path: '/' },
  { text: 'Sân cầu lông', icon: <SportsTennis />, path: '/courts' },
  { text: 'Thành viên', icon: <People />, path: '/members' },
  { text: 'Nhóm', icon: <Groups />, path: '/groups' },
  { text: 'Lịch đánh', icon: <CalendarMonth />, path: '/sessions' },
  { text: 'Báo cáo', icon: <Assessment />, path: '/reports' },
];

const adminSettingsItems = [
  { text: 'Quản trị viên', icon: <AdminPanelSettings />, path: '/admin/users' },
  { text: 'Cài đặt', icon: <Settings />, path: '/settings' },
];

// Menu cho user - chỉ có lịch đánh
const userMenuItems = [
  { text: 'Lịch đánh của tôi', icon: <CalendarMonth />, path: '/sessions' },
  { text: 'Báo cáo của tôi', icon: <Assessment />, path: '/reports' },
];

const Layout: React.FC<LayoutProps> = ({ children, darkMode, onDarkModeToggle }) => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Lấy menu items dựa trên role
  const menuItems = currentUser?.role === 'admin' ? adminMenuItems : userMenuItems;
  const settingsItems = currentUser?.role === 'admin' ? adminSettingsItems : [];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Toolbar sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
            }}
          >
            <SportsTennis />
          </Avatar>
          <Box>
            <Typography variant="h6" component="div" fontWeight="bold">
              Quản Lý Cầu Lông
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      {/* Main Menu Items */}
      <List sx={{ flexGrow: 1, px: 2, py: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'inherit' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Settings Menu (chỉ cho admin) */}
      {settingsItems.length > 0 && (
        <>
          <Divider />
          <List sx={{ px: 2, py: 1 }}>
            {settingsItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setMobileOpen(false);
                    }}
                    selected={isActive}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? 'inherit' : 'text.secondary',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      <Divider />

      {/* Dark Mode Toggle */}
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={onDarkModeToggle}
              icon={<LightMode />}
              checkedIcon={<DarkMode />}
            />
          }
          label={darkMode ? 'Chế độ tối' : 'Chế độ sáng'}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle(location.pathname, currentUser?.role)}
          </Typography>

          {/* User Profile */}
          <IconButton
            size="large"
            edge="end"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar
              src={currentUser?.photoURL}
              alt={currentUser?.displayName}
              sx={{ width: 32, height: 32 }}
            >
              {currentUser?.displayName?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {currentUser?.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser?.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Đăng xuất
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #1e1e1e 0%, #121212 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

const getPageTitle = (pathname: string, role?: string): string => {
  if (role === 'user') {
    return 'Lịch đánh của tôi';
  }
  
  switch (pathname) {
    case '/':
      return 'Tổng quan';
    case '/courts':
      return 'Quản lý sân';
    case '/members':
      return 'Quản lý thành viên';
    case '/groups':
      return 'Quản lý nhóm';
    case '/sessions':
      return 'Lịch đánh cầu lông';
    case '/reports':
      return 'Báo cáo thống kê';
    case '/admin/users':
      return 'Quản lý người dùng';
    case '/settings':
      return 'Cài đặt hệ thống';
    default:
      if (pathname.includes('/sessions/')) {
        return 'Chi tiết lịch đánh';
      }
      return 'Quản Lý Lịch Đánh Cầu';
  }
};

export default Layout;