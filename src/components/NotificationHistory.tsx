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
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Close,
  Delete,
  CheckCircle,
  Circle,
} from '@mui/icons-material';

interface StoredNotification {
  id: number;
  notificationId: string;
  title: string;
  body: string;
  image?: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  data?: any;
}

const NotificationHistory: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications từ IndexedDB
  useEffect(() => {
    loadNotifications();

    // Listen for new notifications
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        loadNotifications();
      }
    });
  }, []);

  const loadNotifications = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.getAll();

      request.onsuccess = () => {
        const allNotifications = request.result as StoredNotification[];
        // Sort by timestamp desc
        allNotifications.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setNotifications(allNotifications);
        setUnreadCount(allNotifications.filter(n => !n.read).length);
      };
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotificationsDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const index = store.index('notificationId');
      const request = index.openCursor(IDBKeyRange.only(notificationId));

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const notification = cursor.value;
          notification.read = true;
          notification.readAt = new Date().toISOString();
          cursor.update(notification);
          loadNotifications();
        }
      };
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      store.delete(id);
      transaction.oncomplete = () => loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      store.clear();
      transaction.oncomplete = () => loadNotifications();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
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
                onClick={() => {
                  notifications.forEach(n => {
                    if (!n.read) markAsRead(n.notificationId);
                  });
                }}
                disabled={unreadCount === 0}
              >
                Đánh dấu đã đọc
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={clearAll}
              >
                Xóa tất cả
              </Button>
            </Box>
          )}

          {/* List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {notifications.length === 0 ? (
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
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                      secondaryAction={
                        <Box>
                          {!notification.read && (
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => markAsRead(notification.notificationId)}
                              sx={{ mr: 1 }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        {notification.image ? (
                          <Avatar src={notification.image} />
                        ) : (
                          <Avatar sx={{ bgcolor: notification.read ? 'grey.400' : 'primary.main' }}>
                            {notification.read ? <CheckCircle /> : <Circle />}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={notification.read ? 'normal' : 'bold'}
                          >
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {notification.body}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(notification.timestamp)}
                            </Typography>
                          </>
                        }
                      />
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
    </>
  );
};

export default NotificationHistory;