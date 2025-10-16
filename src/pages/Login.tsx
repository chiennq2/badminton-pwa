import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Upload, Delete } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const Login: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleQrCodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setQrCode(imageData);
        signupFormik.setFieldValue('qrCode', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const loginValidationSchema = Yup.object({
    email: Yup.string()
      .email('Email không hợp lệ')
      .required('Email là bắt buộc'),
    password: Yup.string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .required('Mật khẩu là bắt buộc'),
  });

  const signupValidationSchema = Yup.object({
    displayName: Yup.string()
      .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
      .required('Tên hiển thị là bắt buộc'),
    email: Yup.string()
      .email('Email không hợp lệ')
      .required('Email là bắt buộc'),
    password: Yup.string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .required('Mật khẩu là bắt buộc'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Mật khẩu xác nhận không khớp')
      .required('Xác nhận mật khẩu là bắt buộc'),
  });

  const loginFormik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginValidationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      try {
        await signIn(values.email, values.password);
      } catch (err: any) {
        // setError(getErrorMessage(err.code));
        setError(err.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
  });

  const signupFormik = useFormik({
    initialValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      isActive: false,
      qrCode: '',
    },
    validationSchema: signupValidationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      try {
        await signUp(values.email, values.password, values.displayName, values.qrCode);
      } catch (err: any) {
        setError(getErrorMessage(err.code));
        setError(err);
      } finally {
        setLoading(false);
      }
    },
  });

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Tài khoản không tồn tại';
      case 'auth/wrong-password':
        return 'Mật khẩu không đúng';
      case 'auth/email-already-in-use':
        return 'Email đã được sử dụng';
      case 'auth/weak-password':
        return 'Mật khẩu quá yếu';
      case 'auth/invalid-email':
        return 'Email không hợp lệ';
      case 'auth/too-many-requests':
        return 'Quá nhiều lần thử. Vui lòng thử lại sau';
      case 'auth/user-not-active':
        return 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.';
      default:
        return 'Đã xảy ra lỗi. Vui lòng thử lại';
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    loginFormik.resetForm();
    signupFormik.resetForm();
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 3,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            width: '100%',
            maxWidth: 480,
            p: 4,
            borderRadius: 3,
            background: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              🏸🍻 Quản Lý Lịch Đánh Cầu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Badminton Session Management
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} centered>
              <Tab label="Đăng Nhập" />
              <Tab label="Đăng Ký" />
            </Tabs>
          </Box>

          {/* Login Form */}
          <TabPanel value={tabValue} index={0}>
            <form onSubmit={loginFormik.handleSubmit}>
              <TextField
                fullWidth
                id="login-email"
                name="email"
                label="Email"
                type="email"
                value={loginFormik.values.email}
                onChange={loginFormik.handleChange}
                onBlur={loginFormik.handleBlur}
                error={loginFormik.touched.email && Boolean(loginFormik.errors.email)}
                helperText={loginFormik.touched.email && loginFormik.errors.email}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                id="login-password"
                name="password"
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={loginFormik.values.password}
                onChange={loginFormik.handleChange}
                onBlur={loginFormik.handleBlur}
                error={loginFormik.touched.password && Boolean(loginFormik.errors.password)}
                helperText={loginFormik.touched.password && loginFormik.errors.password}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  height: 48,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng Nhập'}
              </Button>
            </form>
          </TabPanel>

          {/* Signup Form */}
          <TabPanel value={tabValue} index={1}>
            <form onSubmit={signupFormik.handleSubmit}>
              <TextField
                fullWidth
                id="signup-displayName"
                name="displayName"
                label="Tên hiển thị"
                value={signupFormik.values.displayName}
                onChange={signupFormik.handleChange}
                onBlur={signupFormik.handleBlur}
                error={signupFormik.touched.displayName && Boolean(signupFormik.errors.displayName)}
                helperText={signupFormik.touched.displayName && signupFormik.errors.displayName}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                id="signup-email"
                name="email"
                label="Email"
                type="email"
                value={signupFormik.values.email}
                onChange={signupFormik.handleChange}
                onBlur={signupFormik.handleBlur}
                error={signupFormik.touched.email && Boolean(signupFormik.errors.email)}
                helperText={signupFormik.touched.email && signupFormik.errors.email}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                id="signup-password"
                name="password"
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={signupFormik.values.password}
                onChange={signupFormik.handleChange}
                onBlur={signupFormik.handleBlur}
                error={signupFormik.touched.password && Boolean(signupFormik.errors.password)}
                helperText={signupFormik.touched.password && signupFormik.errors.password}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                id="signup-confirmPassword"
                name="confirmPassword"
                label="Xác nhận mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={signupFormik.values.confirmPassword}
                onChange={signupFormik.handleChange}
                onBlur={signupFormik.handleBlur}
                error={signupFormik.touched.confirmPassword && Boolean(signupFormik.errors.confirmPassword)}
                helperText={signupFormik.touched.confirmPassword && signupFormik.errors.confirmPassword}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Upload QR Code */}
              <Box sx={{ mt: 3, mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Upload sx={{ mr: 1 }} />
                  QR Code Thanh Toán (tùy chọn)
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="signup-qr-upload"
                    type="file"
                    onChange={handleQrCodeUpload}
                  />
                  <label htmlFor="signup-qr-upload">
                    <Button variant="outlined" component="span" startIcon={<Upload />}>
                      Tải ảnh QR
                    </Button>
                  </label>
                  {qrCode && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => {
                        setQrCode(null);
                        signupFormik.setFieldValue('qrCode', '');
                      }}
                    >
                      Xóa
                    </Button>
                  )}
                </Box>

                {qrCode && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <img
                    src={qrCode}
                    alt="QR Code"
                    style={{
                      maxWidth: 200,
                      maxHeight: 200,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                    }}
                  />
                </Box>
              )}
              </Box>


              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  height: 48,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng Ký'}
              </Button>
            </form>
          </TabPanel>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              © 2025 Hệ thống Quản Lý Lịch Đánh Cầu
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;