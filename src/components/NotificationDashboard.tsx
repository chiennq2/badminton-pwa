// components/NotificationDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Notifications,
  Send,
  Schedule,
  CheckCircle,
  Error,
  Cancel,
  TrendingUp,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { scheduledNotificationService } from '../services/scheduledNotificationService';
import { ScheduledNotification } from '../types/notification';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  upcoming: ScheduledNotification[];
}

const NotificationDashboard: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [allNotifications, upcomingNotifications] = await Promise.all([
        scheduledNotificationService.getScheduledNotifications(),
        scheduledNotificationService.getUpcomingNotifications(),
      ]);

      const pending = allNotifications.filter((n) => n.status === 'pending').length;
      const sent = allNotifications.filter((n) => n.status === 'sent').length;
      const failed = allNotifications.filter((n) => n.status === 'failed').length;
      const cancelled = allNotifications.filter((n) => n.status === 'cancelled').length;

      setStats({
        total: allNotifications.length,
        pending,
        sent,
        failed,
        cancelled,
        upcoming: upcomingNotifications.slice(0, 5), // Chỉ lấy 5 thông báo sắp tới
      });
    } catch (error) {
      console.error('Error loading notification stats:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Schedule />;
      case 'sent':
        return <CheckCircle />;
      case 'failed':
        return <Error />;
      case 'cancelled':
        return <Cancel />;
      default:
        return <Notifications />;
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  const successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0;

  return (
    <Box>
      {/* Header với nút refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Thống kê thông báo
        </Typography>
        <Tooltip title="Làm mới">
          <IconButton onClick={loadStats} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                <Notifications />
              </Avatar>
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng thông báo
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                <Schedule />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đang chờ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                <CheckCircle />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.sent}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã gửi
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                <TrendingUp />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {successRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tỷ lệ thành công
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Notifications */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Schedule sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Thông báo sắp tới (24h)
            </Typography>
          </Box>

          {stats.upcoming.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Schedule sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Không có thông báo nào sắp được gửi
              </Typography>
            </Box>
          ) : (
            <List>
              {stats.upcoming.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getStatusColor(notification.status) + '.main' }}>
                      {getStatusIcon(notification.status)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getStatusText(notification.status)}
                          color={getStatusColor(notification.status) as any}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {notification.body}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Gửi lúc: {dayjs(notification.scheduledTime).format('DD/MM/YYYY HH:mm')} (
                          {dayjs(notification.scheduledTime).fromNow()})
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Phân bố trạng thái
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Đang chờ</Typography>
              <Typography variant="body2" fontWeight="medium">
                {stats.pending} ({stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}
              color="warning"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Đã gửi</Typography>
              <Typography variant="body2" fontWeight="medium">
                {stats.sent} ({stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.total > 0 ? (stats.sent / stats.total) * 100 : 0}
              color="success"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Thất bại</Typography>
              <Typography variant="body2" fontWeight="medium">
                {stats.failed} ({stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.total > 0 ? (stats.failed / stats.total) * 100 : 0}
              color="error"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Đã hủy</Typography>
              <Typography variant="body2" fontWeight="medium">
                {stats.cancelled} ({stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0}
              sx={{ mb: 2 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationDashboard;