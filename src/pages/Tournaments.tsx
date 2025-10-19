// pages/Tournaments.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
  CalendarMonth as CalendarIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getTournaments,
  deleteTournament,
} from '../services/tournamentService';
import { Tournament, TournamentStatus, TournamentCategory } from '../types/tournament';
import TournamentForm from '../components/TournamentForm';
import TournamentDetail from '../components/TournamentDetail';

const statusColors: Record<TournamentStatus, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  draft: 'default',
  registration: 'primary',
  ongoing: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const statusLabels: Record<TournamentStatus, string> = {
  draft: 'Nháp',
  registration: 'Đang đăng ký',
  ongoing: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const categoryLabels: Record<TournamentCategory, string> = {
  men_singles: 'Đơn Nam',
  women_singles: 'Đơn Nữ',
  men_doubles: 'Đôi Nam',
  women_doubles: 'Đôi Nữ',
  mixed_doubles: 'Đôi Nam-Nữ',
};

const Tournaments: React.FC = () => {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Fetch tournaments
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setDeleteConfirmOpen(false);
      setTournamentToDelete(null);
    },
  });

  const handleCreate = () => {
    setSelectedTournament(null);
    setOpenForm(true);
  };

  const handleEdit = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setOpenForm(true);
  };

  const handleView = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setOpenDetail(true);
  };

  const handleDelete = (id: string) => {
    setTournamentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (tournamentToDelete) {
      deleteMutation.mutate(tournamentToDelete);
    }
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTournament(null);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setSelectedTournament(null);
  };

  // Filter tournaments by status
  const filterTournaments = (status?: TournamentStatus) => {
    if (!status) return tournaments;
    return tournaments.filter((t) => t.status === status);
  };

  const getFilteredTournaments = () => {
    switch (tabValue) {
      case 0:
        return tournaments;
      case 1:
        return filterTournaments('registration');
      case 2:
        return filterTournaments('ongoing');
      case 3:
        return filterTournaments('completed');
      default:
        return tournaments;
    }
  };

  const filteredTournaments = getFilteredTournaments();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon fontSize="large" />
            Quản Lý Giải Đấu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo và quản lý các giải đấu cầu lông
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          size="large"
        >
          Tạo Giải Đấu
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab label={`Tất cả (${tournaments.length})`} />
          <Tab label={`Đang đăng ký (${filterTournaments('registration').length})`} />
          <Tab label={`Đang diễn ra (${filterTournaments('ongoing').length})`} />
          <Tab label={`Đã kết thúc (${filterTournaments('completed').length})`} />
        </Tabs>
      </Paper>

      {/* Tournament Grid */}
      {isLoading ? (
        <Typography>Đang tải...</Typography>
      ) : filteredTournaments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <TrophyIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có giải đấu nào
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Tạo giải đấu đầu tiên để bắt đầu
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Tạo Giải Đấu
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredTournaments.map((tournament) => (
            <Grid item xs={12} md={6} lg={4} key={tournament.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Status Badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      label={statusLabels[tournament.status]}
                      color={statusColors[tournament.status]}
                      size="small"
                    />
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(tournament)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(tournament.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Tournament Name */}
                  <Typography variant="h6" gutterBottom>
                    {tournament.name}
                  </Typography>

                  {/* Date Range */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {dayjs(tournament.startDate).format('DD/MM/YYYY')} -{' '}
                      {dayjs(tournament.endDate).format('DD/MM/YYYY')}
                    </Typography>
                  </Box>

                  {/* Venue */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    📍 {tournament.venue}
                  </Typography>

                  {/* Categories */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {tournament.categories.map((cat) => (
                      <Chip key={cat} label={categoryLabels[cat]} size="small" variant="outlined" />
                    ))}
                  </Box>

                  {/* Participants */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupsIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {tournament.participants.length} thành viên đã đăng ký
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={() => handleView(tournament)}
                  >
                    Xem Chi Tiết
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tournament Form Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <TournamentForm
          tournament={selectedTournament}
          onClose={handleCloseForm}
        />
      </Dialog>

      {/* Tournament Detail Dialog */}
      <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="lg" fullWidth>
        {selectedTournament && (
          <TournamentDetail
            tournament={selectedTournament}
            onClose={handleCloseDetail}
          />
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa giải đấu này? Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tournaments;