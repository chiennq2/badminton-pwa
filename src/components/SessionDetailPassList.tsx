// SessionDetail.tsx - Thêm tính năng Pass List
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Avatar,
} from '@mui/material';
import {
  SwapHoriz,
  Close,
  ExitToApp,
  CheckCircle,
  HourglassEmpty,
  Schedule,
} from '@mui/icons-material';
import { useUpdateSession } from '../hooks';
import { Session, SessionMember } from '../types';
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

  // Sync with session data when it changes
  useEffect(() => {
    setPassWaitingList(session.passWaitingList || []);
  }, [session.passWaitingList]);

  // ✅ Toggle thành viên vào/ra danh sách chờ pass
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
      // Revert on error
      setPassWaitingList(session.passWaitingList || []);
    }
  };

  // ✅ Xử lý Pass thành viên (giống removeMember trong SessionEditForm)
  const handlePassMember = async (memberId: string) => {
    const memberToPass = session.members.find(m => m.memberId === memberId);
    if (!memberToPass) return;

    const memberName = memberToPass.memberName || 'Thành viên';
    
    // Xóa khỏi danh sách chính
    const newMembers = session.members.filter(m => m.memberId !== memberId);
    
    // Xóa khỏi danh sách chờ pass
    const newPassWaitingList = passWaitingList.filter(id => id !== memberId);

    // Kiểm tra có thành viên trong sảnh chờ không
    let newWaitingList = session.waitingList;
    let replacementMember = null;

    if (session.waitingList.length > 0) {
      const firstWaiting = session.waitingList[0];
      replacementMember = firstWaiting;
      
      // Xóa khỏi sảnh chờ
      newWaitingList = session.waitingList.slice(1);
      
      // Thêm vào danh sách chính với ghi chú
      newMembers.push({
        memberId: firstWaiting.memberId,
        memberName: firstWaiting.memberName,
        isPresent: false, // Chưa điểm danh
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

      // Hiển thị thông báo thành công
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

  // Lọc các thành viên trong danh sách chờ pass
  const passWaitingMembers = session.members.filter(m =>
    passWaitingList.includes(m.memberId)
  );

  const handleRollCallChange = async (memberId: string, isPresent: boolean) => {

  }

  return (
    <Box>
      {/* Điểm danh thành viên với cột Pass */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle sx={{ mr: 1 }} />
            Điểm danh thành viên
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell><strong>STT</strong></TableCell>
                  <TableCell><strong>Tên</strong></TableCell>
                  <TableCell align="center"><strong>Có mặt</strong></TableCell>
                  <TableCell align="center">
                    <Tooltip title="Đánh dấu thành viên chờ pass">
                      <strong>Chờ Pass</strong>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center"><strong>Pass</strong></TableCell>
                  {/* <TableCell align="right"><strong>Số tiền</strong></TableCell> */}
                </TableRow>
              </TableHead>
              <TableBody>
                {session.members.map((member, index) => {
                  const settlement = session.settlements?.find(
                    s => s.memberId === member.memberId
                  );
                  const isInPassWaiting = passWaitingList.includes(member.memberId);

                  return (
                    <TableRow
                      key={member.memberId}
                      sx={{
                        backgroundColor: isInPassWaiting ? 'warning.dark' : 'inherit',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {member.memberName?.charAt(0).toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {member.memberName || member.memberId}
                            </Typography>
                            {member.isCustom && (
                              <Chip label="Tùy chỉnh" size="small" sx={{ mt: 0.5 }} />
                            )}
                            {member.replacementNote && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                <SwapHoriz fontSize="inherit" /> {member.replacementNote}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        {/* <Checkbox
                          checked={member.isPresent}
                          disabled
                          color="success"
                        /> */}
                        <Checkbox
                            checked={member.isPresent}
                            onChange={(e) =>
                                onRollCallChange({
                                    memberId: member.memberId,
                                    isPresent: e.target.checked
                                })
                            }
                            disabled={
                              session.status === "completed"
                            }
                          />
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip
                          title={
                            isInPassWaiting
                              ? 'Bỏ khỏi danh sách chờ pass'
                              : 'Thêm vào danh sách chờ pass'
                          }
                        >
                          <Checkbox
                            checked={isInPassWaiting}
                            onChange={() => handleTogglePassWaiting(member.memberId)}
                            color="warning"
                            icon={<HourglassEmpty />}
                            checkedIcon={<HourglassEmpty />}
                          />
                        </Tooltip>
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Pass slot cho người khác">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<ExitToApp />}
                              onClick={() => handlePassMember(member.memberId)}
                              disabled={updateSessionMutation.isPending}
                            >
                              Pass
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>

                      {/* <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={settlement?.amount ? 'primary' : 'text.secondary'}
                        >
                          {settlement?.amount
                            ? formatCurrency(settlement.amount)
                            : formatCurrency(0)}
                        </Typography>
                      </TableCell> */}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Danh sách chờ pass */}
      {passWaitingMembers.length > 0 && (
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'warning.main' }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <HourglassEmpty sx={{ mr: 1, color: 'warning.main' }} />
              Danh sách chờ pass ({passWaitingMembers.length})
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Những thành viên này đang chờ pass slot. Nhấn nút <strong>"Pass"</strong> để
                chuyển slot cho người trong sảnh chờ.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {passWaitingMembers.map((member, index) => (
                <Paper
                  key={member.memberId}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'warning.light',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      {index + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {member.memberName || member.memberId}
                      </Typography>
                      {member.replacementNote && (
                        <Typography variant="caption" color="text.secondary">
                          <SwapHoriz fontSize="inherit" /> {member.replacementNote}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Bỏ khỏi danh sách chờ pass">
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePassWaiting(member.memberId)}
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<ExitToApp />}
                      onClick={() => handlePassMember(member.memberId)}
                      disabled={updateSessionMutation.isPending}
                    >
                      Pass ngay
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Sảnh chờ (hiển thị dưới danh sách chờ pass) */}
      {session.waitingList && session.waitingList.length > 0 && (
        <Card>
          <CardContent>
            <Schedule sx={{ mr: 1, color: "warning.main" }} />
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              Sảnh chờ ({session.waitingList.length})
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {passWaitingMembers.length > 0
                  ? 'Khi pass thành viên, người đầu tiên trong sảnh chờ sẽ được tự động vào slot.'
                  : 'Những người này đang chờ slot trống để tham gia.'}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {session.waitingList.map((member, index) => (
                <Paper
                  key={member.memberId}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    {index + 1}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {member.memberName || member.memberId}
                    </Typography>
                    {/* <Typography variant="caption" color="text.secondary">
                      Thêm lúc: {new Date(member.addedAt).toLocaleString('vi-VN')}
                    </Typography> */}
                  </Box>
                  {index === 0 && passWaitingMembers.length > 0 && (
                    <Chip
                      label="Sẽ vào tiếp theo"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SessionDetailPassList;