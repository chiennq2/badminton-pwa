// src/components/TournamentForm.tsx

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
  Chip,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  Checkbox,
  FormControlLabel,
  IconButton,
  Alert,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Member, Court } from '../types';
import { Tournament, TournamentCategory, PotLevel, TournamentParticipant, TournamentFormat } from '../types/tournament';
import { getCategoryName, POT_LEVELS } from '../utils/tournamentUtils';
import { transformUrl } from '../utils';

interface TournamentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tournament: Partial<Tournament>) => void;
  members: Member[];
  courts: Court[];
  editTournament?: Tournament;
}

const STEPS = ['Thông Tin', 'Nội Dung', 'Thành Viên', 'Cài Đặt'];

const CATEGORIES: TournamentCategory[] = [
  'men-singles',
  'women-singles',
  'men-doubles',
  'women-doubles',
  'mixed-doubles',
];

const TournamentForm: React.FC<TournamentFormProps> = ({
  open,
  onClose,
  onSubmit,
  members,
  courts,
  editTournament,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Tournament>>({
    name: '',
    description: '',
    format: 'single-elimination',
    categories: [],
    startDate: new Date(),
    endDate: new Date(),
    registrationDeadline: new Date(),
    location: '',
    courtIds: [],
    participants: [],
    maxParticipants: undefined,
    entryFee: undefined,
    status: 'draft',
  });

  const [customParticipant, setCustomParticipant] = useState({
    name: '',
    potLevel: 'Pot 3' as PotLevel,
    isWoman: false,
  });

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (editTournament) {
      setFormData(editTournament);
      setSelectedMemberIds(editTournament.participants.filter(p => !p.isCustom).map(p => p.memberId!));
    }
  }, [editTournament]);

  // Reset form khi đóng
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setFormData({
        name: '',
        description: '',
        format: 'single-elimination',
        categories: [],
        startDate: new Date(),
        endDate: new Date(),
        registrationDeadline: new Date(),
        location: '',
        courtIds: [],
        participants: [],
        maxParticipants: undefined,
        entryFee: undefined,
        status: 'draft',
      });
      setSelectedMemberIds([]);
      setCustomParticipant({
        name: '',
        potLevel: 'Pot 3',
        isWoman: false,
      });
    }
  }, [open]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleMemberToggle = (member: Member) => {
    const isSelected = selectedMemberIds.includes(member.id);
    
    if (isSelected) {
      // Remove member
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
      setFormData({
        ...formData,
        participants: formData.participants!.filter(p => p.memberId !== member.id),
      });
    } else {
      // Add member
      setSelectedMemberIds([...selectedMemberIds, member.id]);
      
      // Tự động gán TẤT CẢ categories đã chọn cho participant
      const applicableCategories = getApplicableCategoriesForMember(member);
      
      const newParticipant: TournamentParticipant = {
        id: `participant_${member.id}`,
        name: member.name,
        isCustom: false,
        memberId: member.id,
        potLevel: member.skillLevel,
        isWoman: member.isWoman || false,
        categories: applicableCategories, // Tự động gán tất cả categories phù hợp
        avatar: member.avatar,
        email: member.email,
        phone: member.phone,
      };
      
      setFormData({
        ...formData,
        participants: [...(formData.participants || []), newParticipant],
      });
    }
  };

  // Lấy danh sách categories phù hợp với member
  const getApplicableCategoriesForMember = (member: Member): TournamentCategory[] => {
    const applicable: TournamentCategory[] = [];
    const selectedCategories = formData.categories || [];
    
    selectedCategories.forEach(cat => {
      if (cat === 'men-singles' && !member.isWoman) {
        applicable.push(cat);
      } else if (cat === 'women-singles' && member.isWoman) {
        applicable.push(cat);
      } else if (cat === 'men-doubles' && !member.isWoman) {
        applicable.push(cat);
      } else if (cat === 'women-doubles' && member.isWoman) {
        applicable.push(cat);
      } else if (cat === 'mixed-doubles') {
        // Mixed doubles: tất cả đều có thể tham gia
        applicable.push(cat);
      }
    });
    
    return applicable;
  };

  const handleAddCustomParticipant = () => {
    if (!customParticipant.name) return;
    
    // Tự động gán tất cả categories phù hợp
    const applicableCategories: TournamentCategory[] = [];
    const selectedCategories = formData.categories || [];
    
    selectedCategories.forEach(cat => {
      if (cat === 'men-singles' && !customParticipant.isWoman) {
        applicableCategories.push(cat);
      } else if (cat === 'women-singles' && customParticipant.isWoman) {
        applicableCategories.push(cat);
      } else if (cat === 'men-doubles' && !customParticipant.isWoman) {
        applicableCategories.push(cat);
      } else if (cat === 'women-doubles' && customParticipant.isWoman) {
        applicableCategories.push(cat);
      } else if (cat === 'mixed-doubles') {
        applicableCategories.push(cat);
      }
    });
    
    const newParticipant: TournamentParticipant = {
      id: `custom_${Date.now()}`,
      name: customParticipant.name,
      isCustom: true,
      potLevel: customParticipant.potLevel,
      isWoman: customParticipant.isWoman,
      categories: applicableCategories,
    };
    
    setFormData({
      ...formData,
      participants: [...(formData.participants || []), newParticipant],
    });
    
    // Reset form
    setCustomParticipant({
      name: '',
      potLevel: 'Pot 3',
      isWoman: false,
    });
  };

  const handleRemoveParticipant = (participantId: string) => {
    setFormData({
      ...formData,
      participants: formData.participants!.filter(p => p.id !== participantId),
    });
    
    // Nếu là member thì cũng remove khỏi selectedMemberIds
    const participant = formData.participants!.find(p => p.id === participantId);
    if (participant && !participant.isCustom) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== participant.memberId));
    }
  };

  // Khi categories thay đổi, tự động cập nhật categories cho tất cả participants
  const handleCategoriesChange = (newCategories: TournamentCategory[]) => {
    setFormData({
      ...formData,
      categories: newCategories,
      // Cập nhật lại categories cho tất cả participants hiện có
      participants: formData.participants?.map(p => {
        const applicable: TournamentCategory[] = [];
        
        newCategories.forEach(cat => {
          if (cat === 'men-singles' && !p.isWoman) {
            applicable.push(cat);
          } else if (cat === 'women-singles' && p.isWoman) {
            applicable.push(cat);
          } else if (cat === 'men-doubles' && !p.isWoman) {
            applicable.push(cat);
          } else if (cat === 'women-doubles' && p.isWoman) {
            applicable.push(cat);
          } else if (cat === 'mixed-doubles') {
            applicable.push(cat);
          }
        });
        
        return { ...p, categories: applicable };
      }) || [],
    });
  };

  const getPotColor = (pot: PotLevel): string => {
    const colors: Record<PotLevel, string> = {
      'Pot 1': '#ffd700',
      'Pot 2': '#c0c0c0',
      'Pot 3': '#cd7f32',
      'Pot 4': '#8b4513',
      'Pot 5': '#696969',
    };
    return colors[pot];
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Thông tin cơ bản
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên Giải Đấu"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="VD: Giải Cầu Lông Mùa Hè 2025"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô Tả"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Thông tin chi tiết về giải đấu..."
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Thể Thức Thi Đấu</FormLabel>
                <RadioGroup
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as TournamentFormat })}
                >
                  <FormControlLabel value="single-elimination" control={<Radio />} label="Loại Trực Tiếp (Single Elimination)" />
                  <FormControlLabel value="round-robin" control={<Radio />} label="Vòng Tròn (Round Robin)" />
                  <FormControlLabel value="mixed" control={<Radio />} label="Kết Hợp (Vòng Bảng + Loại Trực Tiếp)" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Ngày Bắt Đầu"
                value={dayjs(formData.startDate)}
                onChange={(date) => setFormData({ ...formData, startDate: date?.toDate() || new Date() })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Ngày Kết Thúc"
                value={dayjs(formData.endDate)}
                onChange={(date) => setFormData({ ...formData, endDate: date?.toDate() || new Date() })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DatePicker
                label="Hạn Đăng Ký"
                value={dayjs(formData.registrationDeadline)}
                onChange={(date) => setFormData({ ...formData, registrationDeadline: date?.toDate() || new Date() })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Địa Điểm"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="VD: Nhà thi đấu Quận 1"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sân Thi Đấu</InputLabel>
                <Select
                  multiple
                  value={formData.courtIds || []}
                  onChange={(e) => setFormData({ ...formData, courtIds: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => {
                        const court = courts.find(c => c.id === id);
                        return <Chip key={id} label={court?.name} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {courts.map((court) => (
                    <MenuItem key={court.id} value={court.id}>
                      <Checkbox checked={(formData.courtIds || []).includes(court.id)} />
                      {court.name} - {court.location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1: // Nội dung thi đấu
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Chọn các nội dung thi đấu sẽ diễn ra trong giải này. Khi thêm thành viên, họ sẽ tự động được đăng ký vào các nội dung phù hợp.
              </Alert>
            </Grid>

            {CATEGORIES.map((category) => (
              <Grid item xs={12} sm={6} key={category}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: (formData.categories || []).includes(category) ? 2 : 1,
                    borderColor: (formData.categories || []).includes(category) ? 'primary.main' : 'divider',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => {
                    const categories = (formData.categories || []).includes(category)
                      ? (formData.categories || []).filter(c => c !== category)
                      : [...(formData.categories || []), category];
                    handleCategoriesChange(categories);
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <EmojiEventsIcon color={(formData.categories || []).includes(category) ? 'primary' : 'disabled'} />
                      <Box>
                        <Typography variant="h6">{getCategoryName(category)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.includes('doubles') ? 'Thi đấu đôi' : 'Thi đấu đơn'}
                        </Typography>
                      </Box>
                      {(formData.categories || []).includes(category) && (
                        <Chip label="✓" color="primary" size="small" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 2: // Thành viên
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="success">
                Đã chọn: <strong>{formData.participants?.length || 0}</strong> người. 
                Họ sẽ tự động tham gia các nội dung phù hợp với giới tính.
              </Alert>
            </Grid>

            {/* Thêm thủ công */}
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  + Thêm Người Chơi Thủ Công
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tên"
                      value={customParticipant.name}
                      onChange={(e) => setCustomParticipant({ ...customParticipant, name: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Pot Level</InputLabel>
                      <Select
                        value={customParticipant.potLevel}
                        onChange={(e) => setCustomParticipant({ ...customParticipant, potLevel: e.target.value as PotLevel })}
                      >
                        {POT_LEVELS.map(pot => (
                          <MenuItem key={pot} value={pot}>{pot}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={customParticipant.isWoman}
                          onChange={(e) => setCustomParticipant({ ...customParticipant, isWoman: e.target.checked })}
                        />
                      }
                      label="Nữ"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddCustomParticipant}
                      disabled={!customParticipant.name}
                    >
                      Thêm
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Danh sách members */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Danh Sách Thành Viên
              </Typography>
              <Grid container spacing={2}>
                {members.filter(m => m.isActive).map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  const applicableCategories = getApplicableCategoriesForMember(member);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={member.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          '&:hover': { boxShadow: 2 },
                        }}
                        onClick={() => handleMemberToggle(member)}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                          <Avatar
                            src={transformUrl(member.avatar)}
                            sx={{ bgcolor: getPotColor(member.skillLevel) }}
                          >
                            {member.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {member.name}
                            </Typography>
                            <Chip
                              label={member.skillLevel}
                              size="small"
                              sx={{
                                backgroundColor: getPotColor(member.skillLevel),
                                color: 'white',
                                fontSize: '0.7rem',
                              }}
                            />
                            {applicableCategories.length > 0 && (
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                → {applicableCategories.map(c => getCategoryName(c)).join(', ')}
                              </Typography>
                            )}
                          </Box>
                          {isSelected && (
                            <Chip label="✓" color="primary" size="small" />
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>

            {/* Danh sách đã chọn */}
            {formData.participants && formData.participants.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Người Đã Chọn ({formData.participants.length})
                </Typography>
                <Grid container spacing={2}>
                  {formData.participants.map((participant) => (
                    <Grid item xs={12} key={participant.id}>
                      <Card variant="outlined">
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                          <Avatar
                            src={transformUrl(participant.avatar)}
                            sx={{ bgcolor: getPotColor(participant.potLevel) }}
                          >
                            {participant.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {participant.name}
                              {participant.isCustom && <Chip label="Thủ công" size="small" sx={{ ml: 1 }} />}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={participant.potLevel}
                                size="small"
                                sx={{ backgroundColor: getPotColor(participant.potLevel), color: 'white' }}
                              />
                              {participant.isWoman && <Chip label="Nữ" size="small" color="secondary" />}
                              {participant.categories.map(cat => (
                                <Chip key={cat} label={getCategoryName(cat)} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveParticipant(participant.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
          </Grid>
        );

      case 3: // Cài đặt
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Số Người Tối Đa (tùy chọn)"
                value={formData.maxParticipants || ''}
                onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Lệ Phí (VNĐ, tùy chọn)"
                value={formData.entryFee || ''}
                onChange={(e) => setFormData({ ...formData, entryFee: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quy Định / Ghi Chú"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                multiline
                rows={5}
                placeholder="VD: Thể lệ thi đấu, quy định về trang phục, thời gian báo danh..."
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="success">
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Tóm tắt giải đấu:</strong>
                </Typography>
                <Typography variant="body2">
                  • Tên: {formData.name || 'Chưa đặt tên'}<br />
                  • Thể thức: {formData.format === 'single-elimination' ? 'Loại trực tiếp' : formData.format === 'round-robin' ? 'Vòng tròn' : 'Kết hợp'}<br />
                  • Nội dung: {(formData.categories || []).map(c => getCategoryName(c)).join(', ') || 'Chưa chọn'}<br />
                  • Số người: {formData.participants?.length || 0} người<br />
                  • Thời gian: {dayjs(formData.startDate).format('DD/MM/YYYY')} - {dayjs(formData.endDate).format('DD/MM/YYYY')}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon color="primary" />
            <Typography variant="h6">
              {editTournament ? 'Chỉnh Sửa Giải Đấu' : 'Tạo Giải Đấu Mới'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack}>Quay Lại</Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Tiếp Theo
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              !formData.name ||
              !(formData.categories?.length) ||
              !(formData.participants?.length)
            }
          >
            {editTournament ? 'Cập Nhật' : 'Tạo Giải Đấu'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TournamentForm;