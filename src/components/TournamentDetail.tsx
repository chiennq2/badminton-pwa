// components/TournamentDetail.tsx

import React, { useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  Card,
  CardContent,
  Dialog,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Check as CheckIcon,
  EmojiEvents as TrophyIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import {
  Tournament,
  TournamentMatch,
  TournamentCategory,
} from '../types/tournament';
import {
  generateTournamentSchedule,
  updateMatchResult,
  scheduleMatch,
  getTournamentById,
} from '../services/tournamentService';
import { useCourts } from '../hooks';
import BracketView from './BracketView';
import GroupStandingsView from './GroupStandingsView';

interface Props {
  tournament: Tournament;
  onClose: () => void;
}

const categoryLabels: Record<TournamentCategory, string> = {
  men_singles: 'Đơn Nam',
  women_singles: 'Đơn Nữ',
  men_doubles: 'Đôi Nam',
  women_doubles: 'Đôi Nữ',
  mixed_doubles: 'Đôi Nam-Nữ',
};

const TournamentDetail: React.FC<Props> = ({ tournament, onClose }) => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory>(
    tournament.categories[0]
  );
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

  // Match result form
  const [player1Score, setPlayer1Score] = useState<number[]>([0, 0, 0]);
  const [player2Score, setPlayer2Score] = useState<number[]>([0, 0, 0]);
  const [winnerId, setWinnerId] = useState('');

  // Schedule form
  const [scheduleCourtId, setScheduleCourtId] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState<Dayjs | null>(dayjs());

  const { data: courts = [] } = useCourts();

  const { data: latestTournament } = useQuery({
    queryKey: ['tournament', tournament.id],
    queryFn: () => getTournamentById(tournament.id),
    initialData: tournament,
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: ({ tournamentId, category }: { tournamentId: string; category: TournamentCategory }) =>
      generateTournamentSchedule(tournamentId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });

  // Update match result mutation
  const updateResultMutation = useMutation({
    mutationFn: ({
      tournamentId,
      matchId,
      result,
    }: {
      tournamentId: string;
      matchId: string;
      result: any;
    }) => updateMatchResult(tournamentId, matchId, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      setMatchDialogOpen(false);
    },
  });

  // Schedule match mutation
  const scheduleMatchMutation = useMutation({
    mutationFn: ({
      tournamentId,
      matchId,
      schedule,
    }: {
      tournamentId: string;
      matchId: string;
      schedule: any;
    }) => scheduleMatch(tournamentId, matchId, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      setScheduleDialogOpen(false);
    },
  });

  const handleGenerateSchedule = () => {
    generateScheduleMutation.mutate({
      tournamentId: tournament.id,
      category: selectedCategory,
    });
  };

  const handleOpenMatchResult = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setPlayer1Score(match.player1Score || [0, 0, 0]);
    setPlayer2Score(match.player2Score || [0, 0, 0]);
    setWinnerId(match.winnerId || '');
    setMatchDialogOpen(true);
  };

  const handleOpenScheduleDialog = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setScheduleCourtId(match.courtId || '');
    setScheduleDateTime(match.scheduledDate ? dayjs(match.scheduledDate) : dayjs());
    setScheduleDialogOpen(true);
  };

  const handleSubmitResult = () => {
    if (!selectedMatch) return;

    updateResultMutation.mutate({
      tournamentId: tournament.id,
      matchId: selectedMatch.id,
      result: {
        player1Score,
        player2Score,
        winnerId,
      },
    });
  };

  const handleSubmitSchedule = () => {
    if (!selectedMatch || !scheduleDateTime) return;

    scheduleMatchMutation.mutate({
      tournamentId: tournament.id,
      matchId: selectedMatch.id,
      schedule: {
        courtId: scheduleCourtId,
        scheduledDate: scheduleDateTime.toDate(),
        scheduledTime: scheduleDateTime.format('HH:mm'),
      },
    });
  };

  const getCategoryMatches = () => {
    return (latestTournament?.matches || []).filter(
      (m) => m.category === selectedCategory
    );
  };

  const getCategoryParticipants = () => {
    return (latestTournament?.participants || []).filter((p) =>
      p.categories.includes(selectedCategory)
    );
  };

  const getCategoryGroups = () => {
    return (latestTournament?.groups || []).filter(
      (g) => g.category === selectedCategory
    );
  };

  return (
    <>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrophyIcon />
          <Box>
            <Typography variant="h6">{tournament.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {tournament.venue}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Category Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={selectedCategory}
            onChange={(_, v) => setSelectedCategory(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tournament.categories.map((cat) => (
              <Tab
                key={cat}
                value={cat}
                label={categoryLabels[cat]}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Main Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Thông tin chung" />
            <Tab label="Danh sách" />
            <Tab label="Lịch thi đấu" />
            {tournament.format === 'single_elimination' && <Tab label="Bracket" />}
            {tournament.format === 'round_robin' && <Tab label="Bảng xếp hạng" />}
          </Tabs>
        </Box>

        {/* Tab 0: General Info */}
        {tabValue === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thông tin giải đấu
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Thể thức
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {tournament.format === 'single_elimination'
                        ? 'Loại trực tiếp'
                        : tournament.format === 'round_robin'
                        ? 'Vòng tròn'
                        : 'Kết hợp'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Thời gian
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {dayjs(tournament.startDate).format('DD/MM/YYYY')} -{' '}
                      {dayjs(tournament.endDate).format('DD/MM/YYYY')}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Hạn đăng ký
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {dayjs(tournament.registrationDeadline).format('DD/MM/YYYY')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thống kê
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tổng số người đăng ký
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      {tournament.participants.length}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Số nội dung thi đấu
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      {tournament.categories.length}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Tổng số trận đấu
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      {tournament.matches.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Participants List */}
        {tabValue === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Danh sách người chơi ({getCategoryParticipants().length})
              </Typography>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Tên</TableCell>
                    <TableCell>Pot</TableCell>
                    <TableCell>Ngày đăng ký</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCategoryParticipants().map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{participant.memberName}</TableCell>
                      <TableCell>
                        <Chip label={`Pot ${participant.potLevel}`} size="small" />
                      </TableCell>
                      <TableCell>
                        {dayjs(participant.registeredAt).format('DD/MM/YYYY')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Match Schedule */}
        {tabValue === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Lịch thi đấu ({getCategoryMatches().length} trận)
              </Typography>
              {getCategoryMatches().length === 0 && (
                <Button
                  variant="contained"
                  onClick={handleGenerateSchedule}
                  disabled={generateScheduleMutation.isPending}
                  startIcon={<PlayIcon />}
                >
                  {generateScheduleMutation.isPending ? 'Đang tạo...' : 'Tạo lịch thi đấu'}
                </Button>
              )}
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Trận</TableCell>
                    <TableCell>Vòng</TableCell>
                    <TableCell>Người chơi</TableCell>
                    <TableCell>Tỉ số</TableCell>
                    <TableCell>Sân</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCategoryMatches().map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>{match.matchNumber}</TableCell>
                      <TableCell>{match.round}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {match.player1Name || 'TBD'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          vs
                        </Typography>
                        <Typography variant="body2">
                          {match.player2Name || 'TBD'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {match.player1Score && match.player2Score ? (
                          <Box>
                            {match.player1Score.map((score, idx) => (
                              <Typography key={idx} variant="body2">
                                {score} - {match.player2Score![idx]}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {match.courtId
                          ? courts.find((c) => c.id === match.courtId)?.name
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {match.scheduledDate && match.scheduledTime ? (
                          <Box>
                            <Typography variant="body2">
                              {dayjs(match.scheduledDate).format('DD/MM/YYYY')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {match.scheduledTime}
                            </Typography>
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            match.status === 'scheduled'
                              ? 'Chưa đá'
                              : match.status === 'ongoing'
                              ? 'Đang đá'
                              : match.status === 'completed'
                              ? 'Hoàn thành'
                              : 'Hủy'
                          }
                          size="small"
                          color={
                            match.status === 'completed'
                              ? 'success'
                              : match.status === 'ongoing'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenScheduleDialog(match)}
                          title="Xếp lịch"
                        >
                          <CalendarIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenMatchResult(match)}
                          disabled={!match.player1Id || !match.player2Id || match.status === 'completed'}
                          title="Nhập kết quả"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: Bracket (Single Elimination) */}
        {tabValue === 3 && tournament.format === 'single_elimination' && (
          <BracketView matches={getCategoryMatches()} />
        )}

        {/* Tab 4: Group Standings (Round Robin) */}
        {tabValue === 3 && tournament.format === 'round_robin' && (
          <GroupStandingsView
            groups={getCategoryGroups()}
            participants={getCategoryParticipants()}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>

      {/* Match Result Dialog */}
      <Dialog open={matchDialogOpen} onClose={() => setMatchDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nhập kết quả trận đấu</DialogTitle>
        <DialogContent>
          {selectedMatch && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {selectedMatch.player1Name} vs {selectedMatch.player2Name}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                {[0, 1, 2].map((setIndex) => (
                  <React.Fragment key={setIndex}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={`Set ${setIndex + 1} - ${selectedMatch.player1Name}`}
                        type="number"
                        value={player1Score[setIndex]}
                        onChange={(e) => {
                          const newScore = [...player1Score];
                          newScore[setIndex] = Number(e.target.value);
                          setPlayer1Score(newScore);
                        }}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography>-</Typography>
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={`Set ${setIndex + 1} - ${selectedMatch.player2Name}`}
                        type="number"
                        value={player2Score[setIndex]}
                        onChange={(e) => {
                          const newScore = [...player2Score];
                          newScore[setIndex] = Number(e.target.value);
                          setPlayer2Score(newScore);
                        }}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </React.Fragment>
                ))}

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Người chiến thắng</InputLabel>
                    <Select
                      value={winnerId}
                      onChange={(e) => setWinnerId(e.target.value)}
                    >
                      <MenuItem value={selectedMatch.player1Id}>
                        {selectedMatch.player1Name}
                      </MenuItem>
                      <MenuItem value={selectedMatch.player2Id}>
                        {selectedMatch.player2Name}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleSubmitResult}
            variant="contained"
            disabled={!winnerId || updateResultMutation.isPending}
            startIcon={<CheckIcon />}
          >
            {updateResultMutation.isPending ? 'Đang lưu...' : 'Lưu kết quả'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Match Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Xếp lịch thi đấu</DialogTitle>
        <DialogContent>
          {selectedMatch && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Trận {selectedMatch.matchNumber}: {selectedMatch.player1Name || 'TBD'} vs{' '}
                {selectedMatch.player2Name || 'TBD'}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Sân thi đấu</InputLabel>
                    <Select
                      value={scheduleCourtId}
                      onChange={(e) => setScheduleCourtId(e.target.value)}
                    >
                      {courts.map((court) => (
                        <MenuItem key={court.id} value={court.id}>
                          {court.name} - {court.location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <DateTimePicker
                    label="Ngày và giờ thi đấu"
                    value={scheduleDateTime}
                    onChange={setScheduleDateTime}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleSubmitSchedule}
            variant="contained"
            disabled={!scheduleCourtId || !scheduleDateTime || scheduleMatchMutation.isPending}
            startIcon={<CheckIcon />}
          >
            {scheduleMatchMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TournamentDetail;