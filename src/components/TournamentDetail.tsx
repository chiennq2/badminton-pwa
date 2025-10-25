import React, { useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  TextField,
  Snackbar,
} from "@mui/material";
import dayjs from "dayjs";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CasinoIcon from "@mui/icons-material/Casino";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";

import GroupStandingsView from "./GroupStandingsView";
import { Court } from "../types";
import {
  Tournament,
  TournamentMatch,
  TournamentCategory,
  TournamentParticipant,
  TournamentTeam,
} from "../types/tournament";
import { formatDateTime } from "../utils";
import { formatDateOnly } from "../utils/dateUtils";
import { validateMatchScore, getCategoryName } from "../utils/tournamentUtils";
import BracketView from "./BracketView";
import GroupWheelSpinner from "./GroupWheelSpinner";
import { SwapHoriz } from "@mui/icons-material";

interface TournamentDetailProps {
  open: boolean;
  tournament: Tournament;
  courts: Court[];
  onClose: () => void;
  onUpdateMatch: (matchId: string, updates: Partial<TournamentMatch>) => void;
  onGenerateSchedule: (tournament: Tournament) => void;
  onGenerateKnockout?: (
    tournament: Tournament,
    category: TournamentCategory
  ) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const TournamentDetail: React.FC<TournamentDetailProps> = ({
  open,
  tournament,
  courts,
  onClose,
  onUpdateMatch,
  onGenerateSchedule,
  onGenerateKnockout,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory>(
    tournament.categories[0]
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [wheelSpinnerOpen, setWheelSpinnerOpen] = useState(false);
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);
  const [editParticipantDialogOpen, setEditParticipantDialogOpen] =
    useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null
  );
  const [matchScores, setMatchScores] = useState<
    { set: number; p1: number; p2: number }[]
  >([
    { set: 1, p1: 0, p2: 0 },
    { set: 2, p1: 0, p2: 0 },
  ]);
  const [editingParticipant, setEditingParticipant] = useState<1 | 2>(1);
  const [newParticipantName, setNewParticipantName] = useState("");

  const getPotColor = (pot: string): string => {
    const colors: Record<string, string> = {
      "Pot 1": "#ffd700",
      "Pot 2": "#c0c0c0",
      "Pot 3": "#cd7f32",
      "Pot 4": "#8b4513",
      "Pot 5": "#696969",
    };
    return colors[pot] || "#999";
  };

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

  const getParticipantName = (
    p: TournamentParticipant | TournamentTeam | null | undefined
  ): string => {
    if (!p) return "TBD";
    if ("player1" in p) {
      return `${p.player1.name}/${p.player2.name}`;
    }
    return p.name;
  };

  const handleGenerateSchedule = () => {
    setScheduleDialogOpen(true);
  };

  const handleScheduleMethodSelect = (method: "quick" | "wheel") => {
    setScheduleDialogOpen(false);

    if (method === "quick") {
      onGenerateSchedule(tournament);
    } else {
      setWheelSpinnerOpen(true);
    }
  };

  const handleWheelComplete = (
    groups: Array<{
      name: string;
      participants: (TournamentParticipant | TournamentTeam)[];
    }>
  ) => {
    const tournamentGroups = groups.map((g) => ({
      id: `group_${g.name}`,
      name: g.name,
      category: selectedCategory,
      participants: g.participants,
      matches: [],
      standings: [],
    }));

    const updatedTournament: Tournament = {
      ...tournament,
      groups: tournamentGroups,
    };

    onGenerateSchedule(updatedTournament);
    setWheelSpinnerOpen(false);
  };

  const handleEditMatch = (match: TournamentMatch) => {
    setSelectedMatch(match);

    if (match.scores && match.scores.length > 0) {
      setMatchScores(
        match.scores.map((s) => ({
          set: s.set,
          p1: s.participant1Score,
          p2: s.participant2Score,
        }))
      );
    } else {
      setMatchScores([
        { set: 1, p1: 0, p2: 0 },
        { set: 2, p1: 0, p2: 0 },
      ]);
    }

    setEditMatchDialogOpen(true);
  };

  const handleEditParticipant = (
    match: TournamentMatch,
    participantNum: 1 | 2
  ) => {
    setSelectedMatch(match);
    setEditingParticipant(participantNum);

    const currentName =
      participantNum === 1
        ? getParticipantName(match.participant1)
        : getParticipantName(match.participant2);

    setNewParticipantName(currentName === "TBD" ? "" : currentName);
    setEditParticipantDialogOpen(true);
  };

  const handleSaveParticipantName = () => {
    if (!selectedMatch || !newParticipantName.trim()) return;

    const participantToUpdate =
      editingParticipant === 1
        ? selectedMatch.participant1
        : selectedMatch.participant2;

    if (!participantToUpdate) {
      showSnackbar("Không thể chỉnh sửa participant chưa được gán!", "error");
      return;
    }

    let updatedParticipant;

    if ("player1" in participantToUpdate) {
      // Team - split by /
      const names = newParticipantName.split("/").map((n) => n.trim());
      if (names.length === 2) {
        updatedParticipant = {
          ...participantToUpdate,
          player1: { ...participantToUpdate.player1, name: names[0] },
          player2: { ...participantToUpdate.player2, name: names[1] },
        };
      } else {
        showSnackbar("Tên đội phải có định dạng: Tên1/Tên2", "error");
        return;
      }
    } else {
      // Single participant
      updatedParticipant = {
        ...participantToUpdate,
        name: newParticipantName.trim(),
      };
    }

    const updates: Partial<TournamentMatch> =
      editingParticipant === 1
        ? { participant1: updatedParticipant }
        : { participant2: updatedParticipant };

    onUpdateMatch(selectedMatch.id, updates);
    setEditParticipantDialogOpen(false);
    setSelectedMatch(null);
  };

  const handleSaveMatchResult = () => {
    if (!selectedMatch) return;

    if (!validateMatchScore(matchScores)) {
      showSnackbar(
        "Tỉ số không hợp lệ! Kiểm tra lại điểm số các set.",
        "error"
      );
      return;
    }

    let p1Sets = 0,
      p2Sets = 0;
    matchScores.forEach((s) => {
      if (s.p1 > s.p2) p1Sets++;
      else p2Sets++;
    });

    const winner =
      p1Sets > p2Sets
        ? selectedMatch.participant1?.id
        : selectedMatch.participant2?.id;

    const updates: Partial<TournamentMatch> = {
      scores: matchScores.map((s) => ({
        set: s.set,
        participant1Score: s.p1,
        participant2Score: s.p2,
      })),
      winner,
      status: "completed",
      updatedAt: new Date(),
    };

    onUpdateMatch(selectedMatch.id, updates);
    setEditMatchDialogOpen(false);
    setSelectedMatch(null);
  };

  const addSet = () => {
    if (matchScores.length < 3) {
      setMatchScores([
        ...matchScores,
        { set: matchScores.length + 1, p1: 0, p2: 0 },
      ]);
    }
  };

  const removeSet = () => {
    if (matchScores.length > 2) {
      setMatchScores(matchScores.slice(0, -1));
    }
  };

  const categoryParticipants = tournament.participants.filter((p) =>
    p.categories.includes(selectedCategory)
  );

  const categoryMatches = (tournament.matches || []).filter(
    (m) => m.category === selectedCategory
  );

  const categoryGroups = (tournament.groups || []).filter(
    (g) => g.category === selectedCategory
  );

  const hasSchedule = categoryMatches.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">{tournament.name}</Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Chip
                  label={
                    tournament.format === "single-elimination"
                      ? "Loại Trực Tiếp"
                      : tournament.format === "round-robin"
                      ? "Vòng Tròn"
                      : "Kết Hợp"
                  }
                  color="primary"
                  size="small"
                />
                <Chip label={tournament.status} size="small" />
                <Chip
                  icon={<CalendarMonthIcon />}
                  label={`${formatDateOnly(
                    tournament.startDate
                  )} - ${formatDateOnly(tournament.endDate)}`}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Thông Tin" />
            <Tab label="Danh Sách" />
            <Tab label="Lịch Thi Đấu" />
            {tournament.format !== "round-robin" && <Tab label="Bracket" />}
            {tournament.format !== "single-elimination" && (
              <Tab label="Bảng Xếp Hạng" />
            )}
          </Tabs>
        </Paper>

        {/* Tab 0: Thông tin */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Chi Tiết Giải
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Địa điểm:</strong> {tournament.location}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Hạn đăng ký:</strong>{" "}
                    {formatDateOnly(tournament.registrationDeadline)}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Lệ phí:</strong>{" "}
                    {tournament.entryFee
                      ? `${tournament.entryFee.toLocaleString()} VNĐ`
                      : "Miễn phí"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nội dung:</strong>
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                  >
                    {tournament.categories.map((cat) => (
                      <Chip
                        key={cat}
                        label={getCategoryName(cat)}
                        size="small"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Thống Kê
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Tổng số người:</strong>{" "}
                    {tournament.participants.length}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Số nội dung:</strong> {tournament.categories.length}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Số trận đấu:</strong>{" "}
                    {tournament.matches?.length || 0}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Trận đã hoàn thành:</strong>{" "}
                    {tournament.matches?.filter((m) => m.status === "completed")
                      .length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {tournament.description && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Mô Tả
                    </Typography>
                    <Typography variant="body2">
                      {tournament.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {tournament.rules && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Quy Định
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {tournament.rules}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 1: Danh sách */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Nội dung</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as TournamentCategory)
                }
              >
                {tournament.categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {getCategoryName(cat)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="h6" gutterBottom>
            {getCategoryName(selectedCategory)} - {categoryParticipants.length}{" "}
            người
          </Typography>

          {categoryParticipants.length === 0 ? (
            <Alert severity="info">
              Chưa có thành viên nào đăng ký tham gia nội dung này
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {categoryParticipants.map((participant) => (
                <Grid item xs={12} sm={6} md={4} key={participant.id}>
                  <Card variant="outlined">
                    <CardContent
                      sx={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <Avatar
                        src={participant.avatar}
                        sx={{ bgcolor: getPotColor(participant.potLevel) }}
                      >
                        {participant.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {participant.name}
                        </Typography>
                        <Chip
                          label={participant.potLevel}
                          size="small"
                          sx={{
                            backgroundColor: getPotColor(participant.potLevel),
                            color: "white",
                            fontSize: "0.7rem",
                          }}
                        />
                        {participant.isWoman && (
                          <Chip
                            label="Nữ"
                            size="small"
                            color="secondary"
                            sx={{ ml: 0.5 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Tab 2: Lịch thi đấu */}
        <TabPanel value={tabValue} index={2}>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Nội dung</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as TournamentCategory)
                }
              >
                {tournament.categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {getCategoryName(cat)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!hasSchedule && categoryParticipants.length > 0 && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleGenerateSchedule}
              >
                Tạo Lịch Thi Đấu
              </Button>
            )}

            {tournament.format === "mixed" && categoryGroups.length > 0 && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<EmojiEventsIcon />}
                onClick={() => {
                  if (onGenerateKnockout) {
                    onGenerateKnockout(tournament, selectedCategory);
                  }
                }}
              >
                Tạo Vòng Knockout
              </Button>
            )}
          </Box>

          {categoryParticipants.length === 0 ? (
            <Alert severity="warning">
              Chưa có thành viên nào đăng ký tham gia nội dung này
            </Alert>
          ) : !hasSchedule ? (
            <Alert severity="info">
              Chưa có lịch thi đấu. Click "Tạo Lịch Thi Đấu" để bắt đầu.
            </Alert>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                {getCategoryName(selectedCategory)} - {categoryMatches.length}{" "}
                trận
              </Typography>

              {categoryMatches.map((match) => (
                <Card key={match.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {match.round} - Trận {match.matchNumber}
                          </Typography>
                          <Chip
                            label={
                              match.status === "completed"
                                ? "Hoàn thành"
                                : match.status === "scheduled"
                                ? "Đã lên lịch"
                                : "Chờ đấu"
                            }
                            size="small"
                            color={
                              match.status === "completed"
                                ? "success"
                                : "default"
                            }
                          />
                        </Box>
                        {match.groupId && (
                          <Typography variant="caption" color="text.secondary">
                            Bảng{" "}
                            {
                              tournament.groups?.find(
                                (g) => g.id === match.groupId
                              )?.name
                            }
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} sm={5}>
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              fontWeight="medium"
                              sx={{ flex: 1 }}
                            >
                              {getParticipantName(match.participant1)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleEditParticipant(match, 1)}
                              disabled={!match.participant1}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          <Typography
                            variant="h6"
                            color="primary.main"
                            sx={{ textAlign: "center", my: 1 }}
                          >
                            {match.scores.length > 0
                              ? match.scores
                                  .map(
                                    (s) =>
                                      `${s.participant1Score}-${s.participant2Score}`
                                  )
                                  .join(" ")
                              : "VS"}
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              fontWeight="medium"
                              sx={{ flex: 1 }}
                            >
                              {getParticipantName(match.participant2)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleEditParticipant(match, 2)}
                              disabled={!match.participant2}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        {match.scheduledDate ? (
                          <Box>
                            <Typography variant="body2">
                              📅 {formatDateTime(match.scheduledDate)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              🏸{" "}
                              {courts.find((c) => c.id === match.courtId)
                                ?.name || "TBD"}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Chưa xếp lịch
                          </Typography>
                        )}

                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditMatch(match)}
                          >
                            Nhập Kết Quả
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* Tab 3: Bracket */}
        {tournament.format !== "round-robin" && (
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Nội dung</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as TournamentCategory)
                  }
                >
                  {tournament.categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {getCategoryName(cat)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {categoryMatches.length === 0 ? (
              <Alert severity="info">
                Chưa có lịch thi đấu để hiển thị bracket
              </Alert>
            ) : (
              <BracketView matches={categoryMatches} />
            )}
          </TabPanel>
        )}

        {/* Tab 4: Bảng xếp hạng */}
        {tournament.format !== "single-elimination" && (
          <TabPanel
            value={tabValue}
            index={tournament.format === "round-robin" ? 3 : 4}
          >
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Nội dung</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as TournamentCategory)
                  }
                >
                  {tournament.categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {getCategoryName(cat)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {categoryGroups.length === 0 ? (
              <Alert severity="info">Chưa có bảng xếp hạng</Alert>
            ) : (
              <GroupStandingsView groups={categoryGroups} />
            )}
          </TabPanel>
        )}
      </DialogContent>

      {/* Dialog: Chọn phương thức tạo lịch */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chọn Phương Thức Chia Bảng</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: 2,
                  borderColor: "transparent",
                  "&:hover": { borderColor: "primary.main", boxShadow: 3 },
                  height: "100%",
                }}
                onClick={() => handleScheduleMethodSelect("quick")}
              >
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <FlashOnIcon
                    sx={{ fontSize: 60, color: "warning.main", mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Sắp Xếp Nhanh
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hệ thống tự động chia bảng theo thuật toán snake draft,
                    nhanh chóng và công bằng
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: 2,
                  borderColor: "transparent",
                  "&:hover": { borderColor: "primary.main", boxShadow: 3 },
                  height: "100%",
                }}
                onClick={() => handleScheduleMethodSelect("wheel")}
              >
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <CasinoIcon
                    sx={{ fontSize: 60, color: "success.main", mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Quay Bảng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Trải nghiệm quay bảng thú vị với hiệu ứng animation, xem
                    từng người được chia vào bảng
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Hủy</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Wheel Spinner */}
      <Dialog
        open={wheelSpinnerOpen}
        onClose={() => setWheelSpinnerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <GroupWheelSpinner
          participants={categoryParticipants}
          numGroups={4}
          category={selectedCategory}
          onComplete={handleWheelComplete}
          onCancel={() => setWheelSpinnerOpen(false)}
        />
      </Dialog>

      {/* Dialog: Chỉnh sửa tên participant/team */}
      <Dialog
        open={editParticipantDialogOpen}
        onClose={() => setEditParticipantDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Chỉnh Sửa Tên {editingParticipant === 1 ? "Đội 1" : "Đội 2"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Tên mới"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Nhập tên mới (đôi: Tên1/Tên2)"
              helperText="Đối với đôi, sử dụng dấu / để tách tên: VD: Nguyễn Văn A/Trần Văn B"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditParticipantDialogOpen(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveParticipantName}
            disabled={!newParticipantName.trim()}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Nhập kết quả trận đấu */}
      <Dialog
        open={editMatchDialogOpen}
        onClose={() => setEditMatchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nhập Kết Quả Trận Đấu</DialogTitle>
        <DialogContent dividers>
          {selectedMatch && (
            <Box>
              <Typography variant="h6" gutterBottom textAlign="center">
                {getParticipantName(selectedMatch.participant1)}
                <br />
                <Typography variant="body2" color="text.secondary">
                  VS
                </Typography>
                {getParticipantName(selectedMatch.participant2)}
              </Typography>

              <Box sx={{ mt: 3 }}>
                {matchScores.map((score, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 2,
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body1" sx={{ minWidth: 60 }}>
                      Set {score.set}:
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      label={
                        getParticipantName(selectedMatch.participant1)?.split(
                          "/"
                        )[0] || "P1"
                      }
                      value={score.p1}
                      onChange={(e) => {
                        const newScores = [...matchScores];
                        newScores[index].p1 = parseInt(e.target.value) || 0;
                        setMatchScores(newScores);
                      }}
                      inputProps={{ min: 0, max: 30 }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="h6">-</Typography>
                    <TextField
                      type="number"
                      size="small"
                      label={
                        getParticipantName(selectedMatch.participant2)?.split(
                          "/"
                        )[0] || "P2"
                      }
                      value={score.p2}
                      onChange={(e) => {
                        const newScores = [...matchScores];
                        newScores[index].p2 = parseInt(e.target.value) || 0;
                        setMatchScores(newScores);
                      }}
                      inputProps={{ min: 0, max: 30 }}
                      sx={{ width: 100 }}
                    />
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                {matchScores.length < 3 && (
                  <Button size="small" onClick={addSet}>
                    + Thêm Set 3
                  </Button>
                )}
                {matchScores.length > 2 && (
                  <Button size="small" color="error" onClick={removeSet}>
                    - Xóa Set 3
                  </Button>
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Tỉ số hợp lệ: 21-x (chênh ≥2) hoặc 30-29/29-30
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMatchDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveMatchResult}>
            Lưu Kết Quả
          </Button>
        </DialogActions>
      </Dialog>

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
  );
};

export default TournamentDetail;
