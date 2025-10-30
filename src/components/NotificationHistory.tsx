import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Badge,
  Drawer,
  Chip,
  Button,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Close,
  Delete,
  CheckCircle,
  Circle,
  Visibility,
  AccessTime,
} from '@mui/icons-material';
import { notificationHistoryService } from '../services/notificationHistoryService';
import { NotificationHistory as NotificationHistoryType } from '../types/notification';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const NotificationHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistoryType | null>(null);

  useEffect(() => {
    loadNotifications();

    // Listen for new notifications from service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        loadNotifications();
      }
    });
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const history = await notificationHistoryService.getNotificationHistory(50);
      setNotifications(history);
      
      // Count unread notifications
      const unread = history.filter(
        n => !n.readBy?.includes(currentUser?.id || '')
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (notification: NotificationHistoryType) => {
    setSelectedNotification(notification);
    setDetailDialogOpen(true);

    // Mark as read if not already read
    if (!notification.readBy?.includes(currentUser?.id || '')) {
      try {
        await notificationHistoryService.markAsRead(notification.id, currentUser?.id || '');
        await loadNotifications(); // Reload to update UI
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationHistoryService.markAllAsRead(currentUser?.id || '');
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening detail dialog
    
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
      return;
    }

    try {
      await notificationHistoryService.deleteNotificationHistory(id);
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
      return;
    }

    try {
      const notificationIds = notifications.map(n => n.id);
      await notificationHistoryService.deleteMultipleNotifications(notificationIds);
      await loadNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'N/A';
    
    const now = dayjs();
    const notificationDate = dayjs(date);
    const diffMinutes = now.diff(notificationDate, 'minute');
    const diffHours = now.diff(notificationDate, 'hour');
    const diffDays = now.diff(notificationDate, 'day');

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return notificationDate.format('DD/MM/YYYY');
  };

  const isUnread = (notification: NotificationHistoryType) => {
    return !notification.readBy?.includes(currentUser?.id || '');
  };

  return (
    <>
      {/* Icon để mở drawer */}
      <IconButton color="inherit" onClick={() => setOpen(true)}>
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      {/* Drawer chứa lịch sử thông báo */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsActive color="primary" />
              <Typography variant="h6">Thông báo</Typography>
              {unreadCount > 0 && (
                <Chip label={unreadCount} size="small" color="error" />
              )}
            </Box>
            <IconButton onClick={() => setOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          <Divider />

          {/* Actions */}
          {notifications.length > 0 && (
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                fullWidth
              >
                Đánh dấu đã đọc
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={handleClearAll}
                fullWidth
              >
                Xóa tất cả
              </Button>
            </Box>
          )}

          {/* List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Notifications sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Chưa có thông báo nào
                </Typography>
              </Box>
            ) : (
              <List>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      button
                      onClick={() => handleViewDetail(notification)}
                      sx={{
                        bgcolor: isUnread(notification) ? 'action.hover' : 'transparent',
                        '&:hover': { bgcolor: 'action.selected' },
                        cursor: 'pointer',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: isUnread(notification) ? 'primary.main' : 'grey.400',
                          }}
                        >
                          {isUnread(notification) ? <Circle /> : <CheckCircle />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              fontWeight={isUnread(notification) ? 'bold' : 'normal'}
                              sx={{ flex: 1 }}
                              noWrap
                            >
                              {notification.title}
                            </Typography>
                            {isUnread(notification) && (
                              <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {notification.body}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <AccessTime sx={{ fontSize: 14, mr: 0.5 }} />
                              {formatTime(notification.sentAt)}
                            </Typography>
                          </>
                        }
                      />
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        sx={{ ml: 1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {/* Info */}
          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              Thông báo được lưu trong 30 ngày. Thiết bị offline sẽ nhận thông báo khi online lại.
            </Alert>
          </Box>
        </Box>
      </Drawer>

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
                      {selectedNotification.totalDevices > 0
                        ? ((selectedNotification.successCount / selectedNotification.totalDevices) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái:
                    </Typography>
                    <Chip
                      label={isUnread(selectedNotification) ? 'Chưa đọc' : 'Đã đọc'}
                      color={isUnread(selectedNotification) ? 'primary' : 'success'}
                      size="small"
                    />
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
    </>
  );
};

export default NotificationHistory;