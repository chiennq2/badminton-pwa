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
} from '@mui/material';
import {
  SwapHoriz,
  Close,
  ExitToApp,
  CheckCircle,
  HourglassEmpty,
  Schedule,
  ExpandMore,
} from '@mui/icons-material';
import { useUpdateSession } from '../hooks';
import { Session } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { formatCurrency } from '../utils';

interface SessionDetailPassListProps {
  session: Session;
  onUpdate: () => void;
  onRollCallChange: (data: {
    memberId: string;
    isPresent: boolean;
  }) => void;
}

const SessionDetailPassList: React.FC<SessionDetailPassListProps> = ({
  session,
  onUpdate,
  onRollCallChange
}) => {
  const updateSessionMutation = useUpdateSession();
  const [passWaitingList, setPassWaitingList] = useState<string[]>(
    session.passWaitingList || []
  );
  const { isMobile } = useResponsive();

  useEffect(() => {
    setPassWaitingList(session.passWaitingList || []);
  }, [session.passWaitingList]);

  const handleTogglePassWaiting = async (memberId: string) => {
    const newPassWaitingList = passWaitingList.includes(memberId)
      ? passWaitingList.filter(id => id !== memberId)
      : [...passWaitingList, memberId];

    setPassWaitingList(newPassWaitingList);

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          passWaitingList: newPassWaitingList,
          members: session.members.map(m => ({
            ...m,
            isWaitingPass: newPassWaitingList.includes(m.memberId),
          })),
        },
      });
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
        replacementNote: `Slot của ${memberName}`,
        isWaitingPass: false,
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

  const passWaitingMembers = session.members.filter(m =>
    passWaitingList.includes(m.memberId)
  );

  return (
    <Box>
      {/* Điểm danh thành viên */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ 
              display: "flex", 
              alignItems: "center",
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            <CheckCircle sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
            Điểm danh thành viên
          </Typography>

          <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
            Chức năng "Điểm danh", "Chờ Pass", "Pass" không hoạt động khi lịch đánh đã "Hoàn Thành"
          </Alert>

          {/* Mobile-optimized member list */}
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
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                    {/* Header: Avatar + Name */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                      <Avatar sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
                        {member.memberName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box flex={1}>
                        <Typography 
                          variant="subtitle2" 
                          fontWeight="bold"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
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

                    {/* Action buttons */}
                    <Stack spacing={1}>
                      <Button
                        size="small"
                        variant={member.isPresent ? "contained" : "outlined"}
                        color="success"
                        onClick={() =>
                          onRollCallChange({
                            memberId: member.memberId,
                            isPresent: !member.isPresent,
                          })
                        }
                        disabled={session.status === 'completed'}
                        fullWidth
                        sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                      >
                        {member.isPresent ? "✓ Có mặt" : "Vắng"}
                      </Button>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant={isInPassWaiting ? "contained" : "outlined"}
                          color="warning"
                          onClick={() => handleTogglePassWaiting(member.memberId)}
                          disabled={session.status === 'completed'}
                          fullWidth
                          sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                        >
                          {isInPassWaiting ? "Bỏ chờ Pass" : "Chờ Pass"}
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
        </CardContent>
      </Card>

      {/* Danh sách chờ pass & Sảnh chờ */}
      <Grid container spacing={2}>
        {/* Danh sách chờ pass */}
        {passWaitingMembers.length > 0 && (
          <Grid item xs={12}>
            <Accordion 
              defaultExpanded={isMobile}
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
                  <HourglassEmpty sx={{ color: "warning.dark" }} />
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ bgcolor: "warning.dark", width: 32, height: 32 }}>
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
                          disabled={session.status === "completed"}
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
                          disabled={updateSessionMutation.isPending || session.status === "completed"}
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

        {/* Sảnh chờ */}
        {session.waitingList && session.waitingList.length > 0 && (
          <Grid item xs={12}>
            <Accordion 
              defaultExpanded={isMobile}
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore />}
                sx={{ 
                  backgroundColor: 'info.light',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: "info.main" }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Sảnh chờ ({session.waitingList.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                  {passWaitingMembers.length > 0
                    ? "Khi pass thành viên, người đầu tiên trong sảnh chờ sẽ được tự động vào slot."
                    : "Những người này đang chờ slot trống để tham gia."}
                </Alert>

                <Stack spacing={1.5}>
                  {session.waitingList.map((member, index) => (
                    <Paper
                      key={member.memberId}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        borderRadius: 2,
                        backgroundColor: index === 0 && passWaitingMembers.length > 0 
                          ? 'success.lighter' 
                          : 'background.paper',
                      }}
                    >
                      <Avatar sx={{ bgcolor: "info.main", width: 32, height: 32 }}>
                        {index + 1}
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
    </Box>
  );
};

export default SessionDetailPassList;