// src/pages/Tournaments.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Alert,
  Avatar,
  AvatarGroup,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Tournament,
  TournamentMatch,
  TournamentGroup,
  TournamentCategory,
} from '../types/tournament';
import { Member, Court } from '../types';
import {
  distributeToGroups,
  generateRoundRobinMatches,
  generateSingleEliminationBracket,
  generateKnockoutFromGroups,
  getCategoryName,
  isDoublesCategory,
  calculateGroupStandings,
  generateBalancedTeams,
} from '../utils/tournamentUtils';
import { formatDateOnly } from '../utils/dateUtils';
import { convertFirestoreTimestamp } from '../utils';
import TournamentForm from '../components/TournamentForm';
import TournamentDetail from '../components/TournamentDetail';
import { SwapHoriz } from '@mui/icons-material';

const Tournaments: React.FC = () => {
  const { currentUser } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTournament, setMenuTournament] = useState<Tournament | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });
  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "success"
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };
  // Load data
  useEffect(() => {
    if (!currentUser) return;

    const tournamentsQuery = query(collection(db, 'tournaments'));
    const membersQuery = query(collection(db, 'members'), where('isActive', '==', true));
    const courtsQuery = query(collection(db, 'courts'), where('isActive', '==', true));

    const unsubTournaments = onSnapshot(tournamentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const rawData = doc.data();
        return {
          id: doc.id,
          ...convertFirestoreTimestamp(rawData),
        } as Tournament;
      });
      setTournaments(data);
      setLoading(false);
    });

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertFirestoreTimestamp(doc.data()),
      })) as Member[];
      setMembers(data);
    });

    const unsubCourts = onSnapshot(courtsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertFirestoreTimestamp(doc.data()),
      })) as Court[];
      setCourts(data);
    });

    return () => {
      unsubTournaments();
      unsubMembers();
      unsubCourts();
    };
  }, [currentUser]);

  const handleCreateTournament = async (tournamentData: Partial<Tournament>) => {
    try {
      console.log('=== CREATING/UPDATING TOURNAMENT ===');

      if (selectedTournament) {
        // UPDATE
        const dataToUpdate: any = {
          name: tournamentData.name,
          description: tournamentData.description,
          format: tournamentData.format,
          categories: tournamentData.categories,
          startDate: Timestamp.fromDate(tournamentData.startDate!),
          endDate: Timestamp.fromDate(tournamentData.endDate!),
          registrationDeadline: Timestamp.fromDate(tournamentData.registrationDeadline!),
          location: tournamentData.location,
          courtIds: tournamentData.courtIds,
          participants: tournamentData.participants,
          teams: tournamentData.teams || [],
          maxParticipants: tournamentData.maxParticipants || null,
          entryFee: tournamentData.entryFee || null,
          rules: tournamentData.rules || null,
          notes: tournamentData.notes || null,
          status: tournamentData.status,
          updatedAt: Timestamp.now(),
        };

        if (selectedTournament.matches) {
          dataToUpdate.matches = selectedTournament.matches.map(m => ({
            id: m.id,
            tournamentId: m.tournamentId,
            category: m.category,
            round: m.round,
            matchNumber: m.matchNumber,
            groupId: m.groupId || null,
            participant1: m.participant1 || null,
            participant2: m.participant2 || null,
            courtId: m.courtId || null,
            scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
            scheduledTime: m.scheduledTime || null,
            status: m.status,
            scores: m.scores || [],
            winner: m.winner || null,
            nextMatchId: m.nextMatchId || null,
            previousMatch1Id: m.previousMatch1Id || null,
            previousMatch2Id: m.previousMatch2Id || null,
            createdAt: Timestamp.fromDate(m.createdAt),
            updatedAt: Timestamp.fromDate(m.updatedAt),
          }));
        }

        if (selectedTournament.groups) {
          dataToUpdate.groups = selectedTournament.groups.map(g => ({
            id: g.id,
            name: g.name,
            category: g.category,
            participants: g.participants,
            matches: g.matches.map(m => ({
              id: m.id,
              tournamentId: m.tournamentId,
              category: m.category,
              round: m.round,
              matchNumber: m.matchNumber,
              groupId: m.groupId || null,
              participant1: m.participant1 || null,
              participant2: m.participant2 || null,
              courtId: m.courtId || null,
              scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
              scheduledTime: m.scheduledTime || null,
              status: m.status,
              scores: m.scores || [],
              winner: m.winner || null,
              nextMatchId: m.nextMatchId || null,
              previousMatch1Id: m.previousMatch1Id || null,
              previousMatch2Id: m.previousMatch2Id || null,
              createdAt: Timestamp.fromDate(m.createdAt),
              updatedAt: Timestamp.fromDate(m.updatedAt),
            })),
            standings: g.standings || [],
          }));
        }

        const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
        await updateDoc(tournamentRef, dataToUpdate);
        showSnackbar('Cập nhật giải đấu thành công!', 'success');
      } else {
        // CREATE
        const newTournament: Partial<Tournament> = {
          ...tournamentData,
          matches: [],
          teams: [],
          groups: [],
          status: 'draft',
          createdBy: currentUser?.id || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await addDoc(collection(db, 'tournaments'), {
          ...newTournament,
          startDate: Timestamp.fromDate(newTournament.startDate!),
          endDate: Timestamp.fromDate(newTournament.endDate!),
          registrationDeadline: Timestamp.fromDate(newTournament.registrationDeadline!),
          createdAt: Timestamp.fromDate(newTournament.createdAt!),
          updatedAt: Timestamp.fromDate(newTournament.updatedAt!),
        });
        showSnackbar('Tạo giải đấu thành công!', 'success');
      }

      setFormOpen(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error('ERROR creating/updating tournament:', error);
      showSnackbar('Lỗi khi lưu giải đấu: ' + (error as Error).message, 'error');
    }
  };

  const handleGenerateSchedule = async (tournament: Tournament) => {
    try {
      console.log('=== STARTING SCHEDULE GENERATION ===');
      
      const updatedMatches: TournamentMatch[] = [];
      const updatedGroups: TournamentGroup[] = [];
      const updatedTeams = [...(tournament.teams || [])];

      const hasPresetGroups = tournament.groups && tournament.groups.length > 0;

      for (const category of tournament.categories) {
        console.log(`\n--- Processing category: ${category} ---`);
        
        let participants = tournament.participants.filter(p => p.categories.includes(category));

        if (participants.length === 0) {
          console.warn(`No participants for ${category}`);
          continue;
        }

        let teamsOrParticipants: any[] = participants;
        
        if (isDoublesCategory(category)) {
          console.log('Doubles category - generating balanced teams');
          
          const existingTeams = updatedTeams.filter(t => t.category === category);
          
          if (existingTeams.length === 0) {
            const teams = generateBalancedTeams(participants, category);
            console.log(`Generated ${teams.length} balanced teams`);
            updatedTeams.push(...teams);
            teamsOrParticipants = teams;
          } else {
            console.log(`Using ${existingTeams.length} existing teams`);
            teamsOrParticipants = existingTeams;
          }
        }

        if (tournament.format === 'single-elimination') {
          const matches = generateSingleEliminationBracket(teamsOrParticipants, tournament.id, category);
          updatedMatches.push(...matches);
          
        } else if (tournament.format === 'round-robin') {
          let groups = hasPresetGroups 
            ? tournament.groups!.filter(g => g.category === category)
            : distributeToGroups(teamsOrParticipants, 4).map(g => ({ ...g, category }));
          
          for (const group of groups) {
            const matches = generateRoundRobinMatches(group, tournament.id, category);
            group.matches = matches;
            updatedMatches.push(...matches);
          }
          
          updatedGroups.push(...groups);
          
        } else if (tournament.format === 'mixed') {
          let groups = hasPresetGroups 
            ? tournament.groups!.filter(g => g.category === category)
            : distributeToGroups(teamsOrParticipants, 4).map(g => ({ ...g, category }));
          
          for (const group of groups) {
            const matches = generateRoundRobinMatches(group, tournament.id, category);
            group.matches = matches;
            updatedMatches.push(...matches);
          }
          
          updatedGroups.push(...groups);
        }
      }

      const dataToSave: any = {
        matches: updatedMatches.map(m => ({
          id: m.id,
          tournamentId: m.tournamentId,
          category: m.category,
          round: m.round,
          matchNumber: m.matchNumber,
          groupId: m.groupId || null,
          participant1: m.participant1 || null,
          participant2: m.participant2 || null,
          courtId: m.courtId || null,
          scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
          scheduledTime: m.scheduledTime || null,
          status: m.status,
          scores: m.scores || [],
          winner: m.winner || null,
          nextMatchId: m.nextMatchId || null,
          previousMatch1Id: m.previousMatch1Id || null,
          previousMatch2Id: m.previousMatch2Id || null,
          createdAt: Timestamp.fromDate(m.createdAt),
          updatedAt: Timestamp.fromDate(m.updatedAt),
        })),
        groups: updatedGroups.map(g => ({
          id: g.id,
          name: g.name,
          category: g.category,
          participants: g.participants,
          matches: g.matches.map(m => ({
            id: m.id,
            tournamentId: m.tournamentId,
            category: m.category,
            round: m.round,
            matchNumber: m.matchNumber,
            groupId: m.groupId || null,
            participant1: m.participant1 || null,
            participant2: m.participant2 || null,
            courtId: m.courtId || null,
            scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
            scheduledTime: m.scheduledTime || null,
            status: m.status,
            scores: m.scores || [],
            winner: m.winner || null,
            nextMatchId: m.nextMatchId || null,
            previousMatch1Id: m.previousMatch1Id || null,
            previousMatch2Id: m.previousMatch2Id || null,
            createdAt: Timestamp.fromDate(m.createdAt),
            updatedAt: Timestamp.fromDate(m.updatedAt),
          })),
          standings: g.standings || [],
        })),
        teams: updatedTeams,
        status: 'ongoing',
        updatedAt: Timestamp.now(),
      };

      const tournamentRef = doc(db, 'tournaments', tournament.id);
      await updateDoc(tournamentRef, dataToSave);

      showSnackbar('Tạo lịch thi đấu thành công!', 'success');
    } catch (error) {
      console.error('ERROR generating schedule:', error);
      showSnackbar('Lỗi khi tạo lịch thi đấu: ' + (error as Error).message, 'error');
    }
  };

  const handleGenerateKnockoutPhase = async (tournament: Tournament, category: TournamentCategory) => {
    try {
      console.log('=== GENERATING KNOCKOUT PHASE ===');
      
      const categoryGroups = (tournament.groups || []).filter(g => g.category === category);
      
      if (categoryGroups.length === 0) {
        showSnackbar('Không tìm thấy bảng đấu cho nội dung này!', 'error');
        return;
      }
      
      const allGroupMatchesCompleted = categoryGroups.every(g => 
        g.matches.every(m => m.status === 'completed')
      );
      
      if (!allGroupMatchesCompleted) {
        showSnackbar('Vui lòng hoàn thành tất cả trận đấu vòng bảng trước khi tạo vòng knockout!', 'error');
        return;
      }
      
      const existingKnockoutMatches = (tournament.matches || []).filter(m => 
        m.category === category && m.round !== 'Group'
      );
      
      if (existingKnockoutMatches.length > 0) {
        if (!window.confirm('Vòng knockout đã tồn tại. Bạn có muốn tạo lại không?')) {
          return;
        }
      }
      
      const knockoutMatches = generateKnockoutFromGroups(categoryGroups, tournament.id, category);
      
      if (knockoutMatches.length === 0) {
        showSnackbar('Không thể tạo vòng knockout. Vui lòng kiểm tra dữ liệu!', 'error');
        return;
      }
      
      const updatedMatches = [
        ...(tournament.matches || []).filter(m => 
          m.category !== category || m.round === 'Group'
        ),
        ...knockoutMatches
      ];
      
      const dataToSave: any = {
        matches: updatedMatches.map(m => ({
          id: m.id,
          tournamentId: m.tournamentId,
          category: m.category,
          round: m.round,
          matchNumber: m.matchNumber,
          groupId: m.groupId || null,
          participant1: m.participant1 || null,
          participant2: m.participant2 || null,
          courtId: m.courtId || null,
          scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
          scheduledTime: m.scheduledTime || null,
          status: m.status,
          scores: m.scores || [],
          winner: m.winner || null,
          nextMatchId: m.nextMatchId || null,
          previousMatch1Id: m.previousMatch1Id || null,
          previousMatch2Id: m.previousMatch2Id || null,
          createdAt: Timestamp.fromDate(m.createdAt),
          updatedAt: Timestamp.fromDate(m.updatedAt),
        })),
        updatedAt: Timestamp.now(),
      };
      
      const tournamentRef = doc(db, 'tournaments', tournament.id);
      await updateDoc(tournamentRef, dataToSave);
      
      showSnackbar('Tạo vòng knockout thành công!', 'success');
    } catch (error) {
      console.error('ERROR generating knockout phase:', error);
      showSnackbar('Lỗi khi tạo vòng knockout: ' + (error as Error).message, 'error');
    }
  };

  const checkAndAutoGenerateKnockout = async (tournament: Tournament, category: TournamentCategory) => {
    if (tournament.format !== 'mixed') return;
    
    const categoryGroups = (tournament.groups || []).filter(g => g.category === category);
    if (categoryGroups.length === 0) return;
    
    const allGroupMatchesCompleted = categoryGroups.every(g => 
      g.matches.every(m => m.status === 'completed')
    );
    
    if (!allGroupMatchesCompleted) return;
    
    const existingKnockoutMatches = (tournament.matches || []).filter(m => 
      m.category === category && m.round !== 'Group'
    );
    
    if (existingKnockoutMatches.length > 0) return;
    
    console.log('Auto-generating knockout phase for', category);
    await handleGenerateKnockoutPhase(tournament, category);
  };

  const handleUpdateMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
    if (!selectedTournament) return;

    try {
      console.log('=== UPDATING MATCH ===');
      
      const updatedMatches = selectedTournament.matches.map(m =>
        m.id === matchId ? { ...m, ...updates, updatedAt: new Date() } : m
      );

      let updatedGroups = selectedTournament.groups ? [...selectedTournament.groups] : [];
      
      if (updates.status === 'completed') {
        const completedMatch = updatedMatches.find(m => m.id === matchId);
        
        if (completedMatch?.groupId) {
          const groupIndex = updatedGroups.findIndex(g => g.id === completedMatch.groupId);
          
          if (groupIndex !== -1) {
            updatedGroups[groupIndex] = {
              ...updatedGroups[groupIndex],
              matches: updatedGroups[groupIndex].matches.map(m =>
                m.id === matchId ? { ...m, ...updates, updatedAt: new Date() } : m
              ),
            };
            
            const newStandings = calculateGroupStandings(updatedGroups[groupIndex]);
            updatedGroups[groupIndex].standings = newStandings;
          }
        }
      }

      const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
      
      const dataToSave: any = {
        matches: updatedMatches.map(m => ({
          id: m.id,
          tournamentId: m.tournamentId,
          category: m.category,
          round: m.round,
          matchNumber: m.matchNumber,
          groupId: m.groupId || null,
          participant1: m.participant1 || null,
          participant2: m.participant2 || null,
          courtId: m.courtId || null,
          scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
          scheduledTime: m.scheduledTime || null,
          status: m.status,
          scores: m.scores || [],
          winner: m.winner || null,
          nextMatchId: m.nextMatchId || null,
          previousMatch1Id: m.previousMatch1Id || null,
          previousMatch2Id: m.previousMatch2Id || null,
          createdAt: Timestamp.fromDate(m.createdAt),
          updatedAt: Timestamp.fromDate(m.updatedAt),
        })),
        groups: updatedGroups.map(g => ({
          id: g.id,
          name: g.name,
          category: g.category,
          participants: g.participants,
          matches: g.matches.map(m => ({
            id: m.id,
            tournamentId: m.tournamentId,
            category: m.category,
            round: m.round,
            matchNumber: m.matchNumber,
            groupId: m.groupId || null,
            participant1: m.participant1 || null,
            participant2: m.participant2 || null,
            courtId: m.courtId || null,
            scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
            scheduledTime: m.scheduledTime || null,
            status: m.status,
            scores: m.scores || [],
            winner: m.winner || null,
            nextMatchId: m.nextMatchId || null,
            previousMatch1Id: m.previousMatch1Id || null,
            previousMatch2Id: m.previousMatch2Id || null,
            createdAt: Timestamp.fromDate(m.createdAt),
            updatedAt: Timestamp.fromDate(m.updatedAt),
          })),
          standings: g.standings || [],
        })),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(tournamentRef, dataToSave);

      if (updates.status === 'completed' && updates.winner) {
        const completedMatch = updatedMatches.find(m => m.id === matchId);
        
        if (completedMatch?.nextMatchId && !completedMatch.groupId) {
          const nextMatch = updatedMatches.find(m => m.id === completedMatch.nextMatchId);
          
          if (nextMatch) {
            const winnerParticipant = completedMatch.winner === completedMatch.participant1?.id
              ? completedMatch.participant1
              : completedMatch.participant2;

            if (!nextMatch.participant1) {
              nextMatch.participant1 = winnerParticipant;
            } else if (!nextMatch.participant2) {
              nextMatch.participant2 = winnerParticipant;
            }

            const finalDataToSave: any = {
              matches: updatedMatches.map(m => ({
                id: m.id,
                tournamentId: m.tournamentId,
                category: m.category,
                round: m.round,
                matchNumber: m.matchNumber,
                groupId: m.groupId || null,
                participant1: m.participant1 || null,
                participant2: m.participant2 || null,
                courtId: m.courtId || null,
                scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
                scheduledTime: m.scheduledTime || null,
                status: m.status,
                scores: m.scores || [],
                winner: m.winner || null,
                nextMatchId: m.nextMatchId || null,
                previousMatch1Id: m.previousMatch1Id || null,
                previousMatch2Id: m.previousMatch2Id || null,
                createdAt: Timestamp.fromDate(m.createdAt),
                updatedAt: Timestamp.fromDate(m.updatedAt),
              })),
              groups: updatedGroups.map(g => ({
                id: g.id,
                name: g.name,
                category: g.category,
                participants: g.participants,
                matches: g.matches.map(m => ({
                  id: m.id,
                  tournamentId: m.tournamentId,
                  category: m.category,
                  round: m.round,
                  matchNumber: m.matchNumber,
                  groupId: m.groupId || null,
                  participant1: m.participant1 || null,
                  participant2: m.participant2 || null,
                  courtId: m.courtId || null,
                  scheduledDate: m.scheduledDate ? Timestamp.fromDate(m.scheduledDate) : null,
                  scheduledTime: m.scheduledTime || null,
                  status: m.status,
                  scores: m.scores || [],
                  winner: m.winner || null,
                  nextMatchId: m.nextMatchId || null,
                  previousMatch1Id: m.previousMatch1Id || null,
                  previousMatch2Id: m.previousMatch2Id || null,
                  createdAt: Timestamp.fromDate(m.createdAt),
                  updatedAt: Timestamp.fromDate(m.updatedAt),
                })),
                standings: g.standings || [],
              })),
              updatedAt: Timestamp.now(),
            };

            await updateDoc(tournamentRef, finalDataToSave);
          }
        }
        
        // Auto-generate knockout nếu vòng bảng hoàn thành
        if (completedMatch?.groupId) {
          await checkAndAutoGenerateKnockout(selectedTournament, completedMatch.category);
        }
      }

      showSnackbar('Cập nhật trận đấu thành công!', 'success');
    } catch (error) {
      console.error('ERROR updating match:', error);
      showSnackbar('Lỗi khi cập nhật trận đấu: ' + (error as Error).message, 'error');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, tournament: Tournament) => {
    setAnchorEl(event.currentTarget);
    setMenuTournament(tournament);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTournament(null);
  };

  const handleDeleteTournament = async () => {
    if (!menuTournament) return;

    if (window.confirm(`Xóa giải đấu "${menuTournament.name}"?\n\nLưu ý: Tất cả dữ liệu lịch thi đấu, kết quả sẽ bị xóa vĩnh viễn!`)) {
      try {
        await deleteDoc(doc(db, 'tournaments', menuTournament.id));
        handleMenuClose();
        showSnackbar('Đã xóa giải đấu!', 'success');
      } catch (error) {
        console.error('Error deleting tournament:', error);
        showSnackbar('Lỗi khi xóa giải đấu: ' + (error as Error).message, 'error');
      }
    }
  };

  const handleViewDetail = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setDetailOpen(true);
  };

  const handleEditTournament = () => {
    setSelectedTournament(menuTournament);
    setFormOpen(true);
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      'draft': 'default',
      'registration': 'info',
      'ongoing': 'warning',
      'completed': 'success',
      'cancelled': 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Nháp',
      'registration': 'Đăng ký',
      'ongoing': 'Đang diễn ra',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
    };
    return labels[status] || status;
  };

  useEffect(() => {
    if (selectedTournament && detailOpen) {
      const updated = tournaments.find(t => t.id === selectedTournament.id);
      if (updated) {
        setSelectedTournament(updated);
      }
    }
  }, [tournaments, detailOpen]);

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🏆 Giải Đấu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý các giải đấu cầu lông
          </Typography>
        </Box>
        {currentUser?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTournament(null);
              setFormOpen(true);
            }}
            size="large"
          >
            Tạo Giải Đấu
          </Button>
        )}
      </Box>

      {tournaments.length === 0 ? (
        <Alert severity="info">
          Chưa có giải đấu nào. {currentUser?.role === 'admin' && 'Click "Tạo Giải Đấu" để bắt đầu.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {tournaments.map((tournament) => (
            <Grid item xs={12} sm={6} md={4} key={tournament.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { boxShadow: 6 },
                  transition: 'box-shadow 0.3s',
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    {currentUser?.role === 'admin' && (
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, tournament)}>
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Typography variant="h6" gutterBottom noWrap>
                    {tournament.name}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={getStatusLabel(tournament.status)}
                      size="small"
                      color={getStatusColor(tournament.status)}
                    />
                    <Chip
                      label={
                        tournament.format === 'single-elimination' 
                          ? 'Loại trực tiếp' 
                          : tournament.format === 'round-robin' 
                          ? 'Vòng tròn' 
                          : 'Kết hợp'
                      }
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarMonthIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDateOnly(tournament.startDate)} - {formatDateOnly(tournament.endDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {tournament.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {tournament.participants.length} người
                      {tournament.matches && tournament.matches.length > 0 && (
                        <> • {tournament.matches.length} trận</>
                      )}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Nội dung:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {tournament.categories.slice(0, 3).map(cat => (
                        <Chip key={cat} label={getCategoryName(cat)} size="small" />
                      ))}
                      {tournament.categories.length > 3 && (
                        <Chip label={`+${tournament.categories.length - 3}`} size="small" />
                      )}
                    </Box>
                  </Box>

                  {tournament.participants.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <AvatarGroup max={5}>
                        {tournament.participants.slice(0, 5).map(p => (
                          <Avatar key={p.id} alt={p.name} src={p.avatar} sx={{ width: 32, height: 32 }}>
                            {p.name.charAt(0)}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleViewDetail(tournament)}
                  >
                    Xem Chi Tiết
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEditTournament}>
          Chỉnh sửa
        </MenuItem>
        <MenuItem onClick={handleDeleteTournament} sx={{ color: 'error.main' }}>
          Xóa
        </MenuItem>
      </Menu>

      <TournamentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedTournament(null);
        }}
        onSubmit={handleCreateTournament}
        members={members}
        courts={courts}
        editTournament={selectedTournament || undefined}
      />

      <Dialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTournament(null);
        }}
        maxWidth="xl"
        fullWidth
      >
        {selectedTournament && (
          <TournamentDetail
            open={detailOpen}
            tournament={selectedTournament}
            courts={courts}
            onClose={() => {
              setDetailOpen(false);
              setSelectedTournament(null);
            }}
            onUpdateMatch={handleUpdateMatch}
            onGenerateSchedule={handleGenerateSchedule}
            onGenerateKnockout={handleGenerateKnockoutPhase}
          />
        )}

      {/* ===== THÊM SNACKBAR MỚI ===== */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: 3,
          }}
          variant="filled"
          icon={snackbar.severity === "info" ? <SwapHoriz /> : undefined}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Dialog>
    </Container>
  );
};

export default Tournaments;