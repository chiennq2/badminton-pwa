import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Divider,
  useMediaQuery,
  useTheme,
  Snackbar,
} from '@mui/material';
import {
  NotificationsActive,
  Schedule,
  History,
  Send,
  Delete,
  Cancel,
  Repeat,
  AccessTime,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
  Close,
} from '@mui/icons-material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { backEndNotificationService } from '../services/backendNotificationService';
import { scheduledNotificationService } from '../services/scheduledNotificationService';
import { notificationHistoryService } from '../services/notificationHistoryService';
import { ScheduledNotification, NotificationHistory } from '../types/notification';
import NotificationDashboard from '../components/NotificationDashboard';
import NotificationStatusBanner from '../components/NotificationStatusBanner';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const NotificationManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Send notification states
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);

  // Schedule notification states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Dayjs | null>(dayjs().add(1, 'hour'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(1);
  const [recurringTime, setRecurringTime] = useState('09:00');

  // Data states
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'scheduled' | 'history'>('scheduled');
  const [deleteId, setDeleteId] = useState<string>('');

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadScheduledNotifications(), loadNotificationHistory()]);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Lỗi khi tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledNotifications = async () => {
    try {
      const notifications = await scheduledNotificationService.getScheduledNotifications();
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      const history = await notificationHistoryService.getNotificationHistory();
      setNotificationHistory(history);
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Send notification immediately
  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) {
      showSnackbar('Vui lòng nhập nội dung thông báo!', 'error');
      return;
    }

    setSendingNotify(true);
    try {
      const result = await backEndNotificationService.sendNotificationToAll(
        notifyTitle || 'Thông báo từ quản trị viên',
        notifyMessage
      );

      if (result.success) {
        showSnackbar(`Thông báo đã được gửi đến ${result.successCount}/${result.totalDevices} thiết bị!`, 'success');
        setSendDialogOpen(false);
        setNotifyMessage('');
        setNotifyTitle('');
        await loadNotificationHistory();
      } else {
        showSnackbar('Gửi thông báo thất bại!', 'error');
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      showSnackbar(error.message || 'Gửi thông báo thất bại!', 'error');
    } finally {
      setSendingNotify(false);
    }
  };

  // Schedule notification
  const handleScheduleNotification = async () => {
    if (!notifyMessage.trim()) {
      showSnackbar('Vui lòng nhập nội dung thông báo!', 'error');
      return;
    }

    if (!scheduledTime) {
      showSnackbar('Vui lòng chọn thời gian gửi!', 'error');
      return;
    }

    if (scheduledTime.isBefore(dayjs())) {
      showSnackbar('Thời gian gửi phải sau thời điểm hiện tại!', 'error');
      return;
    }

    setSendingNotify(true);
    try {
      const notification: Omit<ScheduledNotification, 'id' | 'status' | 'createdAt'> = {
        title: notifyTitle || 'Thông báo từ quản trị viên',
        body: notifyMessage,
        scheduledTime: scheduledTime.toDate(),
        targetType: 'all',
        createdBy: currentUser?.id || '',
      };

      if (isRecurring) {
        notification.recurring = {
          enabled: true,
          frequency: recurringFrequency,
          time: recurringTime,
          ...(recurringFrequency === 'weekly' && { daysOfWeek: selectedDaysOfWeek }),
          ...(recurringFrequency === 'monthly' && { dayOfMonth: selectedDayOfMonth }),
        };
      }

      await scheduledNotificationService.createScheduledNotification(notification);
      showSnackbar('Đã lên lịch thông báo thành công!', 'success');

      setScheduleDialogOpen(false);
      setNotifyMessage('');
      setNotifyTitle('');
      setIsRecurring(false);
      setSelectedDaysOfWeek([]);
      await loadScheduledNotifications();
    } catch (error: any) {
      console.error('Error scheduling notification:', error);
      showSnackbar(error.message || 'Lên lịch thông báo thất bại!', 'error');
    } finally {
      setSendingNotify(false);
    }
  };

  // Cancel scheduled notification
  const handleCancelScheduled = async (id: string) => {
    try {
      await scheduledNotificationService.cancelScheduledNotification(id);
      showSnackbar('Đã hủy thông báo!', 'success');
      await loadScheduledNotifications();
    } catch (error) {
      console.error('Error cancelling notification:', error);
      showSnackbar('Hủy thông báo thất bại!', 'error');
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (id: string, type: 'scheduled' | 'history') => {
    setDeleteId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      if (deleteType === 'scheduled') {
        await scheduledNotificationService.deleteScheduledNotification(deleteId);
        showSnackbar('Đã xóa thông báo đã lên lịch!', 'success');
        await loadScheduledNotifications();
      } else {
        await notificationHistoryService.deleteNotificationHistory(deleteId);
        showSnackbar('Đã xóa lịch sử thông báo!', 'success');
        await loadNotificationHistory();
      }
      setDeleteDialogOpen(false);
      setDeleteId('');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showSnackbar('Xóa thông báo thất bại!', 'error');
    }
  };

  // View notification detail
  const handleViewDetail = async (notification: NotificationHistory) => {
    setSelectedNotification(notification);
    setDetailDialogOpen(true);

    // Mark as read
    if (!notification.readBy?.includes(currentUser?.id || '')) {
      try {
        await notificationHistoryService.markAsRead(notification.id, currentUser?.id || '');
        await loadNotificationHistory();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'sent':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Đang chờ';
      case 'sent':
        return 'Đã gửi';
      case 'failed':
        return 'Thất bại';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  return (
    <Box>
      {/* Status Banner */}
      {currentUser && (
        <NotificationStatusBanner userId={currentUser.id} />
      )}
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Quản lý thông báo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gửi, lên lịch và quản lý thông báo đến người dùng
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Send />}
          onClick={() => setSendDialogOpen(true)}
          fullWidth={isMobile}
        >
          Gửi ngay
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Schedule />}
          onClick={() => setScheduleDialogOpen(true)}
          fullWidth={isMobile}
        >
          Lên lịch
        </Button>
      </Box>

      {/* Dashboard */}
      <NotificationDashboard />

      {/* Tabs */}
      <Card sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab icon={<Schedule />} label="Đã lên lịch" />
          <Tab icon={<History />} label="Lịch sử" />
        </Tabs>

        {/* Scheduled Notifications */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : scheduledNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Schedule sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Chưa có thông báo nào được lên lịch
              </Typography>
            </Box>
          ) : (
            <List>
              {scheduledNotifications.map((notification) => (
                <Card key={notification.id} sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(notification.status) + '.main' }}>
                        {notification.recurring?.enabled ? <Repeat /> : <Schedule />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight="medium">
                            {notification.title}
                          </Typography>
                          <Chip
                            label={getStatusText(notification.status)}
                            color={getStatusColor(notification.status) as any}
                            size="small"
                          />
                          {notification.recurring?.enabled && (
                            <Chip
                              icon={<Repeat />}
                              label={`Lặp ${
                                notification.recurring.frequency === 'daily'
                                  ? 'hàng ngày'
                                  : notification.recurring.frequency === 'weekly'
                                  ? 'hàng tuần'
                                  : 'hàng tháng'
                              }`}
                              size="small"
                              color="info"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {notification.body}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                            <AccessTime fontSize="small" />
                            <Typography variant="caption">
                              {dayjs(notification.scheduledTime).format('DD/MM/YYYY HH:mm')} (
                              {dayjs(notification.scheduledTime).fromNow()})
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                      {notification.status === 'pending' && (
                        <IconButton
                          color="warning"
                          onClick={() => handleCancelScheduled(notification.id)}
                          size="small"
                          title="Hủy thông báo"
                        >
                          <Cancel />
                        </IconButton>
                      )}
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(notification.id, 'scheduled')}
                        size="small"
                        title="Xóa thông báo"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItem>
                </Card>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Notification History */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : notificationHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Chưa có lịch sử thông báo
              </Typography>
            </Box>
          ) : (
            <List>
              {notificationHistory.map((notification) => (
                <Card key={notification.id} sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            notification.failureCount > 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {notification.failureCount > 0 ? <ErrorIcon /> : <CheckCircle />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight="medium">
                            {notification.title}
                          </Typography>
                          {!notification.readBy?.includes(currentUser?.id || '') && (
                            <Chip label="Chưa đọc" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {notification.body}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 2 }}>
                            <Typography variant="caption">
                              {notification.sentAt
                                ? dayjs(notification.sentAt).format('DD/MM/YYYY HH:mm')
                                : 'N/A'}
                            </Typography>
                            <Chip
                              label={`${notification.successCount}/${notification.totalDevices} thành công`}
                              size="small"
                              color={
                                notification.successCount === notification.totalDevices
                                  ? 'success'
                                  : 'warning'
                              }
                            />
                          </Box>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                      <IconButton
                        color="primary"
                        onClick={() => handleViewDetail(notification)}
                        size="small"
                        title="Xem chi tiết"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(notification.id, 'history')}
                        size="small"
                        title="Xóa lịch sử"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItem>
                </Card>
              ))}
            </List>
          )}
        </TabPanel>
      </Card>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Send sx={{ mr: 1, color: 'primary.main' }} />
            Gửi thông báo ngay
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tiêu đề (tùy chọn)"
              fullWidth
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
            />
            <TextField
              label="Nội dung thông báo"
              fullWidth
              required
              multiline
              minRows={3}
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
            />
            <Alert severity="info">
              Thông báo sẽ được gửi ngay lập tức đến tất cả thiết bị đã đăng ký.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSendDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleSendNotification}
            variant="contained"
            disabled={sendingNotify}
            startIcon={sendingNotify ? <CircularProgress size={20} /> : <Send />}
          >
            {sendingNotify ? 'Đang gửi...' : 'Gửi ngay'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ mr: 1, color: 'secondary.main' }} />
            Lên lịch gửi thông báo
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tiêu đề (tùy chọn)"
              fullWidth
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
            />

            <TextField
              label="Nội dung thông báo"
              fullWidth
              required
              multiline
              minRows={3}
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Thời gian gửi"
                value={scheduledTime}
                onChange={(newValue) => setScheduledTime(newValue)}
                minDateTime={dayjs()}
                format="DD/MM/YYYY HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </LocalizationProvider>

            <FormControlLabel
              control={
                <Switch checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Repeat sx={{ mr: 1 }} />
                  Lặp lại định kỳ
                </Box>
              }
            />

            {isRecurring && (
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cài đặt lặp lại
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Tần suất</InputLabel>
                  <Select
                    value={recurringFrequency}
                    label="Tần suất"
                    onChange={(e) => setRecurringFrequency(e.target.value as any)}
                  >
                    <MenuItem value="daily">Hàng ngày</MenuItem>
                    <MenuItem value="weekly">Hàng tuần</MenuItem>
                    <MenuItem value="monthly">Hàng tháng</MenuItem>
                  </Select>
                </FormControl>

                {recurringFrequency === 'weekly' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Chọn các ngày trong tuần:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                        <Chip
                          key={index}
                          label={day}
                          onClick={() => toggleDayOfWeek(index)}
                          color={selectedDaysOfWeek.includes(index) ? 'primary' : 'default'}
                          variant={selectedDaysOfWeek.includes(index) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {recurringFrequency === 'monthly' && (
                  <TextField
                    label="Ngày trong tháng"
                    type="number"
                    fullWidth
                    value={selectedDayOfMonth}
                    onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                    inputProps={{ min: 1, max: 31 }}
                    sx={{ mb: 2 }}
                  />
                )}

                <TextField
                  label="Giờ gửi"
                  type="time"
                  fullWidth
                  value={recurringTime}
                  onChange={(e) => setRecurringTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Paper>
            )}

            <Alert severity="info">
              Thông báo sẽ được gửi tự động vào thời gian đã chọn.
              {isRecurring && ' Thông báo sẽ lặp lại theo lịch đã cài đặt.'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setScheduleDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleScheduleNotification}
            variant="contained"
            color="secondary"
            disabled={sendingNotify}
            startIcon={sendingNotify ? <CircularProgress size={20} /> : <Schedule />}
          >
            {sendingNotify ? 'Đang lên lịch...' : 'Lên lịch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1, color: 'error.main' }} />
            Xác nhận xóa
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            <Typography variant="body2">
              Bạn có chắc chắn muốn xóa {deleteType === 'scheduled' ? 'thông báo đã lên lịch' : 'lịch sử thông báo'} này?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác!
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Visibility sx={{ mr: 1, color: 'primary.main' }} />
              Chi tiết thông báo
            </Box>
            <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box sx={{ pt: 2 }}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedNotification.title}
                </Typography>
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedNotification.body}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Thời gian gửi:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedNotification.sentAt
                        ? dayjs(selectedNotification.sentAt).format('DD/MM/YYYY HH:mm:ss')
                        : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Tổng thiết bị:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedNotification.totalDevices}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Gửi thành công:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {selectedNotification.successCount}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Gửi thất bại:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="error.main">
                      {selectedNotification.failureCount}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Tỷ lệ thành công:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {((selectedNotification.successCount / selectedNotification.totalDevices) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
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

export default NotificationManagement;