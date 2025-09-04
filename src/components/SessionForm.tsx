import React, { useState, useEffect } from 'react';
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
  Tab,
  Tabs,
  Divider,
  Paper,
  Avatar,
  ButtonGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Add, Remove, Delete, PersonAdd, Groups, Edit } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import { useCourts, useMembers, useGroups, useCreateSession, useUpdateSession } from '../hooks';
import { Session, SessionExpense, Member, Court, Group } from '../types';
import { formatCurrency, calculateSessionDuration } from '../utils';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSession?: Session | null;
}

interface CustomMember {
  id: string;
  name: string;
  isCustom: boolean;
}

interface SessionExpenseExtended extends SessionExpense {
  memberIds: string[]; // Danh sách member chia tiền
}

const steps = [
  'Thông tin cơ bản',
  'Thành viên tham gia',
  'Sảnh chờ',
  'Chi phí'
];

const SessionForm: React.FC<SessionFormProps> = ({ open, onClose, onSuccess, editingSession }) => {
  const { data: courts } = useCourts();
  const { data: members } = useMembers();
  const { data: groups } = useGroups();
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<CustomMember[]>([]);
  const [waitingList, setWaitingList] = useState<CustomMember[]>([]);
  const [expenses, setExpenses] = useState<SessionExpenseExtended[]>([]);
  const [memberTabValue, setMemberTabValue] = useState(0);
  const [waitingTabValue, setWaitingTabValue] = useState(0);
  const [customMemberName, setCustomMemberName] = useState('');
  const [customWaitingName, setCustomWaitingName] = useState('');

  // Court cost settings
  const [useAutoCourt, setUseAutoCourt] = useState(true);
  const [manualCourtCost, setManualCourtCost] = useState(0);

  // Shuttlecock settings
  const [shuttlecockCount, setShuttlecockCount] = useState(2);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(25000);

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
    Yup.object({}), // Step 2
    Yup.object({}), // Step 3
    Yup.object({}), // Step 4
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
        await handleSaveSession(values);
      }
    },
  });

  // Load editing session data
  useEffect(() => {
    if (editingSession && open) {
      formik.setValues({
        name: editingSession.name,
        courtId: editingSession.courtId,
        date: editingSession.date,
        startTime: editingSession.startTime,
        endTime: editingSession.endTime,
        maxParticipants: editingSession.maxParticipants,
        notes: editingSession.notes || '',
      });

      // Load members
      const sessionMembers = editingSession.members.map(sm => {
        const member = members?.find(m => m.id === sm.memberId);
        return {
          id: sm.memberId,
          name: member?.name || 'Thành viên tùy chỉnh',
          isCustom: !member,
        };
      });
      setSelectedMembers(sessionMembers);

      // Load waiting list
      const waitingMembers = editingSession.waitingList.map(wm => {
        const member = members?.find(m => m.id === wm.memberId);
        return {
          id: wm.memberId,
          name: member?.name || 'Thành viên tùy chỉnh',
          isCustom: !member,
        };
      });
      setWaitingList(waitingMembers);

      // Load expenses
      const sessionExpenses: SessionExpenseExtended[] = editingSession.expenses
        .filter(exp => exp.type !== 'court' && exp.type !== 'shuttlecock')
        .map(exp => ({
          ...exp,
          memberIds: sessionMembers.map(m => m.id), // Default all members
        }));
      setExpenses(sessionExpenses);

      // Load court and shuttlecock settings
      const courtExpense = editingSession.expenses.find(exp => exp.type === 'court');
      const shuttlecockExpense = editingSession.expenses.find(exp => exp.type === 'shuttlecock');
      
      if (courtExpense) {
        setManualCourtCost(courtExpense.amount);
        setUseAutoCourt(courtExpense.amount === 0);
      }
      
      if (shuttlecockExpense) {
        const count = parseInt(shuttlecockExpense.description?.split(' ')[0] || '2');
        setShuttlecockCount(count);
        setShuttlecockPrice(shuttlecockExpense.amount / count);
      }
    }
  }, [editingSession, open, members]);

  const handleSaveSession = async (values: any) => {
    try {
      const selectedCourt = courts?.find(c => c.id === values.courtId);
      if (!selectedCourt) return;

      const duration = calculateSessionDuration(values.startTime, values.endTime);
      const courtCost = useAutoCourt ? selectedCourt.pricePerHour * duration : manualCourtCost;
      const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
      const additionalCosts = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalCost = courtCost + shuttlecockCost + additionalCosts;

      const sessionExpenses: SessionExpense[] = [];
      
      // Add court cost
      if (courtCost > 0) {
        sessionExpenses.push({
          id: 'court-cost',
          name: 'Tiền sân',
          amount: courtCost,
          type: 'court',
          description: useAutoCourt 
            ? `${duration} giờ x ${formatCurrency(selectedCourt.pricePerHour)}`
            : 'Nhập thủ công',
        });
      }

      // Add shuttlecock cost
      if (shuttlecockCost > 0) {
        sessionExpenses.push({
          id: 'shuttlecock-cost',
          name: 'Tiền cầu',
          amount: shuttlecockCost,
          type: 'shuttlecock',
          description: `${shuttlecockCount} quả x ${formatCurrency(shuttlecockPrice)}`,
        });
      }

      // Add additional expenses
      sessionExpenses.push(...expenses.map(exp => ({
        id: exp.id,
        name: exp.name,
        amount: exp.amount,
        type: exp.type,
        description: `Chia cho ${exp.memberIds.length} người`,
      })));

      const baseSharedCost = (courtCost + shuttlecockCost) / Math.max(selectedMembers.length, 1);
      
      const sessionData = {
        name: values.name,
        courtId: values.courtId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        maxParticipants: values.maxParticipants,
        currentParticipants: selectedMembers.length,
        status: editingSession?.status || 'scheduled',
        members: selectedMembers.map(member => ({
          memberId: member.id,
          isPresent: editingSession?.members.find(m => m.memberId === member.id)?.isPresent || false,
        })),
        waitingList: waitingList.map((member, index) => ({
          memberId: member.id,
          addedAt: new Date(),
          priority: index + 1,
        })),
        expenses: sessionExpenses,
        totalCost,
        costPerPerson: baseSharedCost,
        settlements: editingSession?.settlements || [],
        notes: values.notes,
        createdBy: editingSession?.createdBy || 'current-user',
      };

      if (editingSession) {
        await updateSessionMutation.mutateAsync({
          id: editingSession.id,
          data: sessionData,
        });
      } else {
        await createSessionMutation.mutateAsync(sessionData);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving session:', error);
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
    setCustomMemberName('');
    setCustomWaitingName('');
    setUseAutoCourt(true);
    setManualCourtCost(0);
    setShuttlecockCount(2);
    setShuttlecockPrice(25000);
    formik.resetForm();
    onClose();
  };

  const addMemberFromList = (member: Member) => {
    const customMember: CustomMember = {
      id: member.id,
      name: member.name,
      isCustom: false,
    };
    
    if (selectedMembers.length < formik.values.maxParticipants) {
      if (!selectedMembers.some(m => m.id === member.id)) {
        setSelectedMembers([...selectedMembers, customMember]);
      }
    } else {
      if (!waitingList.some(m => m.id === member.id) && !selectedMembers.some(m => m.id === member.id)) {
        setWaitingList([...waitingList, customMember]);
      }
    }
  };

  const addMemberFromGroup = (group: Group) => {
    const groupMembers = members?.filter(member => group.memberIds.includes(member.id)) || [];
    groupMembers.forEach(member => addMemberFromList(member));
  };

  const addCustomMember = () => {
    if (!customMemberName.trim()) return;
    
    const customMember: CustomMember = {
      id: `custom-${Date.now()}`,
      name: customMemberName.trim(),
      isCustom: true,
    };

    if (selectedMembers.length < formik.values.maxParticipants) {
      setSelectedMembers([...selectedMembers, customMember]);
    } else {
      setWaitingList([...waitingList, customMember]);
    }
    
    setCustomMemberName('');
  };

  const addCustomWaitingMember = () => {
    if (!customWaitingName.trim()) return;
    
    const customMember: CustomMember = {
      id: `custom-waiting-${Date.now()}`,
      name: customWaitingName.trim(),
      isCustom: true,
    };

    setWaitingList([...waitingList, customMember]);
    setCustomWaitingName('');
  };

  const removeMember = (member: CustomMember) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
    
    // Move first waiting member to main list if there's space
    if (waitingList.length > 0) {
      const firstWaiting = waitingList[0];
      setWaitingList(waitingList.slice(1));
      setSelectedMembers(prev => [...prev.filter(m => m.id !== member.id), firstWaiting]);
    }
  };

  const removeFromWaitingList = (member: CustomMember) => {
    setWaitingList(waitingList.filter(m => m.id !== member.id));
  };

  const moveFromWaitingToMain = (member: CustomMember) => {
    if (selectedMembers.length >= formik.values.maxParticipants) return;
    
    setWaitingList(waitingList.filter(m => m.id !== member.id));
    setSelectedMembers([...selectedMembers, member]);
  };

  const addExpense = () => {
    const newExpense: SessionExpenseExtended = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      type: 'other',
      description: '',
      memberIds: selectedMembers.map(m => m.id), // Default all members
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (id: string, field: keyof SessionExpenseExtended, value: any) => {
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
              Thành viên tham gia ({selectedMembers.length}/{formik.values.maxParticipants})
            </Typography>

            <Tabs value={memberTabValue} onChange={(_, newValue) => setMemberTabValue(newValue)} sx={{ mb: 2 }}>
              <Tab label="Từ danh sách" />
              <Tab label="Từ nhóm" />
              <Tab label="Tùy chỉnh" />
            </Tabs>

            {memberTabValue === 0 && (
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={members?.filter(member => 
                    member.isActive && 
                    !selectedMembers.some(sm => sm.id === member.id) &&
                    !waitingList.some(wm => wm.id === member.id)
                  ) || []}
                  getOptionLabel={(option) => `${option.name} (${option.skillLevel})`}
                  onChange={(_, value) => {
                    if (value) {
                      addMemberFromList(value);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Chọn từ danh sách thành viên" />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {option.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.skillLevel}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Box>
            )}

            {memberTabValue === 1 && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Chọn nhóm</InputLabel>
                  <Select
                    value=""
                    onChange={(e) => {
                      const group = groups?.find(g => g.id === e.target.value);
                      if (group) {
                        addMemberFromGroup(group);
                      }
                    }}
                    label="Chọn nhóm"
                  >
                    {groups?.map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Groups sx={{ mr: 1 }} />
                          {group.name} ({group.memberIds.length} thành viên)
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {memberTabValue === 2 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Nhập tên thành viên"
                    value={customMemberName}
                    onChange={(e) => setCustomMemberName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCustomMember();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomMember}
                    disabled={!customMemberName.trim()}
                    startIcon={<PersonAdd />}
                  >
                    Thêm
                  </Button>
                </Box>
              </Box>
            )}

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
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={member.name}
                          secondary={member.isCustom ? 'Tùy chỉnh' : 'Từ danh sách'}
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

            <Tabs value={waitingTabValue} onChange={(_, newValue) => setWaitingTabValue(newValue)} sx={{ mb: 2 }}>
              <Tab label="Từ danh sách" />
              <Tab label="Tùy chỉnh" />
            </Tabs>

            {waitingTabValue === 0 && (
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={members?.filter(member => 
                    member.isActive && 
                    !selectedMembers.some(sm => sm.id === member.id) &&
                    !waitingList.some(wm => wm.id === member.id)
                  ) || []}
                  getOptionLabel={(option) => `${option.name} (${option.skillLevel})`}
                  onChange={(_, value) => {
                    if (value) {
                      const customMember: CustomMember = {
                        id: value.id,
                        name: value.name,
                        isCustom: false,
                      };
                      setWaitingList([...waitingList, customMember]);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Thêm vào sảnh chờ từ danh sách" />
                  )}
                />
              </Box>
            )}

            {waitingTabValue === 1 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Nhập tên thành viên chờ"
                    value={customWaitingName}
                    onChange={(e) => setCustomWaitingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCustomWaitingMember();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomWaitingMember}
                    disabled={!customWaitingName.trim()}
                    startIcon={<PersonAdd />}
                  >
                    Thêm
                  </Button>
                </Box>
              </Box>
            )}

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
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {(index + 1)}
                        </Avatar>
                        <ListItemText
                          primary={`${index + 1}. ${member.name}`}
                          secondary={member.isCustom ? 'Tùy chỉnh' : 'Từ danh sách'}
                        />
                        <ListItemSecondaryAction>
                          <ButtonGroup size="small">
                            {selectedMembers.length < formik.values.maxParticipants && (
                              <Button
                                onClick={() => moveFromWaitingToMain(member)}
                                startIcon={<Add />}
                              >
                                Vào danh sách
                              </Button>
                            )}
                            <IconButton
                              onClick={() => removeFromWaitingList(member)}
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </ButtonGroup>
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
        const courtCost = useAutoCourt ? (selectedCourt ? selectedCourt.pricePerHour * duration : 0) : manualCourtCost;
        const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
        const additionalCosts = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalCost = courtCost + shuttlecockCost + additionalCosts;

        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chi phí dự kiến
            </Typography>

            {/* Court Cost */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">Tiền sân</Typography>
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
                    {duration} giờ x {formatCurrency(selectedCourt?.pricePerHour || 0)} = {formatCurrency(courtCost)}
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
                <Typography variant="subtitle1" gutterBottom>
                  Tiền cầu
                </Typography>
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
                  Tổng: {shuttlecockCount} quả x {formatCurrency(shuttlecockPrice)} = {formatCurrency(shuttlecockCost)}
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
                  <Paper key={expense.id} sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
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
                      
                      <Grid item xs={12}>
                        <Typography variant="body2" gutterBottom>
                          Chia tiền cho:
                        </Typography>
                        <Autocomplete
                          multiple
                          options={[...selectedMembers, ...waitingList]}
                          getOptionLabel={(option) => option.name}
                          value={[...selectedMembers, ...waitingList].filter(m => expense.memberIds.includes(m.id))}
                          onChange={(_, newValue) => {
                            updateExpense(expense.id, 'memberIds', newValue.map(m => m.id));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              size="small"
                              placeholder="Chọn thành viên chia tiền"
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option.name}
                                size="small"
                                {...getTagProps({ index })}
                              />
                            ))
                          }
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
                              <Avatar sx={{ mr: 1, width: 24, height: 24 }}>
                                {option.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2">{option.name}</Typography>
                            </Box>
                          )}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {expense.amount > 0 && expense.memberIds.length > 0
                            ? `${formatCurrency(expense.amount / expense.memberIds.length)}/người`
                            : 'Chưa có thành viên nào được chọn'
                          }
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                {expenses.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Chưa có chi phí bổ sung nào
                  </Typography>
                )}
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
                  <Typography>Tiền cầu:</Typography>
                  <Typography>{formatCurrency(shuttlecockCost)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Chi phí khác:</Typography>
                  <Typography>{formatCurrency(additionalCosts)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <Typography fontWeight="bold">Tổng cộng:</Typography>
                  <Typography fontWeight="bold" color="primary.main">
                    {formatCurrency(totalCost)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chi phí cơ bản/người ({selectedMembers.length} người):
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(selectedMembers.length > 0 ? (courtCost + shuttlecockCost) / selectedMembers.length : 0)}
                  </Typography>
                </Box>

                {/* Additional cost breakdown */}
                {expenses.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Chi phí bổ sung:
                    </Typography>
                    {expenses.map((expense) => (
                      <Box key={expense.id} sx={{ display: 'flex', justifyContent: 'space-between', ml: 2, mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {expense.name} ({expense.memberIds.length} người):
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(expense.memberIds.length > 0 ? expense.amount / expense.memberIds.length : 0)}/người
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {editingSession ? 'Chỉnh sửa lịch đánh' : 'Tạo lịch đánh mới'}
      </DialogTitle>
      
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
          disabled={createSessionMutation.isPending || updateSessionMutation.isPending}
        >
          {(createSessionMutation.isPending || updateSessionMutation.isPending) ? (
            <CircularProgress size={20} />
          ) : activeStep === steps.length - 1 ? (
            editingSession ? 'Cập nhật lịch' : 'Tạo lịch'
          ) : (
            'Tiếp theo'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionForm;