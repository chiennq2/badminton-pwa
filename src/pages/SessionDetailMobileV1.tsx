import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  LinearProgress,
  Stack,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Edit,
  CheckCircle,
  Download,
  Groups,
  LocationOn,
  AttachMoney,
  Payment,
  AccountBalance,
  TrendingUp,
  Warning,
  Person,
  Schedule,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSession,
  useUpdateSession,
  useMembers,
  useCourt,
} from "../hooks";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getSessionStatusText,
  getSessionStatusColor,
  generateDetailedSettlements,
  calculateMemberSettlement,
  convertTimestampToDate,
} from "../utils";
import SessionEditForm from "../components/SessionEditForm";
import ExpenseDetail from "../components/ExpenseDetail";
import ExportableSessionSummary from "../components/ExportableSessionSummary";
import { checkDarkModeTheme } from "../hooks/useResponsive";
import html2canvas from "html2canvas";
import SessionDetailPassList from "../components/SessionDetailPassList";

const SessionDetailMobile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: court } = useCourt(session?.courtId || "");
  const { data: members } = useMembers();
  const updateSessionMutation = useUpdateSession();
  const { isDarkMode } = checkDarkModeTheme();

  // State
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Computed
  const presentMembers = useMemo(
    () => session?.members.filter((m) => m.isPresent) || [],
    [session]
  );

  const paymentStats = useMemo(() => {
    if (!session || !members) {
      return {
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        paymentProgress: 0,
        paidCount: 0,
      };
    }
    const presentMembersList = session.members.filter((m) => m.isPresent);
    const memberPayments = presentMembersList.map((sm) => {
      const settlement = calculateMemberSettlement(session, sm.memberId, members);
      const isPaid =
        session.settlements?.find((s) => s.memberId === sm.memberId)?.isPaid ||
        false;
      return { memberId: sm.memberId, total: settlement.total, isPaid };
    });
    const totalAmount = memberPayments.reduce((s, m) => s + m.total, 0);
    const paidAmount = memberPayments
      .filter((m) => m.isPaid)
      .reduce((s, m) => s + m.total, 0);
    return {
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      paymentProgress: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      paidCount: memberPayments.filter((m) => m.isPaid).length,
    };
  }, [session, members]);

  // Handlers
  const handleCompleteSession = () => {
    if (!members || !session) return;
    const generated = generateDetailedSettlements(session, members);
    setSettlements(generated);
    setCompleteDialogOpen(true);
  };

  const confirmCompleteSession = async () => {
    if (!session) return;
    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { status: "completed", settlements },
      });
      setCompleteDialogOpen(false);
      showSnackbar("Hoàn thành lịch đánh thành công!", "success");
    } catch {
      showSnackbar("Có lỗi xảy ra khi hoàn thành!", "error");
    }
  };

  const handleExportImage = async () => {
    if (!session) return;
    try {
      const element = document.getElementById("exportable-session-summary");
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2 });
      const safeDate = convertTimestampToDate(session.date);
      const dateStr = safeDate
        ? safeDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const fileName = `lich-${session.name}-${dateStr}.png`;
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSnackbar("✅ Xuất ảnh thành công!", "success");
    } catch {
      showSnackbar("❌ Xuất ảnh thất bại!", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") =>
    setSnackbar({ open: true, message, severity });

  // Table columns
  const settlementColumns: GridColDef[] = [
    {
      field: "memberName",
      headerName: "Thành viên",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar sx={{ mr: 1, width: 28, height: 28 }}>
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          {params.value}
        </Box>
      ),
    },
    {
      field: "amount",
      headerName: "Số tiền",
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" color="success.main">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
  ];

  if (sessionLoading || !session || !id) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Typography variant="h5" fontWeight="bold">
        {session.name}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: "wrap" }}>
        <Chip
          label={getSessionStatusText(session.status)}
          color={getSessionStatusColor(session.status)}
        />
        <Typography variant="body2" color="text.secondary">
          {formatDate(session.date)} • {formatTime(session.startTime)} -{" "}
          {formatTime(session.endTime)}
        </Typography>
      </Stack>
      <Stack spacing={1} sx={{ my: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditFormOpen(true)}
          fullWidth
        >
          Chỉnh sửa
        </Button>
        {session.status === "ongoing" && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleCompleteSession}
            fullWidth
          >
            Hoàn thành
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportImage}
          fullWidth
        >
          Xuất ảnh
        </Button>
        <Button
          variant="outlined"
          startIcon={<Groups />}
          fullWidth
        >
          Xuất danh sách
        </Button>
      </Stack>

      {/* Thông tin sân + chi phí */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <LocationOn sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">Thông tin sân</Typography>
          </Box>
          <Typography>Sân: {court?.name}</Typography>
          <Typography>Địa chỉ: {court?.location}</Typography>
          <Typography>Giá: {court ? formatCurrency(court.pricePerHour) : "..."} / giờ</Typography>

          <Box sx={{ display: "flex", alignItems: "center", mt: 2, mb: 1 }}>
            <AttachMoney sx={{ mr: 1, color: "warning.main" }} />
            <Typography variant="h6">Chi phí</Typography>
          </Box>
          <Typography>Tổng: {formatCurrency(session.totalCost)}</Typography>
          <Typography>Chi phí/người: {formatCurrency(session.costPerPerson)}</Typography>
          <Typography>Người tham gia: {session.currentParticipants}/{session.maxParticipants}</Typography>
          <Typography>Có mặt: {presentMembers.length}</Typography>
        </CardContent>
      </Card>

      {/* Danh sách thành viên + Pass list */}
      <SessionDetailPassList
        session={session}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["session", session.id] })}
        onRollCallChange={() => {}}
      />

      {/* Expense detail */}
      <ExpenseDetail
        session={session}
        members={members || []}
        onPaymentStatusChange={() => {}}
        isUpdating={updateSessionMutation.isPending}
        onNoteChange={() => {}}
      />

      {/* Tổng quan thanh toán */}
      {session.status === "completed" && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Payment sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="h6">Thanh toán</Typography>
            </Box>
            <Alert severity="info">
              <Typography variant="body2">
                Tiến độ: {Math.round(paymentStats.paymentProgress)}% - Đã thu{" "}
                {formatCurrency(paymentStats.paidAmount)} /{" "}
                {formatCurrency(paymentStats.totalAmount)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={paymentStats.paymentProgress}
                sx={{ mt: 1 }}
                color="success"
              />
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Export hidden */}
      <Box id="exportable-session-summary" sx={{ position: "absolute", left: "-9999px" }}>
        <ExportableSessionSummary
          session={session}
          members={members || []}
          courtName={court?.name}
          isDarkMode={isDarkMode}
        />
      </Box>

      {/* Edit form */}
      <SessionEditForm
        open={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        onSuccess={() => setEditFormOpen(false)}
        session={session}
      />

      {/* Complete dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} fullScreen>
        <DialogTitle>Hoàn thành lịch đánh</DialogTitle>
        <DialogContent>
          <Typography>Chi phí mỗi người: {formatCurrency(session.costPerPerson)}</Typography>
          <Box sx={{ height: 300, mt: 2 }}>
            <DataGrid
              rows={settlements}
              columns={settlementColumns}
              getRowId={(row) => row.memberId}
              hideFooter
              autoHeight
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="success"
            onClick={confirmCompleteSession}
            disabled={updateSessionMutation.isPending}
          >
            {updateSessionMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Xác nhận"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionDetailMobile;
