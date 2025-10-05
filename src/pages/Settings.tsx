import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from '@mui/material';
import { Save, Settings as SettingsIcon, RestartAlt } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SessionsMigrationPanel from '../components/SessionsMigrationPanel';
import { getOrCreateSettings, resetSettings, updateSettings } from '../hooks';


const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const validationSchema = Yup.object({
    defaultSessionDuration: Yup.number()
      .min(30, 'Thời lượng tối thiểu 30 phút')
      .max(480, 'Thời lượng tối đa 8 giờ')
      .required('Thời lượng mặc định là bắt buộc'),
    defaultMaxParticipants: Yup.number()
      .min(2, 'Tối thiểu 2 người')
      .max(60, 'Tối đa 60 người')
      .required('Số người tối đa là bắt buộc'),
    defaultShuttlecockCost: Yup.number()
      .min(0, 'Giá phải >= 0')
      .required('Giá cầu mặc định là bắt buộc'),
    currency: Yup.string().required('Đơn vị tiền tệ là bắt buộc'),
    timezone: Yup.string().required('Múi giờ là bắt buộc'),
  });

  const formik = useFormik({
    initialValues: {
      defaultSessionDuration: 120,
      defaultMaxParticipants: 16,
      defaultShuttlecockCost: 25000,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await updateSettings(values);
        showSnackbar('Lưu cài đặt thành công!', 'success');
      } catch (error) {
        console.error('Save settings error:', error);
        showSnackbar('Có lỗi xảy ra khi lưu cài đặt!', 'error');
      } finally {
        setLoading(false);
      }
    },
  });

  // Load settings khi component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setInitialLoading(true);
    try {
      const settings = await getOrCreateSettings();
      formik.setValues({
        defaultSessionDuration: settings.defaultSessionDuration,
        defaultMaxParticipants: settings.defaultMaxParticipants,
        defaultShuttlecockCost: settings.defaultShuttlecockCost,
        currency: settings.currency,
        timezone: settings.timezone,
      });
    } catch (error) {
      console.error('Load settings error:', error);
      showSnackbar('Không thể tải cài đặt từ máy chủ', 'error');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục cài đặt mặc định?')) {
      return;
    }

    setLoading(true);
    try {
      await resetSettings();
      await loadSettings();
      showSnackbar('Đã khôi phục cài đặt mặc định!', 'success');
    } catch (error) {
      console.error('Reset settings error:', error);
      showSnackbar('Có lỗi xảy ra khi reset cài đặt!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  if (initialLoading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={500} height={24} />
        </Box>
        <Card>
          <CardContent>
            <Skeleton variant="rectangular" height={400} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Cài đặt hệ thống
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cấu hình các thông số mặc định cho hệ thống Quản Lý Lịch Đánh Cầu
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SessionsMigrationPanel />
      </Box>

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Session Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Cài đặt hệ thống
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultSessionDuration"
                      label="Thời lượng mặc định (phút)"
                      type="number"
                      value={formik.values.defaultSessionDuration}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.defaultSessionDuration && Boolean(formik.errors.defaultSessionDuration)}
                      helperText={formik.touched.defaultSessionDuration && formik.errors.defaultSessionDuration}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultMaxParticipants"
                      label="Số người tối đa mặc định"
                      type="number"
                      value={formik.values.defaultMaxParticipants}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.defaultMaxParticipants && Boolean(formik.errors.defaultMaxParticipants)}
                      helperText={formik.touched.defaultMaxParticipants && formik.errors.defaultMaxParticipants}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultShuttlecockCost"
                      label="Giá cầu mặc định (VNĐ)"
                      type="number"
                      value={formik.values.defaultShuttlecockCost}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.defaultShuttlecockCost && Boolean(formik.errors.defaultShuttlecockCost)}
                      helperText={formik.touched.defaultShuttlecockCost && formik.errors.defaultShuttlecockCost}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Đơn vị tiền tệ</InputLabel>
                      <Select
                        name="currency"
                        value={formik.values.currency}
                        onChange={formik.handleChange}
                        label="Đơn vị tiền tệ"
                      >
                        <MenuItem value="VND">Việt Nam Đồng (VNĐ)</MenuItem>
                        <MenuItem value="USD">US Dollar (USD)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Múi giờ</InputLabel>
                      <Select
                        name="timezone"
                        value={formik.values.timezone}
                        onChange={formik.handleChange}
                        label="Múi giờ"
                      >
                        <MenuItem value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</MenuItem>
                        <MenuItem value="Asia/Bangkok">Thailand (GMT+7)</MenuItem>
                        <MenuItem value="Asia/Singapore">Singapore (GMT+8)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Thông tin hệ thống
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phiên bản ứng dụng
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      v1.0.0
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Cập nhật cuối
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {new Date().toLocaleDateString('vi-VN')}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Chế độ offline
                    </Typography>
                    <Typography variant="body1" fontWeight="500" color="success.main">
                      Đã bật
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PWA Support
                    </Typography>
                    <Typography variant="body1" fontWeight="500" color="success.main">
                      Có hỗ trợ
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAlt />}
                onClick={handleReset}
                disabled={loading}
                size="large"
              >
                Khôi phục mặc định
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                size="large"
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'Lưu cài đặt'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;