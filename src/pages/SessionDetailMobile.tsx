// SessionDetailMobile.tsx - Mobile-Optimized Version
import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
} from "@mui/material";
import {
  ExpandMore,
  LocationOn,
  AttachMoney,
  Download,
  CheckCircle,
  Groups,
  Edit,
  AccountBalance,
  TrendingUp,
  Warning,
  Share,
  Image,
  List,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useSession, useUpdateSession, useMembers, useCourt } from "../hooks";
import { Settlement } from "../types";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getSessionStatusText,
  getSessionStatusColor,
  generateDetailedSettlements,
  calculateMemberSettlement,
} from "../utils";
import SessionEditForm from "../components/SessionEditForm";
import { useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import ExportableSessionSummary from "../components/ExportableSessionSummary";
import { convertTimestampToDate } from "../utils";
import { checkDarkModeTheme, useResponsive } from "../hooks/useResponsive";
import SessionDetailPassList from "../components/SessionDetailPassList";
import { ExpenseDetailMobile } from "../components/ExpenseDetailMobile";

const SessionDetailMobile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: court } = useCourt(session?.courtId || "");
  const { data: members } = useMembers();
  const updateSessionMutation = useUpdateSession();

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const { isMobile } = useResponsive();
  const { isDarkMode } = checkDarkModeTheme();

  const sessionMembers = useMemo(() => {
    if (!session) return [];
    return session.members.map((sm) => {
      const member = members?.find((m) => m.id === sm.memberId);
      return {
        id: sm.memberId,
        name: sm.memberName || member?.name || `Member ${sm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || "Không rõ",
        email: member?.email || "",
        isCustom: sm.isCustom || !member,
        isPresent: sm.isPresent,
        sessionMember: sm,
        replacementNote: sm.replacementNote,
      };
    });
  }, [session, members]);

  const waitingMembers = useMemo(() => {
    if (!session) return [];
    return session.waitingList.map((wm) => {
      const member = members?.find((m) => m.id === wm.memberId);
      return {
        id: wm.memberId,
        name: wm.memberName || member?.name || `Member ${wm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || "Không rõ",
        email: member?.email || "",
        isCustom: wm.isCustom || !member,
        priority: wm.priority,
        waitingMember: wm,
      };
    });
  }, [session, members]);

  const presentMembers = useMemo(() => {
    return session?.members.filter((m) => m.isPresent) || [];
  }, [session]);

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
    const memberPayments = presentMembersList.map((sessionMember) => {
      const settlement = calculateMemberSettlement(
        session,
        sessionMember.memberId,
        members
      );
      const isPaid =
        session.settlements?.find((s) => s.memberId === sessionMember.memberId)
          ?.isPaid || false;

      return {
        memberId: sessionMember.memberId,
        total: settlement.total,
        isPaid,
      };
    });

    const totalAmount = memberPayments.reduce((sum, m) => sum + m.total, 0);
    const paidAmount = memberPayments
      .filter((m) => m.isPaid)
      .reduce((sum, m) => sum + m.total, 0);
    const unpaidAmount = totalAmount - paidAmount;
    const paymentProgress =
      totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const paidCount = memberPayments.filter((m) => m.isPaid).length;

    return {
      totalAmount,
      paidAmount,
      unpaidAmount,
      paymentProgress,
      paidCount,
    };
  }, [session, members]);

  const handleAttendanceChange = async (memberId: string, isPresent: boolean) => {
    if (!session) return;

    try {
      const updatedMembers = session.members.map((member) =>
        member.memberId === memberId ? { ...member, isPresent } : member
      );

      const currentParticipants = updatedMembers.filter((m) => m.isPresent).length;
      const newSettlements = generateDetailedSettlements(
        { ...session, members: updatedMembers },
        members || []
      );

      queryClient.setQueryData(["session", id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        };
      });

      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          members: updatedMembers,
          currentParticipants,
          settlements: newSettlements,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });

      showSnackbar("Cập nhật điểm danh thành công!", "success");
    } catch (error) {
      console.error("Attendance change error:", error);
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      showSnackbar("Có lỗi xảy ra khi cập nhật điểm danh!", "error");
    }
  };

  const handlePaymentStatusChange = async (memberId: string, isPaid: boolean) => {
    if (!session) return;

    try {
      const currentSettlements = session.settlements || [];
      const updatedSettlements = currentSettlements.map((settlement) =>
        settlement.memberId === memberId ? { ...settlement, isPaid } : settlement
      );

      queryClient.setQueryData(["session", id], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, settlements: updatedSettlements };
      });

      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { settlements: updatedSettlements },
      });

      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });

      showSnackbar(
        `Đã ${isPaid ? "đánh dấu thanh toán" : "hủy thanh toán"} thành công!`,
        "success"
      );
    } catch (error) {
      console.error("Payment status change error:", error);
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      showSnackbar("Có lỗi xảy ra khi cập nhật trạng thái thanh toán!", "error");
    }
  };

  const handleNoteChange = async (memberId: string, note: string) => {
    if (!session) return;
    try {
      const updatedSettlements = (session.settlements || []).map((s) =>
        s.memberId === memberId ? { ...s, paymentNote: note } : s
      );

      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { settlements: updatedSettlements },
      });

      await queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      showSnackbar("✅ Đã cập nhật ghi chú!", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("❌ Lỗi khi cập nhật ghi chú!", "error");
    }
  };

  const handleCompleteSession = () => {
    if (!members || !session) return;
    const generatedSettlements = generateDetailedSettlements(session, members);
    setSettlements(generatedSettlements);
    setCompleteDialogOpen(true);
  };

  const confirmCompleteSession = async () => {
    if (!session) return;

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          status: "completed",
          settlements,
        },
      });

      setCompleteDialogOpen(false);
      showSnackbar("Hoàn thành lịch đánh thành công!", "success");
    } catch (error) {
      showSnackbar("Có lỗi xảy ra khi hoàn thành lịch!", "error");
    }
  };

  const handleExportImage = async () => {
    if (!session) return;

    try {
      const element = document.getElementById("exportable-session-summary");
      if (!element) {
        showSnackbar("Không tìm thấy nội dung để xuất!", "error");
        return;
      }

      showSnackbar("Đang tạo ảnh...", "success");

      const FIXED_WIDTH = 1200;
      const PADDING = 40;

      element.style.position = "fixed";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "9999";
      element.style.backgroundColor = "#ffffff";
      element.style.padding = `${PADDING}px`;
      element.style.width = `${FIXED_WIDTH}px`;
      element.style.maxWidth = "none";
      element.style.minHeight = "auto";
      element.style.overflow = "visible";
      element.style.boxSizing = "border-box";

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: FIXED_WIDTH + PADDING * 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        windowWidth: FIXED_WIDTH + PADDING * 2,
      });

      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.zIndex = "-1";
      element.style.width = "";
      element.style.maxWidth = "";
      element.style.padding = "";
      element.style.boxSizing = "";

      const safeDate = convertTimestampToDate(session.date);
      const dateStr = safeDate
        ? safeDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const fileName = `lich-${session.name.replace(/[^a-z0-9]/gi, "-")}-${dateStr}.png`;

      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSnackbar("✅ Xuất ảnh thành công!", "success");
    } catch (error) {
      console.error("Export error:", error);
      showSnackbar("❌ Có lỗi xảy ra khi xuất ảnh!", "error");
    }
  };

  const handleCopyMemberList = async () => {
    if (!session) return;

    try {
      const joinedList = sessionMembers
        .map((m, i) =>
          m.replacementNote
            ? `${i + 1}. ${m.name} <- ${m.replacementNote}`
            : `${i + 1}. ${m.name}`
        )
        .join("\n");

      const waitingList = waitingMembers
        .map((m, i) => {
          const replacementSource = sessionMembers.find(
            (sm) =>
              sm.replacementNote &&
              sm.replacementNote.toLowerCase().includes(m.name.toLowerCase())
          );

          if (replacementSource?.replacementNote) {
            return `${i + 1}. ${m.name} -> ${replacementSource.replacementNote}`;
          }
          return `${i + 1}. ${m.name}`;
        })
        .join("\n");

      const content = `${session.name}\n\nDanh sách:\n${joinedList}\n\nSảnh chờ:\n${waitingList}`;

      await navigator.clipboard.writeText(content);

      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobileDevice && navigator.share) {
        await navigator.share({
          title: session.name,
          text: content,
        });
      }

      showSnackbar(
        isMobileDevice
          ? "✅ Đã sao chép & chia sẻ danh sách!"
          : "✅ Đã sao chép danh sách vào clipboard!",
        "success"
      );
    } catch (error) {
      console.error("Clipboard error:", error);
      showSnackbar("❌ Không thể sao chép hoặc chia sẻ!", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOnRollCallChange = (data: any) => {
    handleAttendanceChange(data.memberId, data.isPresent);
  };

  const settlementColumns: GridColDef[] = useMemo(
    () => [
      {
        field: "memberName",
        headerName: "Tên thành viên",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "amount",
        headerName: "Số tiền",
        width: 120,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight="medium" color="success.main">
            {formatCurrency(params.value)}
          </Typography>
        ),
      },
    ],
    []
  );

  if (sessionLoading || !session || !id) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Mobile-specific SpeedDial actions
  const speedDialActions = [
    { icon: <Edit />, name: "Chỉnh sửa", onClick: () => setEditFormOpen(true) },
    { icon: <Image />, name: "Xuất ảnh", onClick: handleExportImage },
    { icon: <Share />, name: "Chia sẻ DS", onClick: handleCopyMemberList },
  ];

  if (session.status === "ongoing") {
    speedDialActions.unshift({
      icon: <CheckCircle />,
      name: "Hoàn thành",
      onClick: handleCompleteSession,
    });
  }

  return (
    <Box sx={{ pb: isMobile ? 10 : 3 }}>
      {/* Header - Responsive */}
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 1
          }}>
            <Box sx={{ flex: 1, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    fontSize: { xs: '1.125rem', sm: '1.5rem' },
                    flex: 1
                  }}
                >
                  {session.name}
                </Typography>
                <Chip
                  label={getSessionStatusText(session.status)}
                  color={getSessionStatusColor(session.status)}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                📅 {formatDate(session.date)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🕐 {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </Typography>
            </Box>

            {/* Desktop Action Buttons */}
            {!isMobile && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => setEditFormOpen(true)}
                  startIcon={<Edit />}
                >
                  Chỉnh sửa
                </Button>
                {session.status === "ongoing" && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCompleteSession}
                    startIcon={<CheckCircle />}
                  >
                    Hoàn thành
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={handleExportImage}
                  startIcon={<Download />}
                >
                  Xuất ảnh
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={handleCopyMemberList}
                  startIcon={<Groups />}
                >
                  Xuất DS
                </Button>
              </Stack>
            )}
          </Box>

          {/* Mobile Action Buttons - Hidden, use SpeedDial instead */}
          {isMobile && false && (
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              overflowX: 'auto',
              mt: 2,
              pb: 1,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: 'divider',
                borderRadius: 2 
              }
            }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEditFormOpen(true)}
                startIcon={<Edit />}
                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
              >
                Chỉnh sửa
              </Button>
              {session.status === "ongoing" && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleCompleteSession}
                  startIcon={<CheckCircle />}
                  sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
                >
                  Hoàn thành
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={handleExportImage}
                startIcon={<Download />}
                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
              >
                Xuất ảnh
              </Button>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={handleCopyMemberList}
                startIcon={<Groups />}
                sx={{ minWidth: 'fit-content', whiteSpace: 'nowrap' }}
              >
                Xuất DS
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Session Summary - Mobile Accordion */}
      <Accordion 
        defaultExpanded={false}
        sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ backgroundColor: 'action.hover' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            📊 Thông tin chi tiết
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <Stack spacing={2}>
            {/* Thông tin sân */}
            <Paper sx={{ p: 1.5, backgroundColor: 'primary.lighter', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                <LocationOn sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                THÔNG TIN SÂN
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Sân:</Typography>
                  <Typography variant="body2" fontWeight="medium">{court?.name || "..."}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {court?.location || "..."}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Giá:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {court ? formatCurrency(court.pricePerHour) : "..."}/giờ
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Chi phí */}
            <Paper sx={{ p: 1.5, backgroundColor: 'warning.lighter', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                <AttachMoney sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                CHI PHÍ
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tổng chi phí:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {formatCurrency(session.totalCost)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Chi phí/người:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(session.costPerPerson)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Số người:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {session.currentParticipants}/{session.maxParticipants}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Có mặt:</Typography>
                  <Typography variant="body2" fontWeight="medium" color="success.main">
                    {presentMembers.length} người
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Pass List & Attendance */}
      <SessionDetailPassList
        session={session}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["session", session.id] })}
        onRollCallChange={handleOnRollCallChange}
      />

      {/* Expense Detail - Mobile Version */}
      <Box sx={{ mt: 2 }}>
        <ExpenseDetailMobile
          session={session}
          members={members || []}
          onPaymentStatusChange={handlePaymentStatusChange}
          isUpdating={updateSessionMutation.isPending}
          onNoteChange={handleNoteChange}
        />
      </Box>

      {/* Payment Statistics - Mobile Cards */}
      {session.status === "completed" && (
        <Card sx={{ mt: 2, borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              💰 Tổng quan thanh toán
            </Typography>

            <Alert severity="info" sx={{ mb: 2, fontSize: '0.813rem' }}>
              Tiến độ: {Math.round(paymentStats.paymentProgress)}% - Đã thu{" "}
              {formatCurrency(paymentStats.paidAmount)} / {formatCurrency(paymentStats.totalAmount)}
            </Alert>

            <LinearProgress
              variant="determinate"
              value={paymentStats.paymentProgress}
              sx={{ mb: 2, height: 10, borderRadius: 5 }}
              color="success"
            />

            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'primary.light', borderRadius: 2 }}>
                  <AccountBalance sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    {formatCurrency(paymentStats.totalAmount)}
                  </Typography>
                  <Typography variant="caption">Tổng phải thu</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'success.light', borderRadius: 2 }}>
                  <CheckCircle sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    {formatCurrency(paymentStats.paidAmount)}
                  </Typography>
                  <Typography variant="caption">Đã thu được</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'error.light', borderRadius: 2 }}>
                  <Warning sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    {formatCurrency(paymentStats.unpaidAmount)}
                  </Typography>
                  <Typography variant="caption">Còn thiếu</Typography>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', backgroundColor: 'info.light', borderRadius: 2 }}>
                  <TrendingUp sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    {paymentStats.paidCount}/{presentMembers.length}
                  </Typography>
                  <Typography variant="caption">Đã thanh toán</Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Hidden Export Component */}
      <Box
        id="exportable-session-summary"
        sx={{ position: "absolute", left: "-9999px", top: 0 }}
      >
        <ExportableSessionSummary
          session={session}
          members={members || []}
          courtName={court?.name}
          isDarkMode={isDarkMode}
        />
      </Box>

      {/* Mobile SpeedDial for Quick Actions - Optional Alternative */}
      {isMobile && ( // Set to true if you want SpeedDial instead of buttons
        <SpeedDial
          ariaLabel="Session actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                setSpeedDialOpen(false);
                action.onClick();
              }}
            />
          ))}
        </SpeedDial>
      )}

      {/* Session Edit Form */}
      {session && (
        <SessionEditForm
          open={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          onSuccess={() => {
            setEditFormOpen(false);
            showSnackbar("Cập nhật lịch thành công!", "success");
          }}
          session={session}
        />
      )}

      {/* Complete Session Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            Hoàn thành lịch đánh
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
            Xác nhận hoàn thành lịch đánh. Chi phí sẽ được chia đều cho các thành viên có mặt.
          </Alert>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Paper sx={{ p: 1.5, backgroundColor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Thành viên có mặt:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {presentMembers.length} người
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Tổng chi phí:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {formatCurrency(session.totalCost)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Chi phí mỗi người:</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {formatCurrency(session.costPerPerson)}
                </Typography>
              </Box>
            </Paper>
          </Stack>

          {settlements.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Danh sách thanh toán:
              </Typography>
              <Stack spacing={1}>
                {settlements.map((settlement) => (
                  <Paper 
                    key={settlement.memberId} 
                    sx={{ 
                      p: 1.5, 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2">
                      {settlement.memberName}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {formatCurrency(settlement.amount)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setCompleteDialogOpen(false)}
            fullWidth={isMobile}
            variant="outlined"
          >
            Hủy
          </Button>
          <Button
            onClick={confirmCompleteSession}
            variant="contained"
            color="success"
            disabled={updateSessionMutation.isPending}
            fullWidth={isMobile}
            startIcon={updateSessionMutation.isPending ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {updateSessionMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionDetailMobile;