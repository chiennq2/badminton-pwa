import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useSession, useUpdateSession, useMembers, useCourt } from '../hooks';
import { Settlement, WaitingListMember } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatTime, 
  getSessionStatusText, 
  getSessionStatusColor,
  exportSessionImage,
  generateSettlements 
} from '../utils';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: court } = useCourt(session?.courtId || '');
  const { data: members } = useMembers();
  const updateSessionMutation = useUpdateSession();

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
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

  const sessionMembers = members?.filter(member => 
    session.members.some(sm => sm.memberId === member.id)
  ) || [];

  const waitingMembers = members?.filter(member =>
    session.waitingList.some(wm => wm.memberId === member.id)
  ) || [];

  const handleAttendanceChange = async (memberId: string, isPresent: boolean) => {
    try {
      const updatedMembers = session.members.map(member =>
        member.memberId === memberId ? { ...member, isPresent } : member
      );
      
      const currentParticipants = updatedMembers.filter(m => m.isPresent).length;
      
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { 
          members: updatedMembers,
          currentParticipants,
        },
      });
      
      showSnackbar('Cập nhật điểm danh thành công!', 'success');
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi cập nhật điểm danh!', 'error');
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
    
    const generatedSettlements = generateSettlements(session, members);
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

  const settlementColumns: GridColDef[] = [
    { field: 'memberName', headerName: 'Tên thành viên', flex: 1 },
    { 
      field: 'amount', 
      headerName: 'Số tiền', 
      width: 150,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'isPaid',
      headerName: 'Đã thanh toán',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Đã thanh toán' : 'Chưa thanh toán'}
          color={params.value ? 'success' : 'warning'}
          size="small"
        />
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
            </Grid>

            {/* QR Code Display */}
            {session.qrImage && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    QR Code thanh toán
                  </Typography>
                  <img 
                    src={session.qrImage} 
                    alt="QR Code thanh toán" 
                    style={{ maxWidth: 300, maxHeight: 300, border: '1px solid #ccc' }} 
                  />
                </Box>
              </Grid>
            )}
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
                <Typography variant="h6">Điểm danh thành viên</Typography>
              </Box>
              
              <List>
                {sessionMembers.map((member) => {
                  const sessionMember = session.members.find(sm => sm.memberId === member.id);
                  return (
                    <ListItem key={member.id} dense>
                      <ListItemIcon>
                        <Checkbox
                          checked={sessionMember?.isPresent || false}
                          onChange={(e) => handleAttendanceChange(member.id, e.target.checked)}
                          disabled={session.status === 'completed'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={member.name}
                        secondary={member.skillLevel}
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
                <DragDropContext onDragEnd={handleWaitingListReorder}>
                  <Droppable droppableId="waiting-list">
                    {(provided) => (
                      <List {...provided.droppableProps} ref={provided.innerRef}>
                        {waitingMembers.map((member, index) => (
                          <Draggable
                            key={member.id}
                            draggableId={member.id}
                            index={index}
                            isDragDisabled={session.status === 'completed'}
                          >
                            {(provided) => (
                              <ListItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <ListItemText
                                  primary={`${index + 1}. ${member.name}`}
                                  secondary={member.skillLevel}
                                />
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
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

        {/* Settlements (if completed) */}
        {session.status === 'completed' && session.settlements.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thanh toán
                </Typography>
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={session.settlements}
                    columns={settlementColumns}
                    getRowId={(row) => row.memberId}
                    hideFooter
                    disableRowSelectionOnClick
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Complete Session Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Hoàn thành lịch đánh</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Xác nhận hoàn thành lịch đánh. Chi phí sẽ được chia đều cho các thành viên có mặt.
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thành viên có mặt: {session.members.filter(m => m.isPresent).length} người
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

const settlementColumns: GridColDef[] = [
  { 
    field: 'memberName', 
    headerName: 'Tên thành viên', 
    flex: 1,
    minWidth: 200,
  },
  { 
    field: 'amount', 
    headerName: 'Số tiền', 
    width: 150,
    renderCell: (params) => formatCurrency(params.value),
  },
  {
    field: 'isPaid',
    headerName: 'Trạng thái',
    width: 130,
    renderCell: (params) => (
      <Chip
        label={params.value ? 'Đã thanh toán' : 'Chưa thanh toán'}
        color={params.value ? 'success' : 'warning'}
        size="small"
      />
    ),
  },
];

export default SessionDetail;