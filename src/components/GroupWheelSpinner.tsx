// src/components/tournament/GroupWheelSpinner.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoIcon from '@mui/icons-material/Casino';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { TournamentParticipant, TournamentTeam, PotLevel, TournamentCategory } from '../types/tournament';
import { getPotValue, generateBalancedTeams, isDoublesCategory } from '../utils/tournamentUtils';

interface GroupWheelSpinnerProps {
  participants: (TournamentParticipant | TournamentTeam)[];
  numGroups: number;
  category: TournamentCategory;
  onComplete: (groups: Array<{ name: string; participants: (TournamentParticipant | TournamentTeam)[] }>) => void;
  onCancel: () => void;
}

const GroupWheelSpinner: React.FC<GroupWheelSpinnerProps> = ({
  participants,
  numGroups,
  category,
  onComplete,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0); // 0 = ghép cặp (nếu doubles), 1 = chia bảng
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [groups, setGroups] = useState<Array<{ name: string; participants: (TournamentParticipant | TournamentTeam)[] }>>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [itemsToDistribute, setItemsToDistribute] = useState<(TournamentParticipant | TournamentTeam)[]>([]);
  
  const groupNames = ['A', 'B', 'C', 'D'].slice(0, numGroups);
  const colors = ['#4caf50', '#2196f3', '#ff9800', '#f44336'];
  const isDoubles = isDoublesCategory(category);

  useEffect(() => {
    // Khởi tạo groups rỗng
    const initialGroups = groupNames.map(name => ({
      name,
      participants: [] as (TournamentParticipant | TournamentTeam)[],
    }));
    setGroups(initialGroups);

    if (!isDoubles) {
      // Đấu đơn: sắp xếp participants theo pot
      const sorted = [...participants].sort((a, b) => {
        return getPotValue(a.potLevel) - getPotValue(b.potLevel);
      });
      setItemsToDistribute(sorted);
      setActiveStep(1); // Bỏ qua bước ghép cặp
    } else {
      // Đấu đôi: bắt đầu từ bước 0 (ghép cặp)
      setActiveStep(0);
    }
  }, [participants, numGroups, category, isDoubles]);

  const getDisplayName = (item: TournamentParticipant | TournamentTeam): string => {
    if ('player1' in item) {
      return `${item.player1.name} (${item.player1.potLevel}) - ${item.player2.name} (${item.player2.potLevel})`;
    }
    return `${item.name} (${item.potLevel})`;
  };

  const getShortName = (item: TournamentParticipant | TournamentTeam): string => {
    if ('player1' in item) {
      return `${item.player1.name} - ${item.player2.name}`;
    }
    return item.name;
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

  // Bước 1: Quay ghép cặp (chỉ cho doubles)
  const startTeamPairing = async () => {
    setIsSpinning(true);
    
    const sortedParticipants = [...(participants as TournamentParticipant[])].sort((a, b) => {
      return getPotValue(a.potLevel) - getPotValue(b.potLevel);
    });

    const mid = Math.floor(sortedParticipants.length / 2);
    const strongHalf = sortedParticipants.slice(0, mid);
    const weakHalf = sortedParticipants.slice(mid).reverse();

    const newTeams: TournamentTeam[] = [];
    const maxPairs = Math.min(strongHalf.length, weakHalf.length);

    for (let i = 0; i < maxPairs; i++) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const player1 = strongHalf[i];
      const player2 = weakHalf[i];
      
      const avgPot = Math.round((getPotValue(player1.potLevel) + getPotValue(player2.potLevel)) / 2);
      const teamPot = `Pot ${avgPot}` as PotLevel;

      const team: TournamentTeam = {
        id: `team_${Date.now()}_${i}`,
        player1,
        player2,
        potLevel: teamPot,
        category,
      };

      newTeams.push(team);
      setTeams([...newTeams]);
      setCurrentIndex(i);
    }

    setIsSpinning(false);
  };

  const confirmTeamsAndContinue = () => {
    // Sắp xếp teams theo pot
    const sortedTeams = [...teams].sort((a, b) => {
      return getPotValue(a.potLevel) - getPotValue(b.potLevel);
    });
    
    setItemsToDistribute(sortedTeams);
    setActiveStep(1); // Chuyển sang bước chia bảng
  };

  // Bước 2: Quay chia bảng
  const startGroupDistribution = async () => {
    setIsSpinning(true);
    setCurrentIndex(0);
    setCurrentGroupIndex(0);

    const newGroups = groupNames.map(name => ({
      name,
      participants: [] as (TournamentParticipant | TournamentTeam)[],
    }));

    let groupIndex = 0;
    let direction = 1;

    for (let i = 0; i < itemsToDistribute.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      newGroups[groupIndex].participants.push(itemsToDistribute[i]);
      setGroups([...newGroups]);
      setCurrentIndex(i);
      setCurrentGroupIndex(groupIndex);

      groupIndex += direction;
      if (groupIndex >= numGroups) {
        groupIndex = numGroups - 1;
        direction = -1;
      } else if (groupIndex < 0) {
        groupIndex = 0;
        direction = 1;
      }
    }

    setIsSpinning(false);
  };

  const handleComplete = () => {
    onComplete(groups);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <EmojiEventsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          🎲 Quay Bảng Đấu
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isDoubles 
            ? `Ghép ${participants.length} người thành ${Math.floor(participants.length / 2)} cặp đôi, sau đó chia vào ${numGroups} bảng`
            : `Chia ${participants.length} người vào ${numGroups} bảng theo pot`
          }
        </Typography>
      </Box>

      {/* Stepper cho doubles */}
      {isDoubles && (
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Ghép Cặp Đôi</StepLabel>
          </Step>
          <Step>
            <StepLabel>Chia Bảng</StepLabel>
          </Step>
        </Stepper>
      )}

      {/* ===== BƯỚC 1: GHÉP CẶP (CHỈ CHO DOUBLES) ===== */}
      {activeStep === 0 && isDoubles && (
        <>
          {/* Animation ghép cặp */}
          <AnimatePresence>
            {isSpinning && currentIndex < Math.floor(participants.length / 2) && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <Paper
                  elevation={8}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    mb: 4,
                    background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
                    color: 'white',
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <PeopleIcon sx={{ fontSize: 80, mb: 2 }} />
                  </motion.div>
                  {teams[currentIndex] && (
                    <>
                      <Typography variant="h5" gutterBottom>
                        Đội {currentIndex + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, my: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6">{teams[currentIndex].player1.name}</Typography>
                          <Chip 
                            label={teams[currentIndex].player1.potLevel} 
                            size="small"
                            sx={{ backgroundColor: getPotColor(teams[currentIndex].player1.potLevel), color: 'white' }}
                          />
                        </Box>
                        <Typography variant="h4">+</Typography>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6">{teams[currentIndex].player2.name}</Typography>
                          <Chip 
                            label={teams[currentIndex].player2.potLevel} 
                            size="small"
                            sx={{ backgroundColor: getPotColor(teams[currentIndex].player2.potLevel), color: 'white' }}
                          />
                        </Box>
                      </Box>
                      <Chip
                        label={`Pot trung bình: ${teams[currentIndex].potLevel}`}
                        sx={{ 
                          backgroundColor: getPotColor(teams[currentIndex].potLevel), 
                          fontWeight: 'bold',
                          color: 'white',
                          fontSize: '1rem',
                        }}
                      />
                    </>
                  )}
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Danh sách teams đã ghép */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {teams.map((team, index) => (
              <Grid item xs={12} sm={6} md={4} key={team.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Đội {index + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            backgroundColor: getPotColor(team.player1.potLevel),
                            fontSize: '0.75rem',
                          }}
                        >
                          {team.player1.potLevel.replace('Pot ', '')}
                        </Avatar>
                        <Typography variant="body2">{team.player1.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            backgroundColor: getPotColor(team.player2.potLevel),
                            fontSize: '0.75rem',
                          }}
                        >
                          {team.player2.potLevel.replace('Pot ', '')}
                        </Avatar>
                        <Typography variant="body2">{team.player2.name}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Chip 
                        label={`Pot TB: ${team.potLevel}`} 
                        size="small"
                        sx={{ backgroundColor: getPotColor(team.potLevel), color: 'white' }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Controls bước 1 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            {teams.length === 0 && (
              <Button
                variant="contained"
                size="large"
                startIcon={<PeopleIcon />}
                onClick={startTeamPairing}
                disabled={isSpinning}
                sx={{
                  background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
                  boxShadow: '0 3px 5px 2px rgba(233, 30, 99, .3)',
                  px: 4,
                }}
              >
                Bắt Đầu Ghép Cặp
              </Button>
            )}

            {teams.length > 0 && !isSpinning && (
              <>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onCancel}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={confirmTeamsAndContinue}
                  sx={{
                    background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                    px: 4,
                  }}
                >
                  Tiếp Tục Chia Bảng ({teams.length} đội)
                </Button>
              </>
            )}
          </Box>
        </>
      )}

      {/* ===== BƯỚC 2: CHIA BẢNG ===== */}
      {activeStep === 1 && (
        <>
          {/* Wheel Animation chia bảng */}
          <AnimatePresence>
            {isSpinning && currentIndex < itemsToDistribute.length && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <Paper
                  elevation={8}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    mb: 4,
                    background: `linear-gradient(135deg, ${colors[currentGroupIndex]} 0%, ${colors[(currentGroupIndex + 1) % numGroups]} 100%)`,
                    color: 'white',
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <CasinoIcon sx={{ fontSize: 80, mb: 2 }} />
                  </motion.div>
                  <Typography variant="h5" gutterBottom>
                    {getDisplayName(itemsToDistribute[currentIndex])}
                  </Typography>
                  <Chip
                    label={itemsToDistribute[currentIndex].potLevel}
                    sx={{ 
                      backgroundColor: getPotColor(itemsToDistribute[currentIndex].potLevel), 
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    → Bảng {groupNames[currentGroupIndex]}
                  </Typography>
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Groups Display */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {groups.map((group, index) => (
              <Grid item xs={12} sm={6} md={12 / numGroups} key={group.name}>
                <Card
                  elevation={3}
                  sx={{
                    borderTop: `4px solid ${colors[index]}`,
                    minHeight: 300,
                    backgroundColor: currentGroupIndex === index && isSpinning ? 'action.selected' : 'background.paper',
                    transition: 'all 0.3s',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: colors[index], fontWeight: 'bold' }}>
                      Bảng {group.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {group.participants.length} {isDoubles ? 'đội' : 'người'}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      {group.participants.map((item, pIndex) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: pIndex * 0.1 }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              mb: 1,
                              backgroundColor: 'background.paper',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                backgroundColor: getPotColor(item.potLevel),
                                fontSize: '0.75rem',
                              }}
                            >
                              {item.potLevel.replace('Pot ', '')}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {getShortName(item)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {
                                  'player1' in item
                                    ? `${item.player1.potLevel} + ${item.player2.potLevel} = ${item.potLevel}`
                                    : item.potLevel
                                }
                              </Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Controls bước 2 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            {groups.every(g => g.participants.length === 0) && (
              <Button
                variant="contained"
                size="large"
                startIcon={<CasinoIcon />}
                onClick={startGroupDistribution}
                disabled={isSpinning}
                sx={{
                  background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                  boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                  px: 4,
                }}
              >
                Bắt Đầu Chia Bảng
              </Button>
            )}

            {groups.some(g => g.participants.length > 0) && !isSpinning && (
              <>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onCancel}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<EmojiEventsIcon />}
                  onClick={handleComplete}
                  disabled={groups.some(g => g.participants.length === 0)}
                  sx={{
                    background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                    px: 4,
                  }}
                >
                  Xác Nhận Bảng
                </Button>
              </>
            )}
          </Box>

          {/* Stats */}
          {groups.some(g => g.participants.length > 0) && (
            <Paper elevation={1} sx={{ p: 2, mt: 3, backgroundColor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                <strong>Tiến độ:</strong> {groups.reduce((sum, g) => sum + g.participants.length, 0)} / {itemsToDistribute.length} {isDoubles ? 'đội' : 'người'} đã chia
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default GroupWheelSpinner;