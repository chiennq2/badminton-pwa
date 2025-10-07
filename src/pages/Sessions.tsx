import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  DialogContent,
  Dialog,
  DialogTitle,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  PlayArrow,
  Stop,
  Pause,
  Assessment,
  People,
  Payment,
  CheckCircle,
  Warning,
  Schedule,
  Done,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSessions, useDeleteSession, useUpdateSession } from "../hooks";
import { Session } from "../types";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getSessionStatusText,
  getSessionStatusColor,
} from "../utils";
import SessionForm from "../components/SessionForm";
import SessionEditForm from "../components/SessionEditForm";
import { useResponsive } from "../hooks/useResponsive";
import MobileSessionsToolbar from "../components/MobileSessionsToolbar";

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSessions();
  const deleteSessionMutation = useDeleteSession();
  const updateSessionMutation = useUpdateSession();

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [currentTab, setCurrentTab] = useState(0); // 0: Đang hoạt động, 1: Đã hoàn thành
  const { isMobile } = useResponsive();

  const handleEdit = (session: Session) => {
    console.log("Opening edit form for session:", session.id);
    setEditingSession(session);
    setEditFormOpen(true);
  };

  const handleEditSuccess = () => {
    console.log("Edit form success");
    setEditFormOpen(false);
    setEditingSession(null);
    showSnackbar("Cập nhật lịch thành công!", "success");
  };

  const handleDeleteClick = (session: Session) => {
    console.log("Delete clicked for session:", session.id);
    setSessionToDelete(session);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) {
      console.log("No session to delete");
      return;
    }

    console.log("Confirming delete for session:", sessionToDelete.id);

    try {
      await deleteSessionMutation.mutateAsync(sessionToDelete.id);
      console.log("Session deleted successfully");
      showSnackbar("Xóa lịch thành công!", "success");
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      console.error("Error deleting session:", error);
      showSnackbar(
        `Có lỗi xảy ra khi xóa lịch: ${error.message || "Vui lòng thử lại"}`,
        "error"
      );
    }
  };

  const handleDeleteCancel = () => {
    console.log("Delete cancelled");
    setDeleteConfirmOpen(false);
    setSessionToDelete(null);
  };

  const handleStatusChange = async (
    sessionId: string,
    newStatus: Session["status"]
  ) => {
    try {
      await updateSessionMutation.mutateAsync({
        id: sessionId,
        data: { status: newStatus },
      });
      showSnackbar("Cập nhật trạng thái thành công!", "success");
    } catch (error: any) {
      console.error("Error updating status:", error);
      showSnackbar(
        `Có lỗi xảy ra khi cập nhật trạng thái: ${error.message}`,
        "error"
      );
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusActions = (session: Session) => {
    const actions = [];

    if (session.status === "scheduled") {
      actions.push(
        <GridActionsCellItem
          icon={
            <Tooltip title="Bắt đầu lịch đánh">
              <PlayArrow />
            </Tooltip>
          }
          label="Bắt đầu"
          onClick={() => handleStatusChange(session.id, "ongoing")}
          showInMenu
        />
      );
    }

    if (session.status === "ongoing") {
      actions.push(
        <GridActionsCellItem
          icon={
            <Tooltip title="Tạm dừng lịch đánh">
              <Pause />
            </Tooltip>
          }
          label="Tạm dừng"
          onClick={() => handleStatusChange(session.id, "scheduled")}
          showInMenu
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Hoàn thành lịch đánh">
              <Stop />
            </Tooltip>
          }
          label="Hoàn thành"
          onClick={() => handleStatusChange(session.id, "completed")}
          showInMenu
        />
      );
    }

    if (session.status === "completed") {
      actions.push(
        <GridActionsCellItem
          icon={
            <Tooltip title="Chuyển về đang diễn ra">
              <PlayArrow />
            </Tooltip>
          }
          label="Mở lại"
          onClick={() => handleStatusChange(session.id, "ongoing")}
          showInMenu
        />
      );
    }

    return actions;
  };

  const getPaymentProgress = (session: Session) => {
    if (session.status !== "completed" || !session.settlements?.length) {
      return { paid: 0, total: 0, percentage: 0 };
    }

    const presentMembers = session.members.filter((m) => m.isPresent);
    const paidMembers = session.settlements.filter((s) => {
      const memberIsPresent = session.members.find(
        (m) => m.memberId === s.memberId
      )?.isPresent;
      return memberIsPresent && s.isPaid;
    });

    return {
      paid: paidMembers.length,
      total: presentMembers.length,
      percentage:
        presentMembers.length > 0
          ? Math.round((paidMembers.length / presentMembers.length) * 100)
          : 0,
    };
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Tên lịch",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box
          sx={{ cursor: "pointer" }}
          onClick={() => navigate(`/sessions/${params.id}`)}
        >
          <Typography
            variant="body2"
            fontWeight="medium"
            color="primary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {params.value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            ID: {params.id.toString().slice(-8)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "date",
      headerName: "Ngày",
      width: 140,
      minWidth: 120,
      renderCell: (params) => {
        try {
          return (
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {formatDate(params.value)}
            </Typography>
          );
        } catch (error) {
          console.error("Date render error:", error, params.value);
          return (
            <Typography variant="body2" color="error">
              Lỗi ngày
            </Typography>
          );
        }
      },
    },
    {
      field: "startTime",
      headerName: "Thời gian",
      width: 140,
      minWidth: 100,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            fontSize: { xs: "0.7rem", sm: "0.875rem" },
          }}
        >
          {formatTime(params.value)} - {formatTime(params.row.endTime)}
        </Typography>
      ),
    },
    {
      field: "currentParticipants",
      headerName: "Thành viên",
      width: 120,
      minWidth: 100,
      renderCell: (params) => {
        const presentCount =
          params.row.members?.filter((m: any) => m.isPresent).length || 0;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <People
              fontSize="small"
              sx={{
                mr: 0.5,
                color: "text.secondary",
                display: { xs: "none", sm: "inline" },
              }}
            />
            <Typography
              variant="body2"
              sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
            >
              {params.value}/{params.row.maxParticipants}
              {params.row.status === "completed" && (
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{
                    display: "block",
                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  }}
                >
                  {presentCount} có mặt
                </Typography>
              )}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "totalCost",
      headerName: "Chi phí",
      width: 130,
      minWidth: 100,
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontWeight="medium"
          color="success.main"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 140,
      renderCell: (params) => {
        const session = params.row as Session;
        const paymentProgress = getPaymentProgress(session);

        return (
          <Box>
            <Chip
              label={getSessionStatusText(params.value)}
              color={getSessionStatusColor(params.value)}
              size="small"
              variant={params.value === "completed" ? "filled" : "outlined"}
            />
            {params.value === "completed" && paymentProgress.total > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                <Payment
                  fontSize="small"
                  sx={{ mr: 0.5, color: "text.secondary" }}
                />
                <Typography variant="caption" color="text.secondary">
                  {paymentProgress.paid}/{paymentProgress.total} (
                  {paymentProgress.percentage}%)
                </Typography>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Thao tác",
      width: 160,
      getActions: (params) => {
        const session = params.row as Session;
        const baseActions = [
          <GridActionsCellItem
            icon={<Visibility />}
            label="Xem chi tiết"
            onClick={() => navigate(`/sessions/${params.id}`)}
          />,
          <GridActionsCellItem
            icon={
              <Tooltip
                title={`Chỉnh sửa lịch đánh${
                  session.status === "completed" ? " (bao gồm thanh toán)" : ""
                }`}
              >
                <Edit />
              </Tooltip>
            }
            label="Chỉnh sửa"
            onClick={() => handleEdit(session)}
            showInMenu
          />,
        ];

        baseActions.push(...getStatusActions(session));

        baseActions.push(
          <GridActionsCellItem
            icon={<Delete />}
            label="Xóa"
            onClick={() => handleDeleteClick(session)}
            showInMenu
          />
        );

        return baseActions;
      },
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Đang tải danh sách lịch đánh...
        </Typography>
      </Box>
    );
  }

  // ✅ PHÂN LOẠI SESSIONS THEO TRẠNG THÁI
  const activeSessions = sessions?.filter((s) => s.status !== "completed") || [];
  const completedSessions = sessions?.filter((s) => s.status === "completed") || [];
  
  // Statistics cho các trạng thái
  const scheduledSessions = activeSessions.filter((s) => s.status === "scheduled");
  const ongoingSessions = activeSessions.filter((s) => s.status === "ongoing");
  const totalRevenue = completedSessions.reduce((sum, s) => sum + s.totalCost, 0);

  const totalCollected = completedSessions.reduce((sum, session) => {
    return (
      sum +
      (session.settlements?.reduce((settlementSum, settlement) => {
        const memberIsPresent = session.members.find(
          (m) => m.memberId === settlement.memberId
        )?.isPresent;
        return (
          settlementSum +
          (memberIsPresent && settlement.isPaid ? settlement.amount : 0)
        );
      }, 0) || 0)
    );
  }, 0);

  // ✅ LẤY SESSIONS THEO TAB HIỆN TẠI
  const displayedSessions = currentTab === 0 ? activeSessions : completedSessions;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
          >
            Quản lý lịch đánh
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
              display: { xs: "none", sm: "block" },
            }}
          >
            Tạo, chỉnh sửa và theo dõi các lịch đánh cầu lông. Có thể chỉnh sửa
            và xóa tất cả các lịch.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateFormOpen(true)}
          size={isMobile ? "medium" : "large"}
          fullWidth={isMobile}
          sx={{
            background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
            "&:hover": {
              background: "linear-gradient(45deg, #388e3c 30%, #4caf50 90%)",
            },
          }}
        >
          Tạo lịch mới
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid
        container
        spacing={{ xs: 1.5, sm: 3 }}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent
              sx={{
                textAlign: "center",
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography
                variant="h4"
                fontWeight="bold"
                color="primary.main"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                {sessions?.length || 0}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Tổng số lịch
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent
              sx={{
                textAlign: "center",
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography
                variant="h4"
                fontWeight="bold"
                color="warning.main"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                {ongoingSessions.length}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Đang diễn ra
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent
              sx={{
                textAlign: "center",
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography
                variant="h4"
                fontWeight="bold"
                color="info.main"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                {scheduledSessions.length}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Đã lên lịch
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent
              sx={{
                textAlign: "center",
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography
                variant="h4"
                fontWeight="bold"
                color="success.main"
                sx={{ fontSize: { xs: "1.25rem", sm: "2rem" } }}
              >
                {formatCurrency(totalCollected)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Đã thu được
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  display: { xs: "none", sm: "block" },
                }}
              >
                /{formatCurrency(totalRevenue)} tổng
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{
          mb: { xs: 2, sm: 3 },
          display: { xs: "none", sm: "flex" },
        }}
      >
        <Typography variant="body2">
          <strong>Lưu ý:</strong> Bạn có thể chỉnh sửa và xóa tất cả các lịch
          đánh, kể cả những lịch đã hoàn thành. Với lịch hoàn thành, bạn có thể
          quản lý trạng thái thanh toán của từng thành viên.
        </Typography>
      </Alert>

      {/* ✅ TABS PHÂN LOẠI SESSIONS */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{
              px: 2,
              "& .MuiTab-root": {
                fontSize: { xs: "0.875rem", sm: "1rem" },
                minHeight: { xs: 48, sm: 64 },
              },
            }}
          >
            <Tab
              icon={<Schedule />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={activeSessions.length}
                  color="primary"
                  sx={{ "& .MuiBadge-badge": { right: 0, top: 10 } }}
                >
                  <Typography variant="inherit" sx={{ pr: 2 }}>
                    Đang hoạt động
                  </Typography>
                </Badge>
              }
              sx={{ textTransform: "none" }}
            />
            <Tab
              icon={<Done />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={completedSessions.length}
                  color="success"
                  sx={{ "& .MuiBadge-badge": { right: 0, top: 10 } }}
                >
                  <Typography variant="inherit" sx={{ pr: 2 }}>
                    Đã hoàn thành
                  </Typography>
                </Badge>
              }
              sx={{ textTransform: "none" }}
            />
          </Tabs>
        </Box>

        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {currentTab === 0 ? (
                <>
                  Lịch đang hoạt động ({activeSessions.length})
                  {scheduledSessions.length > 0 && (
                    <Chip
                      label={`${scheduledSessions.length} đã lên lịch`}
                      size="small"
                      color="info"
                      sx={{ ml: 1 }}
                    />
                  )}
                  {ongoingSessions.length > 0 && (
                    <Chip
                      label={`${ongoingSessions.length} đang chơi`}
                      size="small"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </>
              ) : (
                <>
                  Lịch đã hoàn thành ({completedSessions.length})
                  <Chip
                    label={`Tổng: ${formatCurrency(totalRevenue)}`}
                    size="small"
                    color="success"
                    sx={{ ml: 1 }}
                  />
                </>
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              height: {
                xs: "calc(100vh - 480px)",
                sm: 500,
                md: 600,
              },
              minHeight: { xs: 350, sm: 400 },
              width: "100%",
              "& .MuiDataGrid-root": {
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "background.paper",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              },
              "& .MuiDataGrid-cell": {
                padding: { xs: "8px 4px", sm: "8px 16px" },
              },
            }}
          >
            <DataGrid
              rows={displayedSessions}
              columns={columns}
              slots={{ toolbar: MobileSessionsToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: {
                    debounceMs: 500,
                    placeholder: "Tìm kiếm...",
                    sx: {
                      width: { xs: "100%", sm: "auto" },
                      mb: { xs: 1, sm: 0 },
                    },
                  },
                  csvOptions: {
                    fileName: `danh-sach-lich-${currentTab === 0 ? "hoat-dong" : "hoan-thanh"}-${
                      new Date().toISOString().split("T")[0]
                    }`,
                  },
                  sx: {
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1,
                    p: { xs: 1, sm: 2 },
                  },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
                sorting: {
                  sortModel: [{ field: "date", sort: "desc" }],
                },
                columns: {
                  columnVisibilityModel: {
                    name: true,
                    date: true,
                    startTime: true,
                    currentParticipants: true,
                    totalCost: true,
                    status: true,
                    actions: true,
                  },
                },
              }}
              checkboxSelection={!isMobile}
              disableRowSelectionOnClick
              density={isMobile ? "compact" : "comfortable"}
              sx={{
                "& .MuiDataGrid-row": {
                  minHeight: { xs: "48px !important", sm: "52px !important" },
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add session"
        onClick={() => setCreateFormOpen(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #388e3c 30%, #4caf50 90%)",
          },
        }}
      >
        <Add />
      </Fab>

      {/* Session Creation Form */}
      <SessionForm
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onSuccess={() => {
          setCreateFormOpen(false);
          showSnackbar("Tạo lịch thành công!", "success");
        }}
      />

      {/* Session Edit Form */}
      {editingSession && (
        <SessionEditForm
          open={editFormOpen}
          onClose={() => {
            console.log("Closing edit form");
            setEditFormOpen(false);
            setEditingSession(null);
          }}
          onSuccess={handleEditSuccess}
          session={editingSession}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Delete sx={{ mr: 1 }} />
            Xác nhận xóa lịch đánh
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Warning sx={{ mr: 1 }} />
              <Typography variant="body2">
                <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác!
              </Typography>
            </Box>
          </Alert>

          <Typography variant="body1" gutterBottom>
            Bạn có chắc chắn muốn xóa lịch đánh{" "}
            <strong>"{sessionToDelete?.name}"</strong>?
          </Typography>

          {sessionToDelete && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <strong>Ngày:</strong> {formatDate(sessionToDelete.date)} •{" "}
                {sessionToDelete.startTime} - {sessionToDelete.endTime}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Thành viên:</strong>{" "}
                {sessionToDelete.currentParticipants} người
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Chi phí:</strong>{" "}
                {formatCurrency(sessionToDelete.totalCost)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Trạng thái:</strong>{" "}
                {getSessionStatusText(sessionToDelete.status)}
              </Typography>
              {sessionToDelete.status === "completed" && (
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                  <strong>Chú ý:</strong> Đây là lịch đã hoàn thành. Việc xóa sẽ
                  mất toàn bộ dữ liệu thanh toán.
                </Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            ID lịch đánh: <code>{sessionToDelete?.id}</code>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleDeleteCancel} size="large" variant="outlined">
            Hủy bỏ
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteSessionMutation.isPending}
            size="large"
            startIcon={
              deleteSessionMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Delete />
              )
            }
            sx={{ minWidth: 140 }}
          >
            {deleteSessionMutation.isPending ? "Đang xóa..." : "Xóa lịch đánh"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Sessions;