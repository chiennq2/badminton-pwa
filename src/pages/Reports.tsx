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
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: members } = useMembers();
  const { data: courts } = useCourts();

  const [filters, setFilters] = useState<ReportFilter>({
    startDate: dayjs().subtract(30, 'day').toDate(),
    endDate: new Date(),
    memberName: '',
    courtId: '',
    status: 'scheduled',
  });

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      // Date filter
      if (filters.startDate && session.date < filters.startDate) return false;
      if (filters.endDate && session.date > filters.endDate) return false;
      
      // Member filter
      if (filters.memberName) {
        const memberInSession = session.members.some(sm => {
          const member = members?.find(m => m.id === sm.memberId);
          return member?.name.toLowerCase().includes(filters.memberName!.toLowerCase());
        });
        if (!memberInSession) return false;
      }
      
      // Court filter
      if (filters.courtId && session.courtId !== filters.courtId) return false;
      
      // Status filter
      if (filters.status && session.status !== filters.status) return false;
      
      return true;
    });
  }, [sessions, members, filters]);

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
          label: 'Doanh thu (VNĐ)',
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
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
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
          Phân tích hoạt động và doanh thu của các lịch đánh cầu lông
        </Typography>
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
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Đến ngày"
                value={dayjs(filters.endDate)}
                onChange={(newValue) => handleFilterChange('endDate', newValue?.toDate())}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={members || []}
                getOptionLabel={(option) => option.name}
                onChange={(_, value) => handleFilterChange('memberName', value?.name || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Thành viên" size="small" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sân</InputLabel>
                <Select
                  value={filters.courtId}
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
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Analytics sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.totalSessions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng số lịch
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(stats.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng doanh thu
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(stats.averageCostPerSession)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chi phí TB/lịch
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold">
                {stats.mostActiveMembers[0]?.sessionCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lịch nhiều nhất
              </Typography>
              {stats.mostActiveMembers[0] && (
                <Typography variant="caption" color="text.secondary">
                  {stats.mostActiveMembers[0].memberName}
                </Typography>
              )}
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
                Doanh thu theo tháng
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return new Intl.NumberFormat('vi-VN').format(value as number) + ' đ';
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sử dụng sân
              </Typography>
              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                {stats.courtUsage.length > 0 ? (
                  <Doughnut
                    data={courtUsageChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    Không có dữ liệu
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Members */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thành viên tích cực nhất
              </Typography>
              {stats.mostActiveMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu
                </Typography>
              ) : (
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
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            minWidth: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            mr: 2,
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Typography>{member.memberName}</Typography>
                      </Box>
                      <Typography fontWeight="bold">
                        {member.sessionCount} lịch
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê sân
              </Typography>
              {stats.courtUsage.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Không có dữ liệu
                </Typography>
              ) : (
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