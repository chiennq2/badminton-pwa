import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Fab,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  PlayArrow,
  Stop,
  Schedule,
  Done,
  MoreVert,
  Warning,
  Payment,
  People,
  SwapHoriz,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSessions, useDeleteSession, useUpdateSession } from "../hooks";
import {
  formatDate,
  formatTime,
  formatCurrency,
  getSessionStatusText,
  getSessionStatusColor,
} from "../utils";
import SessionForm from "../components/SessionForm";
import SessionEditForm from "../components/SessionEditForm";
import { Session } from "../types";
import { Snackbar } from "@mui/material";

const SessionsMobile: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSessions();
  const deleteSessionMutation = useDeleteSession();
  const updateSessionMutation = useUpdateSession();

  const [tab, setTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
  if (isLoading)
    return (
      <Box
        sx={{
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Đang tải lịch đánh...
        </Typography>
      </Box>
    );

  const activeSessions = sessions?.filter((s) => s.status !== "completed") || [];
  const completedSessions =
    sessions?.filter((s) => s.status === "completed") || [];
  const displayed = tab === 0 ? activeSessions : completedSessions;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, session: any) => {
    setMenuAnchor(event.currentTarget);
    setSelectedSession(session);
  };
  const handleMenuClose = () => {
    setMenuAnchor(null);
    // setSelectedSession(null);
  };

  const handleStatusChange = async (newStatus: any, sessionId: any) => {
    if (!sessionId) return;
    await updateSessionMutation.mutateAsync({
      id: sessionId,
      data: { status: newStatus },
    }).then(() => {
      showSnackbar('Cập nhật trạng thái thành công!', 'success');
    }).catch(() => {
      showSnackbar('Cập nhật trạng thái thất bại!', 'error')});
    handleMenuClose();
  };

  const handleStatusLabel = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Bắt đầu';
      case 'ongoing':
        return 'Đang diễn ra';
      case 'completed':
        return 'Đã hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedSession) return;
    await deleteSessionMutation.mutateAsync(selectedSession.id);
    setDeleteConfirmOpen(false);
    handleMenuClose();
  };

  return (
    <Box sx={{ pb: 10, px: 2 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box sx={{ my: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Quản lý lịch đánh
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Xem và quản lý các lịch đánh cầu lông của bạn
          </Typography>
        </Box>
      </motion.div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
        sx={{
          mb: 2,
          "& .MuiTab-root": {
            textTransform: "none",
            fontSize: "0.9rem",
            fontWeight: 600,
          },
        }}
      >
        <Tab
          icon={<Schedule />}
          iconPosition="start"
          label={`Đang hoạt động (${activeSessions.length})`}
        />
        <Tab
          icon={<Done />}
          iconPosition="start"
          label={`Đã hoàn thành (${completedSessions.length})`}
        />
      </Tabs>

      {/* Empty state */}
      <AnimatePresence>
        {displayed.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Alert severity="info" sx={{ mt: 3 }}>
              {tab === 0
                ? "Chưa có lịch hoạt động nào."
                : "Chưa có lịch đã hoàn thành."}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of sessions */}
      <AnimatePresence>
        {displayed.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              sx={{
                mb: 2,
                borderRadius: 3,
                boxShadow: 3,
                backgroundColor:
                  session.status === "completed"
                    ? "#023902"
                    : session.status === "ongoing"
                    ? "#392d03"
                    : "#2b4051",
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "bold",
                      color: "text.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "80%",
                    }}
                  >
                    {session.name}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, session)}>
                    <MoreVert />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {formatDate(session.date)} • {formatTime(session.startTime)} -{" "}
                  {formatTime(session.endTime)}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    label={getSessionStatusText(session.status)}
                    color={getSessionStatusColor(session.status)}
                    size="small"
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      {session.currentParticipants}/{session.maxParticipants}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Payment fontSize="small" color="action" />
                    <Typography variant="body2" color="success.main">
                      {formatCurrency(session.totalCost)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>

              <CardActions
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  px: 2,
                  pb: 2,
                  pt: 0,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                >
                  Chi tiết
                </Button>

                {session.status !== "completed" && (
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    startIcon={
                      session.status === "scheduled" ? <PlayArrow /> : <Stop />
                    }
                    onClick={() =>
                      handleStatusChange(
                        session.status === "scheduled" ? "ongoing" : "completed", session.id
                      )
                    }
                  >
                    {handleStatusLabel(session.status)}
                  </Button>
                )}
              </CardActions>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
      >
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setCreateFormOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            boxShadow: 3,
            background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
            "&:hover": {
              background: "linear-gradient(45deg, #388e3c 30%, #4caf50 90%)",
            },
          }}
        >
          <Add />
        </Fab>
      </motion.div>

      {/* Menu hành động */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => navigate(`/sessions/${selectedSession?.id}`)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} /> Xem chi tiết
        </MenuItem>
        <MenuItem
          onClick={() => {
            setEditFormOpen(true);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Chỉnh sửa
        </MenuItem>
        {selectedSession?.status === "scheduled" && (
          <MenuItem onClick={() => handleStatusChange("ongoing", selectedSession.id)}>
            <PlayArrow fontSize="small" sx={{ mr: 1 }} /> Bắt đầu
          </MenuItem>
        )}
        {selectedSession?.status === "ongoing" && (
          <MenuItem onClick={() => handleStatusChange("completed", selectedSession.id)}>
            <Stop fontSize="small" sx={{ mr: 1 }} /> Hoàn thành
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setDeleteConfirmOpen(true);
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Xóa lịch
        </MenuItem>
      </Menu>

      {/* Form tạo & sửa */}
      <SessionForm
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onSuccess={() => setCreateFormOpen(false)}
      />
      {selectedSession && (
        <SessionEditForm
          open={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          onSuccess={() => setEditFormOpen(false)}
          session={selectedSession}
        />
      )}

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
          Xóa lịch đánh
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Warning sx={{ mr: 1 }} /> Hành động này không thể hoàn tác!
          </Alert>
          <Typography variant="body1">
            Bạn có chắc muốn xóa lịch{" "}
            <strong>{selectedSession?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteSessionMutation.isPending}
            startIcon={
              deleteSessionMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Delete />
              )
            }
          >
            Xóa
          </Button>
        </DialogActions>
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
    </Box>
  );
};

export default SessionsMobile;
