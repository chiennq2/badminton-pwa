// components/TournamentForm.tsx

import React, { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import {
  Tournament,
  TournamentFormat,
  TournamentCategory,
  TournamentParticipant,
  PotLevel,
} from '../types/tournament';
import {
  createTournament,
  updateTournament,
} from '../services/tournamentService';
import { useAuth } from '../contexts/AuthContext';
import { useCourts, useMembers } from '../hooks';

interface Props {
  tournament: Tournament | null;
  onClose: () => void;
}

const categoryOptions: { value: TournamentCategory; label: string }[] = [
  { value: 'men_singles', label: 'Đơn Nam' },
  { value: 'women_singles', label: 'Đơn Nữ' },
  { value: 'men_doubles', label: 'Đôi Nam' },
  { value: 'women_doubles', label: 'Đôi Nữ' },
  { value: 'mixed_doubles', label: 'Đôi Nam-Nữ' },
];

const formatOptions: { value: TournamentFormat; label: string; description: string }[] = [
  { value: 'single_elimination', label: 'Loại trực tiếp', description: 'Thua 1 trận là bị loại' },
  { value: 'round_robin', label: 'Vòng tròn', description: 'Đấu tất cả đối thủ trong bảng' },
  { value: 'mixed', label: 'Kết hợp', description: 'Vòng bảng + loại trực tiếp' },
];

const steps = ['Thông tin cơ bản', 'Chọn thành viên', 'Xác nhận'];

const TournamentForm: React.FC<Props> = ({ tournament, onClose }) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);

  // Form state - Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('single_elimination');
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().add(2, 'day'));
  const [registrationDeadline, setRegistrationDeadline] = useState<Dayjs | null>(dayjs().add(7, 'day'));
  const [venue, setVenue] = useState('');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(32);
  const [registrationFee, setRegistrationFee] = useState(0);
  
  // Fetch data
  const { data: courts } = useCourts();
  const { data: members } = useMembers();

  // Participants selection
  const [selectedParticipants, setSelectedParticipants] = useState<TournamentParticipant[]>([]);
  const [manualParticipants, setManualParticipants] = useState<{
    name: string;
    potLevel: PotLevel;
    categories: TournamentCategory[];
  }[]>([]);


  // Initialize form with existing tournament data
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDescription(tournament.description || '');
      setFormat(tournament.format);
      setCategories(tournament.categories);
      setStartDate(dayjs(tournament.startDate));
      setEndDate(dayjs(tournament.endDate));
      setRegistrationDeadline(dayjs(tournament.registrationDeadline));
      setVenue(tournament.venue);
      setSelectedCourtIds(tournament.courtIds);
      setMaxParticipants(tournament.maxParticipantsPerCategory || 32);
      setRegistrationFee(tournament.registrationFee || 0);
      setSelectedParticipants(tournament.participants);
    }
  }, [tournament]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tournament> }) =>
      updateTournament(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      onClose();
    },
  });

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    const tournamentData = {
      name,
      description,
      format,
      categories,
      startDate: startDate!.toDate(),
      endDate: endDate!.toDate(),
      registrationDeadline: registrationDeadline!.toDate(),
      venue,
      courtIds: selectedCourtIds,
      participants: selectedParticipants,
      teams: [],
      matches: [],
      maxParticipantsPerCategory: maxParticipants,
      registrationFee,
      status: 'draft' as const,
      createdBy: currentUser?.id || '',
    };

    if (tournament) {
      updateMutation.mutate({ id: tournament.id, data: tournamentData });
    } else {
      createMutation.mutate(tournamentData as any);
    }
  };

  const handleToggleMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const existing = selectedParticipants.find((p) => p.memberId === memberId);
    if (existing) {
      setSelectedParticipants(selectedParticipants.filter((p) => p.memberId !== memberId));
    } else {
      // Map skill level to pot level
      const potLevelMap: Record<string, PotLevel> = {
        'Pot 1': 1,
        'Pot 2': 2,
        'Pot 3': 3,
        'Pot 4': 4,
        'Pot 5': 5,
      };

      setSelectedParticipants([
        ...selectedParticipants,
        {
          id: `participant_${memberId}_${Date.now()}`,
          memberId,
          memberName: member.name,
          potLevel: potLevelMap[member.skillLevel] || 3,
          email: member.email,
          phone: member.phone,
          registeredAt: new Date(),
          categories: [...categories],
        },
      ]);
    }
  };

  const handleAddManualParticipant = () => {
    setManualParticipants([
      ...manualParticipants,
      { name: '', potLevel: 3, categories: [...categories] },
    ]);
  };

  const handleRemoveManualParticipant = (index: number) => {
    setManualParticipants(manualParticipants.filter((_, i) => i !== index));
  };

  const handleUpdateManualParticipant = (
    index: number,
    field: keyof typeof manualParticipants[0],
    value: any
  ) => {
    const updated = [...manualParticipants];
    updated[index] = { ...updated[index], [field]: value };
    setManualParticipants(updated);
  };

  const handleConfirmManualParticipants = () => {
    const newParticipants = manualParticipants
      .filter((p) => p.name.trim() !== '' && p.categories.length > 0)
      .map((p, idx) => ({
        id: `manual_${Date.now()}_${idx}`,
        memberId: `manual_${Date.now()}_${idx}`,
        memberName: p.name,
        potLevel: p.potLevel,
        registeredAt: new Date(),
        categories: p.categories,
      }));

    setSelectedParticipants([...selectedParticipants, ...newParticipants]);
    setManualParticipants([]);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setSelectedParticipants(selectedParticipants.filter((p) => p.id !== participantId));
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return (
          name.trim() !== '' &&
          categories.length > 0 &&
          startDate &&
          endDate &&
          registrationDeadline &&
          venue.trim() !== '' &&
          selectedCourtIds.length > 0
        );
      case 1:
        return selectedParticipants.length >= 2;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      <DialogTitle>
        {tournament ? 'Chỉnh sửa giải đấu' : 'Tạo giải đấu mới'}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Basic Info */}
        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên giải đấu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="VD: Giải Cầu Lông Mùa Hè 2025"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô tả"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                placeholder="Mô tả về giải đấu, điều kiện tham gia, giải thưởng..."
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Thể thức</InputLabel>
                <Select value={format} onChange={(e) => setFormat(e.target.value as TournamentFormat)}>
                  {formatOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box>
                        <Typography variant="body1">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Nội dung thi đấu</InputLabel>
                <Select
                  multiple
                  value={categories}
                  onChange={(e) => setCategories(e.target.value as TournamentCategory[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={categoryOptions.find((o) => o.value === value)?.label}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {categoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Ngày bắt đầu"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Ngày kết thúc"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate || undefined}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DatePicker
                label="Hạn đăng ký"
                value={registrationDeadline}
                onChange={setRegistrationDeadline}
                maxDate={startDate || undefined}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Địa điểm"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
                placeholder="VD: Sân Cầu Lông Trần Phú"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Sân thi đấu</InputLabel>
                <Select
                  multiple
                  value={selectedCourtIds}
                  onChange={(e) => setSelectedCourtIds(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => (
                        <Chip
                          key={id}
                          label={courts.find((c) => c.id === id)?.name}
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                >
                  {courts.map((court) => (
                    <MenuItem key={court.id} value={court.id}>
                      {court.name} - {court.location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số người tối đa/nội dung"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                inputProps={{ min: 4, max: 128, step: 4 }}
                helperText="Nên là số chẵn và lũy thừa của 2 (8, 16, 32, 64)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lệ phí đăng ký (VNĐ)"
                type="number"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(Number(e.target.value))}
                inputProps={{ min: 0, step: 10000 }}
                helperText="Để 0 nếu miễn phí"
              />
            </Grid>
          </Grid>
        )}

        {/* Step 2: Select Participants */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Chọn thành viên tham gia
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Đã chọn: <strong>{selectedParticipants.length} người</strong>
              {' • '}
              Tối thiểu: <strong>2 người</strong>
              {' • '}
              Tối đa: <strong>{maxParticipants} người/nội dung</strong>
            </Alert>

            {/* Selected participants list */}
            {selectedParticipants.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Danh sách đã chọn:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedParticipants.map((p) => (
                    <Chip
                      key={p.id}
                      label={`${p.memberName} (Pot ${p.potLevel})`}
                      onDelete={() => handleRemoveParticipant(p.id)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Từ danh sách thành viên
            </Typography>
            <Grid container spacing={2}>
              {members.map((member) => {
                const isSelected = selectedParticipants.some((p) => p.memberId === member.id);
                return (
                  <Grid item xs={12} sm={6} md={4} key={member.id}>
                    <Box
                      sx={{
                        p: 2,
                        border: 2,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'primary.light' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          bgcolor: isSelected ? 'primary.light' : 'action.hover',
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => handleToggleMember(member.id)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}>
                          {member.name}
                        </Typography>
                        {isSelected && (
                          <Chip label="✓" size="small" color="primary" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {member.skillLevel}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Hoặc thêm thủ công
              </Typography>
              <Button 
                onClick={handleAddManualParticipant} 
                variant="outlined" 
                size="small"
                sx={{ mb: 2 }}
              >
                + Thêm người chơi
              </Button>

              {manualParticipants.map((p, idx) => (
                <Grid container spacing={2} key={idx} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      label="Tên"
                      size="small"
                      value={p.name}
                      onChange={(e) => handleUpdateManualParticipant(idx, 'name', e.target.value)}
                      placeholder="Nhập tên người chơi"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Pot Level</InputLabel>
                      <Select
                        value={p.potLevel}
                        onChange={(e) => handleUpdateManualParticipant(idx, 'potLevel', e.target.value)}
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <MenuItem key={level} value={level}>
                            Pot {level} {level === 1 && '(Cao nhất)'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Nội dung</InputLabel>
                      <Select
                        multiple
                        value={p.categories}
                        onChange={(e) => handleUpdateManualParticipant(idx, 'categories', e.target.value)}
                        renderValue={(selected) => `${selected.length} nội dung`}
                      >
                        {categoryOptions.map((cat) => (
                          <MenuItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <Button
                      color="error"
                      size="small"
                      fullWidth
                      onClick={() => handleRemoveManualParticipant(idx)}
                      sx={{ height: '40px' }}
                    >
                      Xóa
                    </Button>
                  </Grid>
                </Grid>
              ))}

              {manualParticipants.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    onClick={handleConfirmManualParticipants}
                    variant="contained"
                    size="small"
                    disabled={manualParticipants.some((p) => !p.name.trim() || p.categories.length === 0)}
                  >
                    Xác nhận thêm {manualParticipants.length} người
                  </Button>
                  <Button
                    onClick={() => setManualParticipants([])}
                    variant="outlined"
                    color="error"
                    size="small"
                  >
                    Hủy tất cả
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Step 3: Confirmation */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Xác nhận thông tin giải đấu
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Vui lòng kiểm tra kỹ thông tin trước khi tạo giải đấu
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tên giải đấu
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {name}
                </Typography>

                {description && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                      Mô tả
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      {description}
                    </Typography>
                  </>
                )}

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Thể thức
                </Typography>
                <Chip 
                  label={formatOptions.find((f) => f.value === format)?.label}
                  color="primary"
                  size="small"
                />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Nội dung thi đấu
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {categories.map((cat) => (
                    <Chip
                      key={cat}
                      label={categoryOptions.find((c) => c.value === cat)?.label}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Thời gian
                </Typography>
                <Typography variant="body1" gutterBottom>
                  📅 {startDate?.format('DD/MM/YYYY')} - {endDate?.format('DD/MM/YYYY')}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Hạn đăng ký
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ⏰ {registrationDeadline?.format('DD/MM/YYYY')}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Địa điểm
                </Typography>
                <Typography variant="body1" gutterBottom>
                  📍 {venue}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Sân thi đấu
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {selectedCourtIds.map((id) => (
                    <Chip
                      key={id}
                      label={courts.find((c) => c.id === id)?.name}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Số lượng thành viên
                </Typography>
                <Typography variant="h4" color="primary">
                  {selectedParticipants.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  người đã đăng ký
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Giới hạn
                </Typography>
                <Typography variant="h4">
                  {maxParticipants}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  người/nội dung
                </Typography>
              </Grid>

              {registrationFee > 0 && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Lệ phí đăng ký
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {registrationFee.toLocaleString('vi-VN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    VNĐ/người
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={createMutation.isPending || updateMutation.isPending}>
          Hủy
        </Button>
        {activeStep > 0 && (
          <Button 
            onClick={handleBack}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Quay lại
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!isStepValid()}
          >
            Tiếp theo
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="success"
            disabled={!isStepValid() || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Đang lưu...'
              : tournament
              ? '✓ Cập nhật giải đấu'
              : '✓ Tạo giải đấu'}
          </Button>
        )}
      </DialogActions>
    </>
  );
};

export default TournamentForm;