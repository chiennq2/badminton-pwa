import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  SportsTennis,
  People,
  Groups,
  CalendarMonth,
  TrendingUp,
  Today,
  Schedule,
  CheckCircle,
} from '@mui/icons-material';
import { useCourts, useMembers, useGroups, useSessions } from '../hooks';
import { formatCurrency, formatDate, isToday, isFuture } from '../utils';
import { Session } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card
    sx={{
      height: '100%',
      background: (theme) =>
        theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette[color].dark}20 0%, ${theme.palette[color].main}15 100%)`
          : `linear-gradient(135deg, ${theme.palette[color].light}20 0%, ${theme.palette[color].main}10 100%)`,
      border: (theme) => `1px solid ${theme.palette[color].main}30`,
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: (theme) => `0 8px 25px ${theme.palette[color].main}25`,
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: `${color}.main`,
            color: `${color}.contrastText`,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { data: courts, isLoading: courtsLoading } = useCourts();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();

  const isLoading = courtsLoading || membersLoading || groupsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const activeCourts = courts?.filter((court) => court.isActive) || [];
  const activeMembers = members?.filter((member) => member.isActive) || [];
  const todaySessions = sessions?.filter((session) => isToday(new Date(session.date))) || [];
  
  // Lấy lịch sắp tới và sắp xếp theo thời gian gần nhất
  const upcomingSessions = sessions
    ?.filter((session) => isFuture(session.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3) || [];
  
  // Lấy lịch đã hoàn thành và sắp xếp theo thời gian gần nhất
  const completedSessions = sessions
    ?.filter((session) => session.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3) || [];

  const totalRevenue = sessions?.filter((s) => s.status === 'completed').reduce((sum, session) => sum + session.totalCost, 0) || 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Tổng quan hệ thống
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Chào mừng bạn trở lại! Đây là tình hình hoạt động cầu lông hôm nay.
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Sân hoạt động" value={activeCourts.length} icon={<SportsTennis />} color="primary" subtitle={`Tổng ${courts?.length || 0} sân`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Thành viên" value={activeMembers.length} icon={<People />} color="success" subtitle={`Tổng ${members?.length || 0} thành viên`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Nhóm" value={groups?.length || 0} icon={<Groups />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Doanh thu" value={formatCurrency(totalRevenue)} icon={<TrendingUp />} color="warning" subtitle={`${completedSessions.length} lịch hoàn thành`} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Today's Sessions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Today sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2" fontWeight="bold">
                  Lịch hôm nay
                </Typography>
                <Chip label={todaySessions.length} size="small" color="primary" sx={{ ml: 'auto' }} />
              </Box>

              {todaySessions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Không có lịch đánh nào hôm nay
                </Typography>
              ) : (
                <List dense>
                  {todaySessions.slice(0, 5).map((session, index) => (
                    <React.Fragment key={session.id}>
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: getSessionStatusColor(session.status),
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={session.name}
                          secondary={`${session.startTime} - ${session.endTime} • ${formatCurrency(session.totalCost)}`}
                        />
                        <Chip label={getSessionStatusText(session.status)} size="small" color={getSessionStatusChipColor(session.status)} variant="outlined" />
                      </ListItem>
                      {index < todaySessions.slice(0, 5).length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Sessions - 3 items */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6" component="h2" fontWeight="bold">
                  Lịch sắp tới
                </Typography>
                <Chip label={upcomingSessions.length} size="small" color="secondary" sx={{ ml: 'auto' }} />
              </Box>

              {upcomingSessions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Không có lịch đánh sắp tới
                </Typography>
              ) : (
                <List dense>
                  {upcomingSessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <CalendarMonth fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={session.name}
                          secondary={`${formatDate(session.date)} • ${session.startTime} - ${session.endTime}`}
                        />
                      </ListItem>
                      {index < upcomingSessions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity - 3 items */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6" component="h2" fontWeight="bold">
                  Hoạt động gần đây
                </Typography>
                <Chip label={completedSessions.length} size="small" color="success" sx={{ ml: 'auto' }} />
              </Box>

              {completedSessions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Chưa có hoạt động nào được hoàn thành
                </Typography>
              ) : (
                <List>
                  {completedSessions.map((session, index) => (
                    <React.Fragment key={session.id}>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Hoàn thành: ${session.name}`}
                          secondary={`${formatDate(session.date)} • ${session.currentParticipants} người tham gia • ${formatCurrency(session.totalCost)}`}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(session.updatedAt)}
                        </Typography>
                      </ListItem>
                      {index < completedSessions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const getSessionStatusColor = (status: Session['status']): string => {
  switch (status) {
    case 'scheduled':
      return '#2196f3';
    case 'ongoing':
      return '#ff9800';
    case 'completed':
      return '#4caf50';
    case 'cancelled':
      return '#f44336';
    default:
      return '#9e9e9e';
  }
};

const getSessionStatusText = (status: Session['status']): string => {
  switch (status) {
    case 'scheduled':
      return 'Đã lên lịch';
    case 'ongoing':
      return 'Đang diễn ra';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Không xác định';
  }
};

const getSessionStatusChipColor = (status: Session['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'scheduled':
      return 'primary';
    case 'ongoing':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

export default Dashboard;