import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  ExpandMore,
  Person,
  AccessTime,
  LocationOn,
  AttachMoney,
  Download,
  CheckCircle,
  Schedule,
  Groups,
  Receipt,
  Payment,
  Edit,
  RadioButtonUnchecked,
  AccountBalance,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

import { useSession, useUpdateSession, useMembers, useCourt } from '../hooks';
import { Settlement, WaitingListMember } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatTime, 
  getSessionStatusText, 
  getSessionStatusColor,
  exportSessionImage,
  generateDetailedSettlements,
  calculateMemberSettlement
} from '../utils';
import SessionEditForm from '../components/SessionEditForm';
import { useQueryClient } from '@tanstack/react-query';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===== TẤT CẢ HOOKS PHẢI GỌI TRƯỚC BẤT KỲ CONDITIONAL LOGIC NÀO =====
  
  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: court } = useCourt(session?.courtId || '');
  const { data: members } = useMembers();
  const updateSessionMutation = useUpdateSession();

  // State hooks
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  if (sessionLoading || !session || !id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const sessionMembers = useMemo(() => {
    if (!session) return [];
    
    return session.members.map(sm => {
      // Tìm member từ database
      const member = members?.find(m => m.id === sm.memberId);
      
      // Trả về object với thông tin đầy đủ
      return {
        id: sm.memberId,
        name: sm.memberName || member?.name || `Member ${sm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || 'Không rõ',
        email: member?.email || '',
        isCustom: sm.isCustom || !member,
        isPresent: sm.isPresent,
        sessionMember: sm, // Giữ reference tới session member data
      };
    });
  }, [session, members]);

  // Cải thiện logic lấy waiting members
  const waitingMembers = useMemo(() => {
    if (!session) return [];
    
    return session.waitingList.map(wm => {
      const member = members?.find(m => m.id === wm.memberId);
      
      return {
        id: wm.memberId,
        name: wm.memberName || member?.name || `Member ${wm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || 'Không rõ',
        email: member?.email || '',
        isCustom: wm.isCustom || !member,
        priority: wm.priority,
        waitingMember: wm,
      };
    });
  }, [session, members]);

  const presentMembers = session.members.filter(m => m.isPresent);
  const currentSettlements = session.settlements || [];

  const handleAttendanceChange = async (memberId: string, isPresent: boolean) => {
    if (!session) return;
    
    try {
      // 1. Update local state trước để UI responsive ngay lập tức
      const updatedMembers = session.members.map(member =>
        member.memberId === memberId ? { ...member, isPresent } : member
      );
      
      const currentParticipants = updatedMembers.filter(m => m.isPresent).length;
      
      // 2. Regenerate settlements khi attendance thay đổi
      const newSettlements = generateDetailedSettlements(
        { ...session, members: updatedMembers },
        members || []
      );

      // 3. Optimistic update - cập nhật cache ngay lập tức
      queryClient.setQueryData(['session', id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        };
      });
      
      // 4. Gọi API update
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { 
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        },
      });

      // 5. Invalidate và refetch để đảm bảo data sync
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] }); // Cập nhật list sessions
      
      showSnackbar('Cập nhật điểm danh thành công!', 'success');
    } catch (error) {
      console.error('Attendance change error:', error);
      
      // 6. Nếu có lỗi, revert lại optimistic update
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      
      showSnackbar('Có lỗi xảy ra khi cập nhật điểm danh!', 'error');
    }
  };

  const handlePaymentStatusChange = async (memberId: string, isPaid: boolean) => {
    if (!session) return;
    
    try {
      const currentSettlements = session.settlements || [];
      const updatedSettlements = currentSettlements.map(settlement =>
        settlement.memberId === memberId ? { ...settlement, isPaid } : settlement
      );
      
      // Optimistic update cho payment status
      queryClient.setQueryData(['session', id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          settlements: updatedSettlements,
        };
      });
      
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { settlements: updatedSettlements },
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      showSnackbar(`Đã ${isPaid ? 'đánh dấu thanh toán' : 'hủy thanh toán'} thành công!`, 'success');
    } catch (error) {
      console.error('Payment status change error:', error);
      
      // Revert optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      
      showSnackbar('Có lỗi xảy ra khi cập nhật trạng thái thanh toán!', 'error');
    }
  };

  const handleWaitingListReorder = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(session.waitingList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update priorities
    const updatedWaitingList = items.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { waitingList: updatedWaitingList },
      });
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi sắp xếp lại sảnh chờ!', 'error');
    }
  };

  const handleCompleteSession = () => {
    if (!members) return;
    
    const generatedSettlements = generateDetailedSettlements(session, members);
    setSettlements(generatedSettlements);
    setCompleteDialogOpen(true);
  };

  const confirmCompleteSession = async () => {
    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { 
          status: 'completed',
          settlements,
        },
      });
      
      setCompleteDialogOpen(false);
      showSnackbar('Hoàn thành lịch đánh thành công!', 'success');
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi hoàn thành lịch!', 'error');
    }
  };

  const handleExportImage = async () => {
    try {
      await exportSessionImage(
        'session-summary', 
        `lich-${session.name}-${formatDate(session.date)}.png`
      );
      showSnackbar('Xuất ảnh thành công!', 'success');
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi xuất ảnh!', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Payment statistics
  const totalAmount = currentSettlements.reduce((sum, s) => {
    const memberIsPresent = session.members.find(m => m.memberId === s.memberId)?.isPresent;
    return memberIsPresent ? sum + s.amount : sum;
  }, 0);

  const paidAmount = currentSettlements.reduce((sum, s) => {
    const memberIsPresent = session.members.find(m => m.memberId === s.memberId)?.isPresent;
    return (memberIsPresent && s.isPaid) ? sum + s.amount : sum;
  }, 0);

  const unpaidAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const settlementColumns: GridColDef[] = [
    { 
      field: 'memberName', 
      headerName: 'Tên thành viên', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          {params.value}
        </Box>
      ),
    },
    { 
      field: 'amount', 
      headerName: 'Số tiền', 
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium" color="success.main">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'isPaid',
      headerName: 'Trạng thái',
      width: 160,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={params.value ? 'Đã thanh toán' : 'Chưa thanh toán'}
            color={params.value ? 'success' : 'warning'}
            size="small"
            variant={params.value ? 'filled' : 'outlined'}
          />
          <Tooltip title={params.value ? 'Đánh dấu chưa thanh toán' : 'Đánh dấu đã thanh toán'}>
            <IconButton
              size="small"
              onClick={() => handlePaymentStatusChange(params.row.memberId, !params.value)}
              color={params.value ? 'error' : 'success'}
              sx={{ ml: 1 }}
            >
              {params.value ? <RadioButtonUnchecked /> : <CheckCircle />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {session.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={getSessionStatusText(session.status)}
              color={getSessionStatusColor(session.status)}
            />
            <Typography variant="body2" color="text.secondary">
              {formatDate(session.date)} • {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setEditFormOpen(true)}
            startIcon={<Edit />}
          >
            Chỉnh sửa
          </Button>
          {session.status === 'ongoing' && (
            <Button
              variant="contained"
              color="success"
              onClick={handleCompleteSession}
              startIcon={<CheckCircle />}
            >
              Hoàn thành
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={handleExportImage}
            startIcon={<Download />}
          >
            Xuất ảnh
          </Button>
        </Box>
      </Box>

      {/* Session Summary Card - For Export */}
      <Card id="session-summary" sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Thông tin sân</Typography>
              </Box>
              <Typography variant="body1">
                <strong>Sân:</strong> {court?.name || 'Đang tải...'}
              </Typography>
              <Typography variant="body1">
                <strong>Địa chỉ:</strong> {court?.location || 'Đang tải...'}
              </Typography>
              <Typography variant="body1">
                <strong>Giá:</strong> {court ? formatCurrency(court.pricePerHour) : 'Đang tải...'}/giờ
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Chi phí</Typography>
              </Box>
              <Typography variant="body1">
                <strong>Tổng chi phí:</strong> {formatCurrency(session.totalCost)}
              </Typography>
              <Typography variant="body1">
                <strong>Chi phí/người:</strong> {formatCurrency(session.costPerPerson)}
              </Typography>
              <Typography variant="body1">
                <strong>Số người tham gia:</strong> {session.currentParticipants}/{session.maxParticipants}
              </Typography>
              <Typography variant="body1">
                <strong>Có mặt:</strong> {presentMembers.length} người
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Members Attendance - CẢI THIỆN */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">
                  Điểm danh thành viên ({presentMembers.length}/{sessionMembers.length})
                </Typography>
              </Box>
              
              <List>
                {sessionMembers.map((member) => {
                  const isUpdating = updateSessionMutation.isPending;
                  
                  return (
                    <ListItem key={member.id} dense>
                      <ListItemIcon>
                        <Box sx={{ position: 'relative' }}>
                          <Checkbox
                            checked={member.isPresent}
                            onChange={(e) => handleAttendanceChange(member.id, e.target.checked)}
                            disabled={session.status === 'completed' || isUpdating}
                          />
                          {isUpdating && (
                            <CircularProgress
                              size={20}
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-10px',
                                marginLeft: '-10px',
                              }}
                            />
                          )}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {member.name}
                            {member.isCustom && (
                              <Chip 
                                label="Tùy chỉnh" 
                                size="small" 
                                sx={{ ml: 1 }} 
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                            {member.isPresent && (
                              <Chip 
                                label="Có mặt" 
                                color="success" 
                                size="small" 
                                sx={{ ml: 1 }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={member.isCustom ? 'Thành viên tùy chỉnh' : member.skillLevel}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

 {/* Waiting List - CẢI THIỆN */}
 <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Sảnh chờ ({waitingMembers.length})</Typography>
              </Box>
              
              {waitingMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sảnh chờ trống
                </Typography>
              ) : (
                <List dense>
                  {waitingMembers.map((member, index) => (
                    <ListItem key={member.id}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {`${index + 1}. ${member.name}`}
                            {member.isCustom && (
                              <Chip 
                                label="Tùy chỉnh" 
                                size="small" 
                                sx={{ ml: 1 }} 
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                          </Box>
                        }
                        secondary={member.isCustom ? 'Thành viên tùy chỉnh' : member.skillLevel}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Expenses */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Receipt sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Chi tiết chi phí</Typography>
              </Box>

              {session.expenses.map((expense, index) => (
                <Accordion key={expense.id} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                      <Typography>{expense.name}</Typography>
                      <Typography fontWeight="bold">
                        {formatCurrency(expense.amount)}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      Loại: {expense.type === 'court' ? 'Tiền sân' : expense.type === 'shuttlecock' ? 'Tiền cầu' : 'Khác'}
                    </Typography>
                    {expense.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Mô tả: {expense.description}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 2,
                p: 2,
                backgroundColor: 'action.hover',
                borderRadius: 1,
              }}>
                <Typography variant="h6" fontWeight="bold">
                  Tổng cộng:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {formatCurrency(session.totalCost)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Management (for completed sessions) */}
        {session.status === 'completed' && currentSettlements.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Payment sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Quản lý thanh toán</Typography>
                </Box>

                {/* Payment Progress */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Tiến độ thanh toán:</strong> {Math.round(paymentProgress)}% - 
                    Đã thu {formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={paymentProgress} 
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    color="success"
                  />
                </Alert>

                {/* Payment Statistics */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                      <AccountBalance sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(totalAmount)}
                      </Typography>
                      <Typography variant="body2">
                        Tổng phải thu
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'success.contrastText' }}>
                      <CheckCircle sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(paidAmount)}
                      </Typography>
                      <Typography variant="body2">
                        Đã thu được
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light', color: 'error.contrastText' }}>
                      <Warning sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(unpaidAmount)}
                      </Typography>
                      <Typography variant="body2">
                        Còn thiếu
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'info.light', color: 'info.contrastText' }}>
                      <TrendingUp sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {Math.round(paymentProgress)}%
                      </Typography>
                      <Typography variant="body2">
                        Hoàn thành
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Settlement Table */}
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={currentSettlements.filter(s => {
                      const memberIsPresent = session.members.find(m => m.memberId === s.memberId)?.isPresent;
                      return memberIsPresent;
                    })}
                    columns={settlementColumns}
                    getRowId={(row) => row.memberId}
                    hideFooter
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
          </Grid>
        )}
      </Grid>

      {/* Session Edit Form */}
      {session && (
        <SessionEditForm
          open={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          onSuccess={() => {
            setEditFormOpen(false);
            showSnackbar('Cập nhật lịch thành công!', 'success');
          }}
          session={session}
        />
      )}

      {/* Complete Session Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Hoàn thành lịch đánh</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Xác nhận hoàn thành lịch đánh. Chi phí sẽ được chia đều cho các thành viên có mặt.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thành viên có mặt: {presentMembers.length} người
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Tổng chi phí: {formatCurrency(session.totalCost)}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Chi phí mỗi người: {formatCurrency(session.costPerPerson)}
            </Typography>
          </Box>

          {settlements.length > 0 && (
            <Box sx={{ height: 300, width: '100%' }}>
              <DataGrid
                rows={settlements}
                columns={settlementColumns}
                getRowId={(row) => row.memberId}
                hideFooter
                disableRowSelectionOnClick
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={confirmCompleteSession}
            variant="contained"
            color="success"
            disabled={updateSessionMutation.isPending}
          >
            {updateSessionMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              'Xác nhận hoàn thành'
            )}
          </Button>
        </DialogActions>
      </Dialog>

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

export default SessionDetail;