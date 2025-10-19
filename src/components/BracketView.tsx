// components/BracketView.tsx

import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { TournamentMatch } from '../types/tournament';

interface Props {
  matches: TournamentMatch[];
}

const BracketView: React.FC<Props> = ({ matches }) => {
  // Group matches by round
  const matchesByRound: Record<string, TournamentMatch[]> = {};
  
  matches.forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });

  const rounds = Object.keys(matchesByRound).sort();

  return (
    <Box sx={{ overflowX: 'auto', pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          minWidth: 'max-content',
          p: 2,
        }}
      >
        {rounds.map((round, roundIndex) => (
          <Box key={round} sx={{ minWidth: 250 }}>
            <Typography
              variant="h6"
              align="center"
              sx={{ mb: 3 }}
            >
              {round === 'F'
                ? 'Chung kết'
                : round === 'SF'
                ? 'Bán kết'
                : round === 'QF'
                ? 'Tứ kết'
                : `Vòng ${round}`}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                justifyContent: 'space-around',
                minHeight: '100%',
              }}
            >
              {matchesByRound[round]
                .sort((a, b) => a.matchNumber - b.matchNumber)
                .map((match) => (
                  <Paper
                    key={match.id}
                    sx={{
                      p: 2,
                      border: 2,
                      borderColor:
                        match.status === 'completed'
                          ? 'success.main'
                          : match.status === 'ongoing'
                          ? 'warning.main'
                          : 'divider',
                      position: 'relative',
                    }}
                  >
                    {/* Match Number */}
                    <Chip
                      label={`Trận ${match.matchNumber}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: 8,
                        bgcolor: 'background.paper',
                      }}
                    />

                    {/* Player 1 */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor:
                          match.winnerId === match.player1Id
                            ? 'success.light'
                            : 'background.default',
                        border: 1,
                        borderColor:
                          match.winnerId === match.player1Id
                            ? 'success.main'
                            : 'divider',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight:
                            match.winnerId === match.player1Id ? 'bold' : 'normal',
                        }}
                      >
                        {match.player1Name || 'TBD'}
                      </Typography>
                      {match.player1Score && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {match.player1Score.map((score, idx) => (
                            <Chip
                              key={idx}
                              label={score}
                              size="small"
                              sx={{ minWidth: 32 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    {/* VS Divider */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="center"
                      sx={{ display: 'block', my: 0.5 }}
                    >
                      vs
                    </Typography>

                    {/* Player 2 */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor:
                          match.winnerId === match.player2Id
                            ? 'success.light'
                            : 'background.default',
                        border: 1,
                        borderColor:
                          match.winnerId === match.player2Id
                            ? 'success.main'
                            : 'divider',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight:
                            match.winnerId === match.player2Id ? 'bold' : 'normal',
                        }}
                      >
                        {match.player2Name || 'TBD'}
                      </Typography>
                      {match.player2Score && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {match.player2Score.map((score, idx) => (
                            <Chip
                              key={idx}
                              label={score}
                              size="small"
                              sx={{ minWidth: 32 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    {/* Status Badge */}
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Chip
                        label={
                          match.status === 'scheduled'
                            ? 'Chưa đấu'
                            : match.status === 'ongoing'
                            ? 'Đang đấu'
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
                    </Box>
                  </Paper>
                ))}
            </Box>
          </Box>
        ))}
      </Box>

      {matches.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Chưa có lịch thi đấu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hãy tạo lịch thi đấu để bắt đầu
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BracketView;