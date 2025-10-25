// src/components/tournament/BracketView.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { TournamentMatch, TournamentParticipant, TournamentTeam } from '../types/tournament';

interface BracketViewProps {
  matches: TournamentMatch[];
}

const BracketView: React.FC<BracketViewProps> = ({ matches }) => {
  const getParticipantName = (p: TournamentParticipant | TournamentTeam | null | undefined): string => {
    if (!p) return 'TBD';
    if ('player1' in p) {
      return `${p.player1.name}/${p.player2.name}`;
    }
    return p.name;
  };

  // Group matches by round
  const rounds = ['R1', 'R2', 'R16', 'R8', 'QF', 'SF', 'F'];
  const matchesByRound: Record<string, TournamentMatch[]> = {};
  
  rounds.forEach(round => {
    matchesByRound[round] = matches.filter(m => m.round === round);
  });

  const getRoundName = (round: string): string => {
    const names: Record<string, string> = {
      'R1': 'Vòng 1',
      'R2': 'Vòng 2',
      'R16': 'Vòng 1/16',
      'R8': 'Vòng 1/8',
      'QF': 'Tứ Kết',
      'SF': 'Bán Kết',
      'F': 'Chung Kết',
    };
    return names[round] || round;
  };

  if (matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">Chưa có trận đấu</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 3, minWidth: 'max-content', pb: 2 }}>
        {rounds.map(round => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches || roundMatches.length === 0) return null;

          return (
            <Box key={round} sx={{ minWidth: 280 }}>
              <Typography variant="h6" gutterBottom textAlign="center" sx={{ mb: 2 }}>
                {getRoundName(round)}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {roundMatches.map((match) => (
                  <Card
                    key={match.id}
                    sx={{
                      border: 2,
                      borderColor: match.status === 'completed' ? 'success.main' : 'divider',
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* Participant 1 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          mb: 1,
                          backgroundColor: match.winner === match.participant1?.id ? 'success.light' : 'background.default',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={match.winner === match.participant1?.id ? 'bold' : 'normal'}
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {getParticipantName(match.participant1)}
                        </Typography>
                        {match.scores.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {match.scores.map(s => (
                              <Chip
                                key={s.set}
                                label={s.participant1Score}
                                size="small"
                                sx={{ minWidth: 32, height: 24 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>

                      {/* VS Divider */}
                      <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                        VS
                      </Typography>

                      {/* Participant 2 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          mt: 1,
                          backgroundColor: match.winner === match.participant2?.id ? 'success.light' : 'background.default',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={match.winner === match.participant2?.id ? 'bold' : 'normal'}
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {getParticipantName(match.participant2)}
                        </Typography>
                        {match.scores.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {match.scores.map(s => (
                              <Chip
                                key={s.set}
                                label={s.participant2Score}
                                size="small"
                                sx={{ minWidth: 32, height: 24 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>

                      {/* Match info */}
                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <Chip
                          label={match.status === 'completed' ? 'Hoàn thành' : match.status === 'scheduled' ? 'Đã xếp lịch' : 'Chờ đấu'}
                          size="small"
                          color={match.status === 'completed' ? 'success' : match.status === 'scheduled' ? 'info' : 'default'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BracketView;