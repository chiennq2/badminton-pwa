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
import ExpenseDetail from '../components/ExpenseDetail';
import { useQueryClient } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import ExportableSessionSummary from '../components/ExportableSessionSummary';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===== TẤT CẢ HOOKS PHẢI GỌI Ở ĐÂY - KHÔNG ĐIỀU KIỆN =====
  
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

  // ===== COMPUTED VALUES - PHẢI GỌI TRƯỚC KHI CHECK LOADING =====
  const sessionMembers = useMemo(() => {
    if (!session) return [];
    
    return session.members.map(sm => {
      const member = members?.find(m => m.id === sm.memberId);
      
      return {
        id: sm.memberId,
        name: sm.memberName || member?.name || `Member ${sm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || 'Không rõ',
        email: member?.email || '',
        isCustom: sm.isCustom || !member,
        isPresent: sm.isPresent,
        sessionMember: sm,
      };
    });
  }, [session, members]);

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

  const presentMembers = useMemo(() => {
    return session?.members.filter(m => m.isPresent) || [];
  }, [session]);

  const currentSettlements = useMemo(() => {
    return session?.settlements || [];
  }, [session]);

  // ===== PAYMENT STATISTICS - TÍNH TOÁN ĐÚNG =====
  const paymentStats = useMemo(() => {
    if (!session || !members) {
      return { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, paymentProgress: 0, paidCount: 0 };
    }

    const presentMembersList = session.members.filter(m => m.isPresent);
    
    // Tính toán chi tiết cho từng thành viên
    const memberPayments = presentMembersList.map(sessionMember => {
      const settlement = calculateMemberSettlement(session, sessionMember.memberId, members);
      const isPaid = session.settlements?.find(s => s.memberId === sessionMember.memberId)?.isPaid || false;
      
      return {
        memberId: sessionMember.memberId,
        total: settlement.total,
        isPaid,
      };
    });

    const totalAmount = memberPayments.reduce((sum, m) => sum + m.total, 0);
    const paidAmount = memberPayments.filter(m => m.isPaid).reduce((sum, m) => sum + m.total, 0);
    const unpaidAmount = totalAmount - paidAmount;
    const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const paidCount = memberPayments.filter(m => m.isPaid).length;

    return { totalAmount, paidAmount, unpaidAmount, paymentProgress, paidCount };
  }, [session, members]);

  // ===== EVENT HANDLERS =====
  const handleAttendanceChange = async (memberId: string, isPresent: boolean) => {
    if (!session) return;
    
    try {
      const updatedMembers = session.members.map(member =>
        member.memberId === memberId ? { ...member, isPresent } : member
      );
      
      const currentParticipants = updatedMembers.filter(m => m.isPresent).length;
      
      const newSettlements = generateDetailedSettlements(
        { ...session, members: updatedMembers },
        members || []
      );

      queryClient.setQueryData(['session', id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        };
      });
      
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { 
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      showSnackbar('Cập nhật điểm danh thành công!', 'success');
    } catch (error) {
      console.error('Attendance change error:', error);
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

      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      showSnackbar(`Đã ${isPaid ? 'đánh dấu thanh toán' : 'hủy thanh toán'} thành công!`, 'success');
    } catch (error) {
      console.error('Payment status change error:', error);
      await queryClient.invalidateQueries({ queryKey: ['session', id] });
      showSnackbar('Có lỗi xảy ra khi cập nhật trạng thái thanh toán!', 'error');
    }
  };

  const handleWaitingListReorder = async (result: DropResult) => {
    if (!result.destination || !session) return;

    const items = Array.from(session.waitingList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

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
    if (!members || !session) return;
    
    const generatedSettlements = generateDetailedSettlements(session, members);
    setSettlements(generatedSettlements);
    setCompleteDialogOpen(true);
  };

  const confirmCompleteSession = async () => {
    if (!session) return;
    
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
    if (!session) return;
    
    try {
      const element = document.getElementById('exportable-session-summary');
      if (!element) {
        showSnackbar('Không tìm thấy nội dung để xuất!', 'error');
        return;
      }

      // Show element temporarily
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';

      // Capture with html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      // Hide element again
      element.style.position = 'absolute';
      element.style.left = '-9999px';

      // Download image
      const link = document.createElement('a');
      link.download = `lich-${session.name}-${formatDate(session.date)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showSnackbar('Xuất ảnh thành công!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar('Có lỗi xảy ra khi xuất ảnh!', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // ===== DATA GRID COLUMNS FOR DIALOG =====
  const settlementColumns: GridColDef[] = useMemo(() => [
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
  ], []);

  // ===== KIỂM TRA LOADING SAU KHI ĐÃ GỌI TẤT CẢ HOOKS =====
  if (sessionLoading || !session || !id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // ===== RENDER =====
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
        {/* Members Attendance */}
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

        {/* Waiting List */}
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

        {/* CHI TIẾT CHI PHÍ + DANH SÁCH THANH TOÁN - DÙNG CHUNG COMPONENT */}
        <Grid item xs={12}>
          <ExpenseDetail 
            session={session}
            members={members || []}
            onPaymentStatusChange={handlePaymentStatusChange}
            isUpdating={updateSessionMutation.isPending}
          />
        </Grid>

        {/* QUẢN LÝ THANH TOÁN - CHỈ HIỂN THỊ THỐNG KÊ */}
        {session.status === 'completed' && currentSettlements.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Payment sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Tổng quan thanh toán</Typography>
                </Box>

                {/* Payment Progress */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Tiến độ thanh toán:</strong> {Math.round(paymentStats.paymentProgress)}% - 
                    Đã thu {formatCurrency(paymentStats.paidAmount)} / {formatCurrency(paymentStats.totalAmount)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={paymentStats.paymentProgress} 
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    color="success"
                  />
                </Alert>

                {/* Payment Statistics */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                      <AccountBalance sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(paymentStats.totalAmount)}
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
                        {formatCurrency(paymentStats.paidAmount)}
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
                        {formatCurrency(paymentStats.unpaidAmount)}
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
                        {paymentStats.paidCount}/{presentMembers.length}
                      </Typography>
                      <Typography variant="body2">
                        Người đã thanh toán
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mt: 2 }} icon={false}>
                  <Typography variant="caption">
                    💡 <strong>Mẹo:</strong> Xem chi tiết và cập nhật trạng thái thanh toán trong phần "Danh sách thanh toán thành viên" phía trên
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* COMPONENT ẨN ĐỂ XUẤT ẢNH */}
      <Box 
        id="exportable-session-summary" 
        sx={{ position: 'absolute', left: '-9999px', top: 0 }}
      >
        <ExportableSessionSummary
          session={session}
          members={members || []}
          courtName={court?.name}
        />
      </Box>

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
          onClose={() => setSnackbar({ ...snackbar, open: false})}
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