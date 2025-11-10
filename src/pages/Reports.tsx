import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Autocomplete,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FilterList, Analytics, Assessment } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSessions, useMembers, useCourts } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { Session, ReportFilter } from '../types';
import { formatCurrency, formatDate, exportToCsv } from '../utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: members } = useMembers();
  const { data: courts } = useCourts();

  const [filters, setFilters] = useState<ReportFilter>({
    startDate: dayjs().subtract(30, 'day').toDate(),
    endDate: new Date(),
    memberName: '',
    courtId: '',
    status: undefined, // Không filter status mặc định
  });

  // Filter sessions theo role và filters
  const filteredSessions = useMemo(() => {
    if (!sessions) {
      console.log('No sessions data');
      return [];
    }
    
    console.log('Total sessions:', sessions.length);
    console.log('User role:', currentUser?.role);
    
    return sessions.filter(session => {
      // Date filter
      if (filters.startDate && session.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && session.date > filters.endDate) {
        return false;
      }
      
      // Member filter
      if (filters.memberName) {
        const memberInSession = session.members.some(sm => {
          const member = members?.find(m => m.id === sm.memberId);
          return member?.name.toLowerCase().includes(filters.memberName!.toLowerCase());
        });
        if (!memberInSession) return false;
      }
      
      // Court filter
      if (filters.courtId && session.courtId !== filters.courtId) {
        return false;
      }
      
      // Status filter
      if (filters.status && session.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [sessions, members, filters, currentUser]);

  console.log('Filtered sessions:', filteredSessions.length);

  // Statistics
  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalRevenue = filteredSessions.reduce((sum, session) => sum + session.totalCost, 0);
    const averageCostPerSession = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    
    // Most active members
    const memberSessionCount: Record<string, number> = {};
    filteredSessions.forEach(session => {
      session.members.filter(m => m.isPresent).forEach(m => {
        memberSessionCount[m.memberId] = (memberSessionCount[m.memberId] || 0) + 1;
      });
    });
    
    const mostActiveMembers = Object.entries(memberSessionCount)
      .map(([memberId, count]) => {
        const member = members?.find(m => m.id === memberId);
        return {
          memberId,
          memberName: member?.name || 'Unknown',
          sessionCount: count,
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 5);

    // Court usage
    const courtUsage: Record<string, number> = {};
    filteredSessions.forEach(session => {
      courtUsage[session.courtId] = (courtUsage[session.courtId] || 0) + 1;
    });

    const courtUsageData = Object.entries(courtUsage)
      .map(([courtId, count]) => {
        const court = courts?.find(c => c.id === courtId);
        return {
          courtId,
          courtName: court?.name || 'Unknown',
          sessionCount: count,
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount);

    return {
      totalSessions,
      totalRevenue,
      averageCostPerSession,
      mostActiveMembers,
      courtUsage: courtUsageData,
    };
  }, [filteredSessions, members, courts]);

  // Chart data
  const revenueChartData = useMemo(() => {
    const monthlyRevenue: Record<string, number> = {};
    
    filteredSessions.forEach(session => {
      const month = dayjs(session.date).format('YYYY-MM');
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + session.totalCost;
    });

    const sortedMonths = Object.keys(monthlyRevenue).sort();
    
    return {
      labels: sortedMonths.map(month => dayjs(month).format('MM/YYYY')),
      datasets: [
        {
          label: 'Chi phí (VNĐ)',
          data: sortedMonths.map(month => monthlyRevenue[month]),
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  }, [filteredSessions]);

  const courtUsageChartData = useMemo(() => {
    return {
      labels: stats.courtUsage.map(court => court.courtName),
      datasets: [
        {
          data: stats.courtUsage.map(court => court.sessionCount),
          backgroundColor: [
            'rgba(76, 175, 80, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(33, 150, 243, 0.8)',
            'rgba(156, 39, 176, 0.8)',
            'rgba(244, 67, 54, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [stats.courtUsage]);

  const handleFilterChange = (field: keyof ReportFilter, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleExportSessions = () => {
    const exportData = filteredSessions.map(session => {
      const court = courts?.find(c => c.id === session.courtId);
      return {
        'Tên lịch': session.name,
        'Ngày': formatDate(session.date),
        'Giờ bắt đầu': session.startTime,
        'Giờ kết thúc': session.endTime,
        'Sân': court?.name || 'Unknown',
        'Số người tham gia': session.currentParticipants,
        'Số người tối đa': session.maxParticipants,
        'Tổng chi phí': session.totalCost,
        'Chi phí/người': session.costPerPerson,
        'Trạng thái': session.status,
        'Ghi chú': session.notes || '',
      };
    });
    
    exportToCsv(exportData, `bao-cao-lich-${dayjs().format('YYYY-MM-DD')}.csv`);
  };

  const sessionColumns: GridColDef[] = [
    { field: 'name', headerName: 'Tên lịch', flex: 1, minWidth: 200 },
    { 
      field: 'date', 
      headerName: 'Ngày', 
      width: 120,
      renderCell: (params) => formatDate(new Date(params.value)),
    },
    { field: 'startTime', headerName: 'Giờ BD', width: 80 },
    { field: 'endTime', headerName: 'Giờ KT', width: 80 },
    { 
      field: 'currentParticipants', 
      headerName: 'Số người', 
      width: 100,
      renderCell: (params) => `${params.value}/${params.row.maxParticipants}`,
    },
    { 
      field: 'totalCost', 
      headerName: 'Tổng chi phí', 
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    { 
      field: 'costPerPerson', 
      headerName: 'Chi phí/người', 
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
  ];

  if (sessionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Thông báo nếu user chưa có sessions
  if (!sessions || sessions.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Báo cáo và thống kê
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {currentUser?.role === 'admin' 
              ? 'Phân tích hoạt động và chi phí của các lịch đánh cầu lông'
              : 'Phân tích hoạt động và chi phí của các lịch đánh bạn đã tạo'
            }
          </Typography>
        </Box>
        
        <Alert severity="info">
          <Typography variant="body1">
            {currentUser?.role === 'admin'
              ? 'Chưa có lịch đánh nào trong hệ thống. Hãy tạo lịch đánh đầu tiên!'
              : 'Bạn chưa tạo lịch đánh nào. Hãy tạo lịch đánh đầu tiên để xem thống kê!'
            }
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Báo cáo và thống kê
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {currentUser?.role === 'admin' 
            ? 'Phân tích hoạt động và chi phí của các lịch đánh cầu lông'
            : 'Phân tích hoạt động và chi phí của các lịch đánh bạn đã tạo'
          }
        </Typography>
        
        {currentUser?.role === 'user' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Bạn đang xem báo cáo của {sessions.length} lịch đánh do bạn tạo
          </Alert>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterList sx={{ mr: 1 }} />
            <Typography variant="h6">Bộ lọc</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Từ ngày"
                value={dayjs(filters.startDate)}
                onChange={(newValue) => handleFilterChange('startDate', newValue?.toDate())}
                dayOfWeekFormatter={(day) => {
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  return dayNames[day];
                }}
                slotProps={{ 
                  textField: { fullWidth: true, size: 'small' } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Đến ngày"
                value={dayjs(filters.endDate)}
                onChange={(newValue) => handleFilterChange('endDate', newValue?.toDate())}
                dayOfWeekFormatter={(day) => {
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  return dayNames[day];
                }}
                slotProps={{ 
                  textField: { fullWidth: true, size: 'small' } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={members || []}
                getOptionLabel={(option) => option.name}
                onChange={(_, value) => handleFilterChange('memberName', value?.name || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Thành viên" size="small" fullWidth />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sân</InputLabel>
                <Select
                  value={filters.courtId || ''}
                  onChange={(e) => handleFilterChange('courtId', e.target.value)}
                  label="Sân"
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {courts?.map(court => (
                    <MenuItem key={court.id} value={court.id}>
                      {court.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  label="Trạng thái"
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="scheduled">Đã lên lịch</MenuItem>
                  <MenuItem value="ongoing">Đang diễn ra</MenuItem>
                  <MenuItem value="completed">Hoàn thành</MenuItem>
                  <MenuItem value="cancelled">Đã hủy</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Tổng số lịch
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalSessions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Analytics sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Tổng chi phí
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {formatCurrency(stats.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Analytics sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Trung bình/lịch
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {formatCurrency(stats.averageCostPerSession)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Sân được dùng
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.courtUsage.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Chi phí theo tháng
              </Typography>
              {revenueChartData.labels.length > 0 ? (
                <Bar
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(value as number),
                        },
                      },
                    },
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Không có dữ liệu
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tỷ lệ sử dụng sân
              </Typography>
              {stats.courtUsage.length > 0 ? (
                <Doughnut
                  data={courtUsageChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Không có dữ liệu
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 5 thành viên tích cực
              </Typography>
              {stats.mostActiveMembers.length > 0 ? (
                <Box>
                  {stats.mostActiveMembers.map((member, index) => (
                    <Box
                      key={member.memberId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: index < stats.mostActiveMembers.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>
                        {index + 1}. {member.memberName}
                      </Typography>
                      <Typography fontWeight="bold">
                        {member.sessionCount} lịch
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê sử dụng sân
              </Typography>
              {stats.courtUsage.length > 0 ? (
                <Box>
                  {stats.courtUsage.map((court, index) => (
                    <Box
                      key={court.courtId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: index < stats.courtUsage.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography>{court.courtName}</Typography>
                      <Typography fontWeight="bold">
                        {court.sessionCount} lịch
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sessions List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Danh sách lịch đánh ({filteredSessions.length})
            </Typography>
            <Button
              variant="outlined"
              onClick={handleExportSessions}
              size="small"
              disabled={filteredSessions.length === 0}
            >
              Xuất CSV
            </Button>
          </Box>
          
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={filteredSessions}
              columns={sessionColumns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
                sorting: {
                  sortModel: [{ field: 'date', sort: 'desc' }],
                },
              }}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'action.hover',
                  fontWeight: 600,
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;