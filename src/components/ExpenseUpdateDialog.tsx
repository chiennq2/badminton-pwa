import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Avatar,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Cancel,
  AccountBalance,
  SportsTennis,
  Fastfood,
  AttachMoney,
} from '@mui/icons-material';

// Type definitions (copy from your project)
interface SessionExpense {
  id: string;
  name: string;
  amount: number;
  type: 'court' | 'shuttlecock' | 'other';
  description?: string;
  memberIds?: string[];
}

interface SessionExpenseExtended extends SessionExpense {
  memberIds: string[];
}

interface CustomMember {
  id: string;
  name: string;
  isCustom: boolean;
  isWoman: boolean;
  avatar?: string;
}

interface ExpenseUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (expenses: SessionExpense[]) => Promise<void>;
  session: any; // Session type
  members: any[]; // Member type array
  courts: any[]; // Court type array
}

const ExpenseUpdateDialog: React.FC<ExpenseUpdateDialogProps> = ({
  open,
  onClose,
  onSave,
  session,
  members,
  courts,
}) => {
  const [useAutoCourt, setUseAutoCourt] = useState(false);
  const [manualCourtCost, setManualCourtCost] = useState(0);
  const [shuttlecockCount, setShuttlecockCount] = useState(1);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(25000);
  const [expenses, setExpenses] = useState<SessionExpenseExtended[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<CustomMember[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Load data when dialog opens
  useEffect(() => {
    if (open && session) {
      // Load members
      const sessionMembers: CustomMember[] = session.members.map((sm: any) => {
        const member = members?.find((m) => m.id === sm.memberId);
        return {
          id: sm.memberId,
          name: sm.memberName || member?.name || `Member ${sm.memberId.slice(-4)}`,
          isCustom: sm.isCustom || !member,
          isWoman: sm?.isWoman || false,
          avatar: sm.avatar || member?.avatar || '',
        };
      });
      setSelectedMembers(sessionMembers);

      // Load existing expenses
      const courtExpense = session.expenses.find((exp: any) => exp.type === 'court');
      const shuttlecockExpense = session.expenses.find((exp: any) => exp.type === 'shuttlecock');

      if (courtExpense) {
        setManualCourtCost(courtExpense.amount);
        setUseAutoCourt(false);
      }

      if (shuttlecockExpense) {
        const count = parseInt(shuttlecockExpense.description?.split(' ')[0] || '0');
        setShuttlecockCount(count || 1);
        setShuttlecockPrice(count > 0 ? shuttlecockExpense.amount / count : 25000);
      }

      const additionalExpenses: SessionExpenseExtended[] = session.expenses
        .filter((exp: any) => exp.type === 'other')
        .map((exp: any) => ({
          ...exp,
          memberIds: exp.memberIds || sessionMembers.map((m: any) => m.id),
        }));
      setExpenses(additionalExpenses);
    }
  }, [open, session, members]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const calculateSessionDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const addExpense = () => {
    const newExpense: SessionExpenseExtended = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      type: 'other',
      description: '',
      memberIds: selectedMembers.map((m) => m.id),
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (
    id: string,
    field: keyof SessionExpenseExtended,
    value: any
  ) => {
    setExpenses(
      expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const selectedCourt = courts?.find((c) => c.id === session.courtId);
      const duration = calculateSessionDuration(session.startTime, session.endTime);
      const courtCost = useAutoCourt
        ? selectedCourt
          ? selectedCourt.pricePerHour * duration
          : 0
        : manualCourtCost;
      const shuttlecockCost = shuttlecockCount * shuttlecockPrice;

      const sessionExpenses: SessionExpense[] = [
        {
          id: 'court-cost',
          name: 'Tiền sân',
          amount: courtCost,
          type: 'court',
          description: useAutoCourt
            ? `${duration} giờ x ${formatCurrency(selectedCourt?.pricePerHour || 0)}`
            : 'Nhập thủ công',
        },
        {
          id: 'shuttlecock-cost',
          name: 'Tiền cầu',
          amount: shuttlecockCost,
          type: 'shuttlecock',
          description: `${shuttlecockCount} quả x ${formatCurrency(shuttlecockPrice)}`,
        },
        ...expenses.map((exp) => ({
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          type: exp.type,
          description: `Chia cho ${exp.memberIds.length} người`,
          memberIds: exp.memberIds,
        })),
      ];

      await onSave(sessionExpenses);
      setSnackbar({
        open: true,
        message: '✅ Đã cập nhật chi phí thành công!',
        severity: 'success',
      });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving expenses:', error);
      setSnackbar({
        open: true,
        message: '❌ Có lỗi khi cập nhật chi phí',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCourt = courts?.find((c) => c.id === session?.courtId);
  const duration = session ? calculateSessionDuration(session.startTime, session.endTime) : 0;
  const courtCost = useAutoCourt
    ? selectedCourt
      ? selectedCourt.pricePerHour * duration
      : 0
    : manualCourtCost;
  const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
  const additionalCosts = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalCost = courtCost + shuttlecockCost + additionalCosts;
  const presentMembers = selectedMembers.filter((m) => {
    const sessionMember = session?.members.find((sm: any) => sm.memberId === m.id);
    return sessionMember?.isPresent;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Cập nhật chi phí</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Cập nhật chi phí cho lịch đánh. Thay đổi sẽ ảnh hưởng đến thanh toán của các thành viên.
          </Typography>
        </Alert>

        {/* Court Cost */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Tiền sân
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={useAutoCourt}
                    onChange={(e) => setUseAutoCourt(e.target.checked)}
                  />
                }
                label="Tự động tính"
              />
            </Box>

            {useAutoCourt ? (
              <Typography variant="body2" color="text.secondary">
                {duration} giờ x {formatCurrency(selectedCourt?.pricePerHour || 0)} ={' '}
                {formatCurrency(courtCost)}
              </Typography>
            ) : (
              <TextField
                fullWidth
                label="Nhập tiền sân thủ công"
                type="number"
                value={manualCourtCost}
                onChange={(e) => setManualCourtCost(Number(e.target.value))}
                size="small"
                inputProps={{ min: 0 }}
              />
            )}
          </CardContent>
        </Card>

        {/* Shuttlecock Cost */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SportsTennis sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Tiền cầu
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Số lượng quả"
                  type="number"
                  value={shuttlecockCount}
                  onChange={(e) => setShuttlecockCount(Number(e.target.value))}
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Giá mỗi quả"
                  type="number"
                  value={shuttlecockPrice}
                  onChange={(e) => setShuttlecockPrice(Number(e.target.value))}
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tổng: {shuttlecockCount} quả x {formatCurrency(shuttlecockPrice)} ={' '}
              {formatCurrency(shuttlecockCost)}
            </Typography>
          </CardContent>
        </Card>

        {/* Additional Expenses */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Fastfood sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Chi phí bổ sung
                </Typography>
              </Box>
              <Button startIcon={<Add />} onClick={addExpense} size="small">
                Thêm
              </Button>
            </Box>

            {expenses.map((expense) => (
              <Paper
                key={expense.id}
                sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tên chi phí"
                      value={expense.name}
                      onChange={(e) =>
                        updateExpense(expense.id, 'name', e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Số tiền"
                      type="number"
                      value={expense.amount}
                      onChange={(e) =>
                        updateExpense(expense.id, 'amount', Number(e.target.value))
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <IconButton
                      onClick={() => removeExpense(expense.id)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Grid>

                  {/* Member selection */}
                  <Grid item xs={12}>
                    <Typography variant="body2" gutterBottom>
                      Chia tiền cho (chỉ thành viên đã tham gia):
                    </Typography>
                    <Autocomplete
                      multiple
                      options={selectedMembers.filter((m) => {
                        const sessionMember = session?.members.find(
                          (sm: any) => sm.memberId === m.id
                        );
                        return sessionMember;
                      })}
                      getOptionLabel={(option) => option.name}
                      value={selectedMembers.filter((m) =>
                        expense.memberIds.includes(m.id)
                      )}
                      onChange={(_, newValue) => {
                        updateExpense(
                          expense.id,
                          'memberIds',
                          newValue.map((m) => m.id)
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          size="small"
                          placeholder="Chọn thành viên chia tiền"
                          helperText="Chỉ hiển thị thành viên đã tham gia lịch đánh này"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={option.name}
                            size="small"
                            {...getTagProps({ index })}
                            avatar={
                              option.avatar ? (
                                <Avatar src={option.avatar} sx={{ width: 24, height: 24 }} />
                              ) : (
                                <Avatar
                                  sx={{
                                    bgcolor: option.isCustom
                                      ? 'secondary.main'
                                      : 'primary.main',
                                    width: 24,
                                    height: 24,
                                  }}
                                >
                                  {option.name.charAt(0).toUpperCase()}
                                </Avatar>
                              )
                            }
                          />
                        ))
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          {option.avatar ? (
                            <Avatar src={option.avatar} sx={{ mr: 1, width: 24, height: 24 }} />
                          ) : (
                            <Avatar sx={{ mr: 1, width: 24, height: 24 }}>
                              {option.name.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                          <Typography variant="body2">{option.name}</Typography>
                          {option.isCustom && (
                            <Chip
                              label="Tùy chỉnh"
                              size="small"
                              sx={{ ml: 1 }}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      )}
                    />
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {expense.amount > 0 && expense.memberIds.length > 0
                          ? `${formatCurrency(
                              expense.amount / expense.memberIds.length
                            )}/người (${expense.memberIds.length} người)`
                          : 'Chọn thành viên để tính chi phí mỗi người'}
                      </Typography>
                    </Alert>
                  </Grid>
                </Grid>
              </Paper>
            ))}

            {expenses.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                Chưa có chi phí bổ sung nào
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Cost Summary */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Tổng kết chi phí
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Tiền sân:</Typography>
              <Typography>{formatCurrency(courtCost)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Tiền cầu:</Typography>
              <Typography>{formatCurrency(shuttlecockCost)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Chi phí khác:</Typography>
              <Typography>{formatCurrency(additionalCosts)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
              }}
            >
              <Typography fontWeight="bold">Tổng cộng:</Typography>
              <Typography fontWeight="bold" color="primary.main">
                {formatCurrency(totalCost)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Chi phí cơ bản/người (chia đều):
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(
                  presentMembers.length > 0
                    ? (courtCost + shuttlecockCost) / presentMembers.length
                    : 0
                )}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} startIcon={<Cancel />}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={<Save />}
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </DialogActions>

      {/* Snackbar thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ExpenseUpdateDialog;