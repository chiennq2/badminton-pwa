import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Paper,
  Avatar,
  Grid,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ButtonGroup,
  Autocomplete,
} from '@mui/material';
import {
  SwapHoriz,
  Close,
  ExitToApp,
  CheckCircle,
  HourglassEmpty,
  Schedule,
  ExpandMore,
  Female,
  Male,
  Done,
  Edit,
  PersonAdd,
  Add,
  Delete,
  DragHandle,
} from '@mui/icons-material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { CustomMember, Member, Session } from '../types';
import { transformUrl } from '../utils';


interface SessionDetailPassListProps {
  session: Session;
  onUpdate: () => void;
  onRollCallChange: (data: { memberId: string; isPresent: boolean }) => void;
  onSexChange: (data: { memberId: string; isWoman: boolean }) => void;
  onMarkAllPresent?: () => void;
  members?: Member[]; // Thêm prop members
  updateSessionMutation?: any; // Thêm prop mutation
}

// Component Droppable hỗ trợ Strict Mode
const StrictModeDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

const SessionDetailPassList: React.FC<SessionDetailPassListProps> = ({
  session,
  onUpdate,
  onRollCallChange,
  onSexChange,
  onMarkAllPresent,
  members = [],
  updateSessionMutation,
}) => {
  const [passWaitingList, setPassWaitingList] = useState<string[]>(
    session.passWaitingList || []
  );
  const [editWaitingDialogOpen, setEditWaitingDialogOpen] = useState(false);
  const [localWaitingList, setLocalWaitingList] = useState<CustomMember[]>([]);
  const [waitingTabValue, setWaitingTabValue] = useState(0);
  const [customWaitingName, setCustomWaitingName] = useState('');
  const [customWaitingIsWoman, setCustomWaitingIsWoman] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const isMobile = window.innerWidth < 600;

  useEffect(() => {
    setPassWaitingList(session.passWaitingList || []);
  }, [session.passWaitingList]);

  // Khởi tạo localWaitingList khi mở dialog
  useEffect(() => {
    if (editWaitingDialogOpen) {
      const waitingMembers: CustomMember[] = session.waitingList.map((wm) => {
        const member = members?.find((m) => m.id === wm.memberId);
        return {
          id: wm.memberId,
          name: wm.memberName || member?.name || `Member ${wm.memberId.slice(-4)}`,
          isCustom: wm.isCustom || !member,
          isWoman: wm.isWoman || false,
          avatar: wm.avatar || member?.avatar || '',
        };
      });
      setLocalWaitingList(waitingMembers);
    }
  }, [editWaitingDialogOpen, session.waitingList, members]);

  const handleTogglePassWaiting = async (memberId: string) => {
    const newPassWaitingList = passWaitingList.includes(memberId)
      ? passWaitingList.filter((id) => id !== memberId)
      : [...passWaitingList, memberId];

    setPassWaitingList(newPassWaitingList);

    try {
      // ✅ Cập nhật cả trong session.members để đồng bộ
      const updatedMembers = session.members.map((m) =>
        m.memberId === memberId
          ? { ...m, isWaitingPass: newPassWaitingList.includes(memberId) }
          : m
      );

      // ✅ Gọi API để lưu vào database
      if (updateSessionMutation) {
        await updateSessionMutation.mutateAsync({
          id: session.id,
          data: {
            passWaitingList: newPassWaitingList,
            members: updatedMembers,
          },
        });
      }
      onUpdate();
    } catch (error) {
      console.error('Error updating pass waiting list:', error);
      setPassWaitingList(session.passWaitingList || []);
    }
  };

const handlePassMember = async (memberId: string) => {
    const memberToPass = session.members.find(m => m.memberId === memberId);
    if (!memberToPass) return;

    const memberName = memberToPass.memberName || 'Thành viên';
    const newMembers = session.members.filter(m => m.memberId !== memberId);
    const newPassWaitingList = passWaitingList.filter(id => id !== memberId);

    let newWaitingList = session.waitingList;
    let replacementMember = null;

    if (session.waitingList.length > 0) {
      const firstWaiting = session.waitingList[0];
      replacementMember = firstWaiting;
      newWaitingList = session.waitingList.slice(1);
      
      newMembers.push({
        memberId: firstWaiting.memberId,
        memberName: firstWaiting.memberName,
        isPresent: false,
        isCustom: firstWaiting.isCustom,
        replacementNote: memberToPass.replacementNote ? memberToPass.replacementNote : `Slot của ${memberName}`,
        isWaitingPass: false,
        isWoman: firstWaiting.isWoman,
        avatar: firstWaiting.avatar,
      });
    }

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          members: newMembers,
          waitingList: newWaitingList,
          passWaitingList: newPassWaitingList,
          currentParticipants: newMembers.length,
        },
      });

      onUpdate();

      if (replacementMember) {
        alert(`🔄 Đã pass ${memberName} → ${replacementMember.memberName} vào slot`);
      } else {
        alert(`✅ Đã pass ${memberName} khỏi danh sách`);
      }
    } catch (error) {
      console.error('Error passing member:', error);
      alert('Có lỗi xảy ra khi pass thành viên');
    }
  };
  const passWaitingMembers = session.members.filter((m) =>
    passWaitingList.includes(m.memberId)
  );

  const canMarkAllPresent = session.status === 'ongoing';

  // ===== WAITING LIST EDIT HANDLERS =====
  const addCustomWaitingMember = () => {
    if (!customWaitingName.trim()) return;

    const customMember: CustomMember = {
      id: `custom-waiting-${Date.now()}`,
      name: customWaitingName.trim(),
      isCustom: true,
      isWoman: customWaitingIsWoman,
    };

    setLocalWaitingList([...localWaitingList, customMember]);
    setCustomWaitingName('');
    setCustomWaitingIsWoman(false);
  };

  const addMemberFromList = (member: Member) => {
    if (localWaitingList.some((m) => m.id === member.id)) {
      return; // Đã có trong danh sách
    }

    const customMember: CustomMember = {
      id: member.id,
      name: member.name,
      isCustom: false,
      isWoman: member.isWoman,
      avatar: member.avatar || '',
    };

    setLocalWaitingList([...localWaitingList, customMember]);
  };

  const removeFromWaitingList = (member: CustomMember) => {
    setLocalWaitingList(localWaitingList.filter((m) => m.id !== member.id));
  };

  const handleWaitingListReorder = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(localWaitingList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalWaitingList(items);
  };

  const handleSaveWaitingList = async () => {
    try {
      // Chuyển đổi localWaitingList thành format WaitingListMember
      const updatedWaitingList = localWaitingList.map((member, index) => ({
        memberId: member.id,
        memberName: member.name,
        addedAt: new Date(),
        priority: index + 1,
        isCustom: member.isCustom,
        isWoman: member.isWoman,
        avatar: member.avatar || '',
      }));

      // Call API update session
      if (updateSessionMutation) {
        await updateSessionMutation.mutateAsync({
          id: session.id,
          data: {
            waitingList: updatedWaitingList,
          },
        });
      }

      setEditWaitingDialogOpen(false);
      onUpdate();
      setSnackbarMessage('✅ Đã cập nhật sảnh chờ!');
    } catch (error) {
      console.error('Error updating waiting list:', error);
      setSnackbarMessage('❌ Có lỗi khi cập nhật sảnh chờ!');
    }
  };

  return (
    <Box>
      {/* Điểm danh thành viên */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <Accordion
          defaultExpanded={!isMobile}
          sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              backgroundColor: 'success.light',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <CheckCircle sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                Điểm danh thành viên
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
              Chức năng "Điểm danh", "Chờ Pass", "Pass" không hoạt động khi lịch đánh đã "Hoàn Thành"
            </Alert>


            {canMarkAllPresent && session.members.length > 0 && onMarkAllPresent && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<Done />}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllPresent();
                }}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.813rem' },
                  py: { xs: 0.5, sm: 0.75 },
                  px: { xs: 1, sm: 1.5 },
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                  mb: 2
                }}
              >
                Tất cả có mặt
              </Button>
            )}

            <Stack spacing={1.5}>
              {session.members.map((member, index) => {
                const isInPassWaiting = passWaitingList.includes(member.memberId);
                return (
                  <Card
                    key={member.memberId}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      border: isInPassWaiting ? '2px solid' : '1px solid',
                      borderColor: isInPassWaiting ? 'warning.main' : 'divider',
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        {member.avatar ? (
                          <Avatar src={transformUrl(member.avatar)} sx={{ mr: 2, width: 32, height: 32 }} />
                        ) : (
                          <Avatar
                            sx={{
                              width: { xs: 36, sm: 40 },
                              height: { xs: 36, sm: 40 },
                            }}
                          >
                            {member.memberName?.charAt(0).toUpperCase()}
                          </Avatar>
                        )}

                        <Box flex={1}>
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            sx={{
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              color: member.isWoman ? '#ef7be0' : '#4b9aff',
                            }}
                          >
                            {index + 1}. {member.memberName}
                          </Typography>
                          {member.replacementNote && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.75rem', sm: '0.813rem' } }}
                            >
                              🔄 {member.replacementNote}
                            </Typography>
                          )}
                        </Box>
                        {isInPassWaiting && (
                          <Chip
                            label="Chờ Pass"
                            color="warning"
                            size="small"
                            sx={{ fontSize: { xs: '0.688rem', sm: '0.75rem' } }}
                          />
                        )}
                      </Box>

                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant={member.isPresent ? 'contained' : 'outlined'}
                            color="success"
                            onClick={() =>
                              onRollCallChange({
                                memberId: member.memberId,
                                isPresent: !member.isPresent,
                              })
                            }
                            disabled={session.status !== 'ongoing'}
                            fullWidth
                            sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                          >
                            {member.isPresent ? '✓ Có mặt' : 'Vắng'}
                          </Button>
                          <Button
                            size="small"
                            variant={member.isWoman ? 'contained' : 'outlined'}
                            color="inherit"
                            onClick={() =>
                              onSexChange({
                                memberId: member.memberId,
                                isWoman: !member.isWoman,
                              })
                            }
                            disabled={session.status === 'completed'}
                            fullWidth
                            sx={{
                              fontSize: { xs: '0.813rem', sm: '0.875rem' },
                              color: member.isWoman ? '#ef7be0' : '#4b9aff',
                            }}
                          >
                            {member.isWoman ? (
                              <Female sx={{ fontSize: 18, ml: 1 }} />
                            ) : (
                              <Male sx={{ fontSize: 18, ml: 1 }} />
                            )}
                          </Button>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant={isInPassWaiting ? 'contained' : 'outlined'}
                            color="warning"
                            onClick={() => handleTogglePassWaiting(member.memberId)}
                            disabled={session.status === 'completed'}
                            fullWidth
                            sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                          >
                            {isInPassWaiting ? 'Bỏ chờ Pass' : 'Chờ Pass'}
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handlePassMember(member.memberId)}
                            disabled={session.status === 'completed'}
                            fullWidth
                            sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                          >
                            Pass
                          </Button>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Card>

      {/* Danh sách chờ pass & Sảnh chờ */}
      <Grid container spacing={2}>
        {/* Danh sách chờ pass */}
        {passWaitingMembers.length > 0 && (
          <Grid item xs={12}>
            <Accordion
              defaultExpanded={!isMobile}
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: 'warning.light',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HourglassEmpty sx={{ color: 'warning.dark' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Danh sách chờ pass ({passWaitingMembers.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                  Những thành viên này đang chờ pass slot. Nhấn nút "Pass" để chuyển slot cho người trong sảnh chờ.
                </Alert>

                <Stack spacing={1.5}>
                  {passWaitingMembers.map((member, index) => (
                    <Paper
                      key={member.memberId}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        backgroundColor: 'warning.lighter',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'warning.dark', mr: 2, width: 32, height: 32 }} src={transformUrl(member.avatar)}>
                          {index + 1}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {member.memberName || member.memberId}
                          </Typography>
                          {member.replacementNote && (
                            <Typography variant="caption" color="text.secondary">
                              <SwapHoriz fontSize="inherit" /> {member.replacementNote}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Close />}
                          onClick={() => handleTogglePassWaiting(member.memberId)}
                          disabled={session.status === 'completed'}
                          fullWidth
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.813rem' } }}
                        >
                          Bỏ khỏi chờ
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<ExitToApp />}
                          onClick={() => handlePassMember(member.memberId)}
                          disabled={session.status === 'completed'}
                          fullWidth
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.813rem' } }}
                        >
                          Pass ngay
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Sảnh chờ - CÓ NÚT EDIT */}
        { (
          <Grid item xs={12}>
            <Accordion
              defaultExpanded={!isMobile}
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: 'info.light',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule sx={{ color: 'info.main' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Sảnh chờ ({session.waitingList.length})
                    </Typography>
                  </Box>

                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                  {passWaitingMembers.length > 0
                    ? 'Khi pass thành viên, người đầu tiên trong sảnh chờ sẽ được tự động vào slot.'
                    : 'Những người này đang chờ slot trống để tham gia.'}
                </Alert>

                                  
                  {/* NÚT CHỈNH SỬA - CHỈ HIỆN KHI STATUS = 'scheduled' */}
                  {session.status === 'scheduled' && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<Edit />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditWaitingDialogOpen(true);
                      }}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.813rem' },
                        py: { xs: 0.5, sm: 0.75 },
                        px: { xs: 1, sm: 1.5 },
                        minWidth: 'fit-content',
                        whiteSpace: 'nowrap',
                        mb: 2,
                      }}
                    >
                      Cập nhập sảnh chờ
                    </Button>
                  )}

                <Stack spacing={1.5}>
                  {session.waitingList.map((member, index) => (
                    <Paper
                      key={member.memberId}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderRadius: 2,
                        backgroundColor:
                          index === 0 && passWaitingMembers.length > 0
                            ? 'success.lighter'
                            : 'background.paper',
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'info.main', mr: 2, width: 32, height: 32 }} src={transformUrl(member.avatar)}>
                        {member.memberName?.charAt(0).toUpperCase() || index + 1}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {member.memberName || member.memberId}
                        </Typography>
                      </Box>
                      {index === 0 && passWaitingMembers.length > 0 && (
                        <Chip
                          label="Sẽ vào tiếp"
                          color="success"
                          size="small"
                          sx={{ fontSize: { xs: '0.688rem', sm: '0.75rem' } }}
                        />
                      )}
                    </Paper>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>

      {/* ===== DIALOG CHỈNH SỬA SẢNH CHỜ ===== */}
      <Dialog
        open={editWaitingDialogOpen}
        onClose={() => setEditWaitingDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Chỉnh sửa Sảnh chờ ({localWaitingList.length} người)
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Tabs: Từ danh sách / Tùy chỉnh */}
          <Box sx={{ mb: 2 }}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button
                variant={waitingTabValue === 0 ? 'contained' : 'outlined'}
                onClick={() => setWaitingTabValue(0)}
              >
                Từ danh sách
              </Button>
              <Button
                variant={waitingTabValue === 1 ? 'contained' : 'outlined'}
                onClick={() => setWaitingTabValue(1)}
              >
                Tùy chỉnh
              </Button>
            </ButtonGroup>
          </Box>

          {/* TAB 0: Thêm từ danh sách thành viên */}
          {waitingTabValue === 0 && (
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                options={
                  members?.filter(
                    (member) =>
                      !session.members.some((sm) => sm.memberId === member.id) &&
                      !localWaitingList.some((wm) => wm.id === member.id)
                  ) || []
                }
                getOptionLabel={(option) => option.name}
                onChange={(_, value) => {
                  if (value) {
                    addMemberFromList(value);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Thêm vào sảnh chờ từ danh sách" />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    {option.avatar ? (
                      <Avatar src={transformUrl(option.avatar)} sx={{ mr: 2, width: 32, height: 32 }} />
                    ) : (
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {option.name.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </Box>
                )}
              />
            </Box>
          )}

          {/* TAB 1: Thêm tên tùy chỉnh */}
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={customWaitingIsWoman}
                      onChange={(e) => setCustomWaitingIsWoman(e.target.checked)}
                      name="isWoman"
                    />
                  }
                  label="Nữ"
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

          {/* ===== DANH SÁCH CHỜ VỚI DRAG-AND-DROP ===== */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Schedule sx={{ mr: 1 }} />
                Danh sách chờ ({localWaitingList.length})
                {localWaitingList.length > 0 && (
                  <Chip
                    label="Kéo thả để sắp xếp"
                    size="small"
                    sx={{ ml: 2 }}
                    color="info"
                    variant="outlined"
                    icon={<DragHandle />}
                  />
                )}
              </Typography>

              {localWaitingList.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Sảnh chờ trống. Thêm thành viên vào sảnh chờ để quản lý danh sách dự phòng.
                </Alert>
              ) : (
                <DragDropContext onDragEnd={handleWaitingListReorder}>
                  <StrictModeDroppable droppableId="waiting-list">
                    {(provided, snapshot) => (
                      <List
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        dense
                        sx={{
                          backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                          borderRadius: 1,
                          transition: 'background-color 0.2s ease',
                          p: 1,
                          minHeight: 100,
                        }}
                      >
                        {localWaitingList.map((member, index) => (
                          <Draggable key={member.id} draggableId={member.id} index={index}>
                            {(provided, snapshot) => (
                              <ListItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{
                                  backgroundColor: snapshot.isDragging ? 'primary.light' : 'background.paper',
                                  borderRadius: 1,
                                  mb: 1,
                                  border: '1px solid',
                                  borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                                  boxShadow: snapshot.isDragging ? 3 : 0,
                                  transition: 'all 0.2s ease',
                                  cursor: 'default',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                  },
                                }}
                              >
                                {/* Icon Kéo Thả */}
                                <Box
                                  {...provided.dragHandleProps}
                                  sx={{
                                    mr: 1,
                                    cursor: 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'text.secondary',
                                    '&:active': {
                                      cursor: 'grabbing',
                                    },
                                    '&:hover': {
                                      color: 'primary.main',
                                    },
                                    touchAction: 'none',
                                    userSelect: 'none',
                                  }}
                                >
                                  <DragHandle />
                                </Box>

                                {/* Avatar với số thứ tự */}
                                {member.avatar ? (
                                  <Avatar src={transformUrl(member.avatar)} sx={{ mr: 2, width: 32, height: 32 }} />
                                ) : (
                                  <Avatar
                                    sx={{
                                      mr: 2,
                                      width: 36,
                                      height: 36,
                                      bgcolor: member.isCustom ? 'secondary.main' : 'warning.main',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {member.name?.charAt(0).toUpperCase() || index + 1}
                                  </Avatar>
                                )}

                                {/* Thông tin thành viên */}
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography variant="body1" fontWeight="medium">
                                        {member.name}
                                      </Typography>
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
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      {member.isCustom ? 'Tùy chỉnh' : 'Thành viên'}
                                    </Typography>
                                  }
                                />

                                {/* Nút hành động */}
                                <ListItemSecondaryAction>
                                  <Tooltip title="Xóa khỏi sảnh chờ">
                                    <IconButton
                                      edge="end"
                                      onClick={() => removeFromWaitingList(member)}
                                      color="error"
                                      size="small"
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </ListItemSecondaryAction>
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </StrictModeDroppable>
                </DragDropContext>
              )}

              {/* Hướng dẫn sử dụng */}
              {localWaitingList.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                  <Typography variant="caption">
                    💡 <strong>Mẹo:</strong> Kéo icon ≡ để sắp xếp lại thứ tự ưu tiên trong sảnh chờ
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setEditWaitingDialogOpen(false)}
            variant="outlined"
            fullWidth={isMobile}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveWaitingList}
            variant="contained"
            color="primary"
            startIcon={<Done />}
            fullWidth={isMobile}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar thông báo */}
      {snackbarMessage && (
        <Alert
          severity={snackbarMessage.includes('✅') ? 'success' : 'error'}
          sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}
          onClose={() => setSnackbarMessage('')}
        >
          {snackbarMessage}
        </Alert>
      )}
    </Box>
  );
};

export default SessionDetailPassList;