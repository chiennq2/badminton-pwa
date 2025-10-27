import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Avatar,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Person,
  PhotoCamera,
  QrCode2,
  Save,
  Cancel,
  Edit,
  ContentCopy,
  RemoveRedEye,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const validationSchema = Yup.object({
    displayName: Yup.string()
      .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
      .required('Tên hiển thị là bắt buộc'),
    photoURL: Yup.string().url('URL không hợp lệ').nullable(),
    qrCode: Yup.string().nullable(),
  });

  const formik = useFormik({
    initialValues: {
      displayName: currentUser?.displayName || '',
      photoURL: currentUser?.photoURL || '',
      qrCode: currentUser?.qrCode || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, {
          displayName: values.displayName,
          photoURL: values.photoURL || null,
          qrCode: values.qrCode || null,
          updatedAt: new Date(),
        });

        showSnackbar('Cập nhật thông tin thành công!', 'success');
      } catch (error: any) {
        console.error('Error updating profile:', error);
        showSnackbar(`Có lỗi xảy ra: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    },
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCopyQR = () => {
    if (formik.values.qrCode) {
      navigator.clipboard.writeText(formik.values.qrCode);
      showSnackbar('Đã sao chép mã QR!', 'success');
    }
  };

  const handleReset = () => {
    formik.resetForm();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Thông tin cá nhân
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cập nhật thông tin tài khoản của bạn
        </Typography>
      </Box>

      {/* Profile Card */}
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <form onSubmit={formik.handleSubmit}>
            {/* Avatar Section */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 4,
                pt: 2,
              }}
            >
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar
                  src={formik.values.photoURL}
                  sx={{
                    width: { xs: 100, sm: 120 },
                    height: { xs: 100, sm: 120 },
                    bgcolor: 'primary.main',
                    fontSize: { xs: 40, sm: 48 },
                  }}
                >
                  {formik.values.displayName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                  size="small"
                  onClick={() => document.getElementById('avatar-url')?.focus()}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="h6" fontWeight="medium" gutterBottom>
                {currentUser?.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.email}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Form Fields */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Display Name */}
              <TextField
                fullWidth
                name="displayName"
                label="Tên hiển thị"
                value={formik.values.displayName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.displayName && Boolean(formik.errors.displayName)}
                helperText={formik.touched.displayName && formik.errors.displayName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Avatar URL */}
              <TextField
                fullWidth
                id="avatar-url"
                name="photoURL"
                label="URL Avatar"
                value={formik.values.photoURL}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.photoURL && Boolean(formik.errors.photoURL)}
                helperText={
                  formik.touched.photoURL && formik.errors.photoURL
                    ? formik.errors.photoURL
                    : 'Dán URL hình ảnh của bạn'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhotoCamera color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* QR Code */}
              <TextField
                fullWidth
                name="qrCode"
                label="Mã QR thanh toán"
                value={formik.values.qrCode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.qrCode && Boolean(formik.errors.qrCode)}
                helperText="Mã QR hoặc số tài khoản ngân hàng"
                multiline
                rows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                      <QrCode2 color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: formik.values.qrCode && (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                      <IconButton size="small" onClick={handleCopyQR}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setQrDialogOpen(true)}>
                        <RemoveRedEye fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Email (Read-only) */}
              <TextField
                fullWidth
                label="Email"
                value={currentUser?.email}
                disabled
                helperText="Email không thể thay đổi"
              />
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mt: 4,
              }}
            >
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !formik.dirty}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{ order: { xs: 2, sm: 1 } }}
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>

              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={handleReset}
                disabled={loading || !formik.dirty}
                startIcon={<Cancel />}
                sx={{ order: { xs: 1, sm: 2 } }}
              >
                Hủy
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* QR Code Preview Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Xem trước mã QR</DialogTitle>
        <DialogContent>
          {formik.values.qrCode ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
              }}
            >
              {/* Kiểm tra nếu là URL hình ảnh */}
              {formik.values.qrCode.startsWith('http') ? (
                <Box
                  component="img"
                  src={formik.values.qrCode}
                  alt="QR Code"
                  sx={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: 2,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    p: 3,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    width: '100%',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formik.values.qrCode}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">Chưa có mã QR</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;