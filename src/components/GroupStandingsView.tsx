// components/GroupStandingsView.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Chip,
} from '@mui/material';
import { TournamentGroup, TournamentParticipant } from '../types/tournament';

interface Props {
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
}

const GroupStandingsView: React.FC<Props> = ({ groups, participants }) => {
  const getParticipantName = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    return participant?.memberName || 'Unknown';
  };

  if (groups.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Chưa có bảng xếp hạng
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hãy tạo lịch thi đấu để bắt đầu
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {groups.map((group) => (
        <Grid item xs={12} md={6} key={group.id}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {group.name}
              <Chip label={`${group.participants.length} người`} size="small" />
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng</TableCell>
                    <TableCell>Tên</TableCell>
                    <TableCell align="center">Trận</TableCell>
                    <TableCell align="center">Thắng</TableCell>
                    <TableCell align="center">Thua</TableCell>
                    <TableCell align="center">Games</TableCell>
                    <TableCell align="center">Điểm</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.standings.map((standing, index) => {
                    const gameDiff = standing.gamesWon - standing.gamesLost;
                    return (
                      <TableRow
                        key={standing.participantId}
                        sx={{
                          bgcolor: index === 0 ? 'success.light' : index === 1 ? 'info.light' : 'inherit',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {index + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getParticipantName(standing.participantId)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{standing.played}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {standing.won}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="error.main">
                            {standing.lost}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {standing.gamesWon}/{standing.gamesLost}
                            <Typography
                              component="span"
                              variant="caption"
                              color={gameDiff > 0 ? 'success.main' : gameDiff < 0 ? 'error.main' : 'text.secondary'}
                              sx={{ ml: 0.5 }}
                            >
                              ({gameDiff > 0 ? '+' : ''}
                              {gameDiff})
                            </Typography>
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={standing.points}
                            size="small"
                            color={index === 0 ? 'success' : index === 1 ? 'info' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Legend */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: 'success.light',
                    borderRadius: 0.5,
                  }}
                />
                <Typography variant="caption">Nhất bảng</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    bgcolor: 'info.light',
                    borderRadius: 0.5,
                  }}
                />
                <Typography variant="caption">Nhì bảng</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default GroupStandingsView;