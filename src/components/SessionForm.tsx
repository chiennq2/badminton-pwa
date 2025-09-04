import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Add, Remove, Delete } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs, { Dayjs } from 'dayjs';
import { useCourts, useMembers, useCreateSession } from '../hooks';
import { Session, SessionExpense, Member, Court } from '../types';
import { formatCurrency, calculateSessionDuration, calculateSessionCost } from '../utils';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = [
  'Thông tin cơ bản',
  'Chọn thành viên',
  'Sảnh chờ',
  'Chi phí'
];

const SessionForm: React.FC<SessionFormProps> = ({ open, onClose, onSuccess }) => {
  const { data: courts } = useCourts();
  const { data: members } = useMembers();
  const createSessionMutation = useCreateSession();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [waitingList, setWaitingList] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<SessionExpense[]>([]);

  const validationSchemas = [
    // Step 1: Basic Info
    Yup.object({
      name: Yup.string().required('Tên lịch là bắt buộc'),
      courtId: Yup.string().required('Vui lòng chọn sân'),
      date: Yup.date().required('Ngày là bắt buộc'),
      startTime: Yup.string().required('Giờ bắt đầu là bắt buộc'),
      endTime: Yup.string().required('Giờ kết thúc là bắt buộc'),
      maxParticipants: Yup.number()
        .min(2, 'Tối thiểu 2 người')
        .max(20, 'Tối đa 20 người')
        .required('Số người tối đa là bắt buộc'),
    }),
    // Step 2: Members - No validation needed
    Yup.object({}),
    // Step 3: Waiting List - No validation needed
    Yup.object({}),
    // Step 4: Expenses - No validation needed
    Yup.object({}),
  ];

  const formik = useFormik({
    initialValues: {
      name: '',
      courtId: '',
      date: dayjs().add(1, 'day').toDate(),
      startTime: '19:00',
      endTime: '21:00',
      maxParticipants: 8,
      notes: '',
    },
    validationSchema: validationSchemas[activeStep],
    onSubmit: async (values) => {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        await handleCreateSession(values);
      }
    },
  });

  const handleCreateSession = async (values: any) => {
    try {
      const selectedCourt = courts?.find(c => c.id === values.courtId);
      if (!selectedCourt) return;

      const duration = calculateSessionDuration(values.startTime, values.endTime);
      const courtCost = selectedCourt.pricePerHour * duration;
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalCost = courtCost + totalExpenses;

      const sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        courtId: values.courtId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        maxParticipants: values.maxParticipants,
        currentParticipants: selectedMembers.length,
        status: 'scheduled',
        members: selectedMembers.map(member => ({
          memberId: member.id,
          isPresent: false,
        })),
        waitingList: waitingList.map((member, index) => ({
          memberId: member.id,
          addedAt: new Date(),
          priority: index + 1,
        })),
        expenses: [
          {
            id: 'court-cost',
            name: 'Tiền sân',
            amount: courtCost,
            type: 'court',
            description: `${duration} giờ x ${formatCurrency(selectedCourt.pricePerHour)}`,
          },
          ...expenses,
        ],
        totalCost,
        costPerPerson: selectedMembers.length > 0 ? totalCost / selectedMembers.length : 0,
        settlements: [],
        notes: values.notes,
        createdBy: 'current-user', // Will be replaced with actual user ID
      };

      await createSessionMutation.mutateAsync(sessionData);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleNext = () => {
    formik.handleSubmit();
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedMembers([]);
    setWaitingList([]);
    setExpenses([]);
    formik.resetForm();
    onClose();
  };

  const addMember = (member: Member) => {
    if (selectedMembers.length < formik.values.maxParticipants) {
      setSelectedMembers([...selectedMembers, member]);
    } else {
      setWaitingList([...waitingList, member]);
    }
  };

  const removeMember = (member: Member) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
    // Move first waiting member to main list
    if (waitingList.length > 0) {
      const firstWaiting = waitingList[0];
      setWaitingList(waitingList.slice(1));
      setSelectedMembers([...selectedMembers.filter(m => m.id !== member.id), firstWaiting]);
    }
  };

  const removeFromWaitingList = (member: Member) => {
    setWaitingList(waitingList.filter(m => m.id !== member.id));
  };

  const addExpense = () => {
    const newExpense: SessionExpense = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      type: 'other',
      description: '',
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (id: string, field: keyof SessionExpense, value: any) => {
    setExpenses(expenses.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Tên lịch đánh"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Chọn sân</InputLabel>
                  <Select
                    name="courtId"
                    value={formik.values.courtId}
                    onChange={formik.handleChange}
                    label="Chọn sân"
                    error={formik.touched.courtId && Boolean(formik.errors.courtId)}
                  >
                    {courts?.filter(court => court.isActive).map(court => (
                      <MenuItem key={court.id} value={court.id}>
                        {court.name} - {court.location} ({formatCurrency(court.pricePerHour)}/giờ)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Ngày"
                  value={dayjs(formik.values.date)}
                  onChange={(newValue) => {
                    formik.setFieldValue('date', newValue?.toDate());
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.date && Boolean(formik.errors.date),
                      helperText: formik.touched.date && formik.errors.date,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ bắt đầu"
                  value={dayjs(`2000-01-01T${formik.values.startTime}`)}
                  onChange={(newValue) => {
                    formik.setFieldValue('startTime', newValue?.format('HH:mm'));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.startTime && Boolean(formik.errors.startTime),
                      helperText: formik.touched.startTime && formik.errors.startTime,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ kết thúc"
                  value={dayjs(`2000-01-01T${formik.values.endTime}`)}
                  onChange={(newValue) => {
                    formik.setFieldValue('endTime', newValue?.format('HH:mm'));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.endTime && Boolean(formik.errors.endTime),
                      helperText: formik.touched.endTime && formik.errors.endTime,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="maxParticipants"
                  label="Số người tối đa"
                  type="number"
                  value={formik.values.maxParticipants}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.maxParticipants && Boolean(formik.errors.maxParticipants)}
                  helperText={formik.touched.maxParticipants && formik.errors.maxParticipants}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Ghi chú"
                  multiline
                  rows={3}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chọn thành viên tham gia ({selectedMembers.length}/{formik.values.maxParticipants})
            </Typography>
            
            <Autocomplete
              options={members?.filter(member => 
                member.isActive && 
                !selectedMembers.some(sm => sm.id === member.id) &&
                !waitingList.some(wm => wm.id === member.id)
              ) || []}
              getOptionLabel={(option) => `${option.name} (${option.skillLevel})`}
              onChange={(_, value) => {
                if (value) {
                  addMember(value);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Tìm và thêm thành viên" />
              )}
              sx={{ mb: 2 }}
            />

            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Danh sách tham gia
                </Typography>
                {selectedMembers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có thành viên nào được chọn
                  </Typography>
                ) : (
                  <List dense>
                    {selectedMembers.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={member.name}
                          secondary={member.skillLevel}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => removeMember(member)}
                            size="small"
                          >
                            <Remove />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sảnh chờ ({waitingList.length} người)
            </Typography>
            
            <Autocomplete
              options={members?.filter(member => 
                member.isActive && 
                !selectedMembers.some(sm => sm.id === member.id) &&
                !waitingList.some(wm => wm.id === member.id)
              ) || []}
              getOptionLabel={(option) => `${option.name} (${option.skillLevel})`}
              onChange={(_, value) => {
                if (value) {
                  setWaitingList([...waitingList, value]);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Thêm vào sảnh chờ" />
              )}
              sx={{ mb: 2 }}
            />

            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Danh sách chờ
                </Typography>
                {waitingList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sảnh chờ trống
                  </Typography>
                ) : (
                  <List dense>
                    {waitingList.map((member, index) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={`${index + 1}. ${member.name}`}
                          secondary={member.skillLevel}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => removeFromWaitingList(member)}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 3:
        const selectedCourt = courts?.find(c => c.id === formik.values.courtId);
        const duration = calculateSessionDuration(formik.values.startTime, formik.values.endTime);
        const courtCost = selectedCourt ? selectedCourt.pricePerHour * duration : 0;
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalCost = courtCost + totalExpenses;

        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chi phí dự kiến
            </Typography>

            {/* Court Cost */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Tiền sân
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {duration} giờ x {formatCurrency(selectedCourt?.pricePerHour || 0)} = {formatCurrency(courtCost)}
                </Typography>
              </CardContent>
            </Card>

            {/* Additional Expenses */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    Chi phí bổ sung
                  </Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={addExpense}
                    size="small"
                  >
                    Thêm
                  </Button>
                </Box>

                {expenses.map((expense) => (
                  <Grid container spacing={2} key={expense.id} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tên chi phí"
                        value={expense.name}
                        onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Số tiền"
                        type="number"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, 'amount', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Loại</InputLabel>
                        <Select
                          value={expense.type}
                          onChange={(e) => updateExpense(expense.id, 'type', e.target.value)}
                          label="Loại"
                        >
                          <MenuItem value="shuttlecock">Tiền cầu</MenuItem>
                          <MenuItem value="other">Khác</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton
                        onClick={() => removeExpense(expense.id)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Tổng kết chi phí
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tiền sân:</Typography>
                  <Typography>{formatCurrency(courtCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Chi phí khác:</Typography>
                  <Typography>{formatCurrency(totalExpenses)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography fontWeight="bold">Tổng cộng:</Typography>
                  <Typography fontWeight="bold">{formatCurrency(totalCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chi phí/người ({selectedMembers.length} người):
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(selectedMembers.length > 0 ? totalCost / selectedMembers.length : 0)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Tạo lịch đánh mới</DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep !== 0 && (
          <Button onClick={handleBack}>Quay lại</Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={createSessionMutation.isPending}
        >
          {createSessionMutation.isPending ? (
            <CircularProgress size={20} />
          ) : activeStep === steps.length - 1 ? (
            'Tạo lịch'
          ) : (
            'Tiếp theo'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionForm;