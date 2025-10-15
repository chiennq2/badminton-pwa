import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  ExpandMore,
  Person,
  AccessTime,
  LocationOn,
  AttachMoney,
  Download,
  CheckCircle,
  Schedule,
  Groups,
  Receipt,
  Payment,
  Edit,
  RadioButtonUnchecked,
  AccountBalance,
  TrendingUp,
  Warning,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import { useSession, useUpdateSession, useMembers, useCourt, useUsers } from "../hooks";
import { Settlement, WaitingListMember } from "../types";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getSessionStatusText,
  getSessionStatusColor,
  exportSessionImage,
  generateDetailedSettlements,
  calculateMemberSettlement,
} from "../utils";
import SessionEditForm from "../components/SessionEditForm";
import ExpenseDetail from "../components/ExpenseDetail";
import { useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import ExportableSessionSummary from "../components/ExportableSessionSummary";
import { getSafeDateForPicker, convertTimestampToDate } from "../utils";
import { checkDarkModeTheme, useResponsive } from "../hooks/useResponsive";
import SessionDetailPassList from "../components/SessionDetailPassList";
import ChangeHostDialog from "../components/ChangeHostDialog";

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useUsers();
  

  // ===== TẤT CẢ HOOKS PHẢI GỌI Ở ĐÂY - KHÔNG ĐIỀU KIỆN =====

  // Data hooks
  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: court } = useCourt(session?.courtId || "");
  const { data: members } = useMembers();
  const updateSessionMutation = useUpdateSession();

  // State hooks
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const { isMobile, isDesktop } = useResponsive();
  const {isDarkMode} = checkDarkModeTheme();

  const [hostDialogOpen, setHostDialogOpen] = useState(false);

  const handleChangeHost = async (newHost: any) => {
    if (!session) return;
    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          createdBy: newHost.id,
          qrImage: newHost.qrCode,
          host: {
            memberId: newHost.id,
            name: newHost.displayName,
            isCustom: false,
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      showSnackbar(`✅ Đã chuyển host sang ${newHost.displayName}!`, "success");
    } catch (error) {
      console.error(error);
      showSnackbar("❌ Lỗi khi chuyển host!", "error");
    } finally {
      setHostDialogOpen(false);
    }
  };

  

  // ===== COMPUTED VALUES - PHẢI GỌI TRƯỚC KHI CHECK LOADING =====
  const sessionMembers = useMemo(() => {
    if (!session) return [];

    return session.members.map((sm) => {
      const member = members?.find((m) => m.id === sm.memberId);

      return {
        id: sm.memberId,
        name:
          sm.memberName || member?.name || `Member ${sm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || "Không rõ",
        email: member?.email || "",
        isCustom: sm.isCustom || !member,
        isWoman: sm?.isWoman || false,
        isPresent: sm.isPresent,
        sessionMember: sm,
        replacementNote: sm.replacementNote,
        isWaitingPass: sm.isWaitingPass,
      };
    });
  }, [session, members]);

  const waitingMembers = useMemo(() => {
    if (!session) return [];

    return session.waitingList.map((wm) => {
      const member = members?.find((m) => m.id === wm.memberId);

      return {
        id: wm.memberId,
        name:
          wm.memberName || member?.name || `Member ${wm.memberId.slice(-4)}`,
        skillLevel: member?.skillLevel || "Không rõ",
        email: member?.email || "",
        isCustom: wm.isCustom || !member,
        isWoman: wm?.isWoman || false,
        priority: wm.priority,
        waitingMember: wm,
      };
    });
  }, [session, members]);

  const presentMembers = useMemo(() => {
    return session?.members.filter((m) => m.isPresent) || [];
  }, [session]);

  const currentSettlements = useMemo(() => {
    return session?.settlements || [];
  }, [session]);

  // ===== PAYMENT STATISTICS - TÍNH TOÁN ĐÚNG =====
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

    // Tính toán chi tiết cho từng thành viên
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

  // ===== EVENT HANDLERS =====
  const handleAttendanceChange = async (
    memberId: string,
    isPresent: boolean
  ) => {
    if (!session) return;

    try {
      const updatedMembers = session.members.map((member) =>
        member.memberId === memberId ? { ...member, isPresent } : member
      );

      const currentParticipants = updatedMembers.filter(
        (m) => m.isPresent
      ).length;

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

  const handlePaymentStatusChange = async (
    memberId: string,
    isPaid: boolean
  ) => {
    if (!session) return;

    try {
      const currentSettlements = session.settlements || [];
      const updatedSettlements = currentSettlements.map((settlement) =>
        settlement.memberId === memberId
          ? { ...settlement, isPaid }
          : settlement
      );

      queryClient.setQueryData(["session", id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          settlements: updatedSettlements,
        };
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
      showSnackbar(
        "Có lỗi xảy ra khi cập nhật trạng thái thanh toán!",
        "error"
      );
    }
  };

  const handleNoteChange = async (memberId: string, note: string) => {
    if (!session) return;
    try {
      const updatedSettlements = (session.settlements || []).map(s =>
        s.memberId === memberId ? { ...s, paymentNote: note } : s,
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

  const handleSexChange = async (memberId: string, isWoman: boolean) => {
    if (!session) return;
    try {
      const updatedSessionMember = (session.members || []).map(s =>
        s.memberId === memberId ? { ...s, isWoman: isWoman } : s,
      );
  
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { members: updatedSessionMember },
      });
  
      await queryClient.invalidateQueries({ queryKey: ["session", session.id] });
      showSnackbar("✅ Đã cập nhật giới tính!", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("❌ Lỗi khi cập nhật giới tính!", "error");
    }
  };
  
  const handleWaitingListReorder = async (result: DropResult) => {
    if (!result.destination || !session) return;

    const items = Array.from(session.waitingList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedWaitingList = items.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { waitingList: updatedWaitingList },
      });
    } catch (error) {
      showSnackbar("Có lỗi xảy ra khi sắp xếp lại sảnh chờ!", "error");
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

      // ✅ QUAN TRỌNG: Đặt width cố định để giữ tỉ lệ giống desktop
      const FIXED_WIDTH = 1200;
      const PADDING = 40;

      element.style.position = "fixed";
      element.style.left = "0";
      element.style.top = "0";
      element.style.zIndex = "9999";
      element.style.backgroundColor = "#ffffff";
      element.style.padding = `${PADDING}px`;
      element.style.width = `${FIXED_WIDTH}px`; // ✅ Width cố định
      element.style.maxWidth = "none";
      element.style.minHeight = "auto";
      element.style.overflow = "visible";
      element.style.boxSizing = "border-box";

      // Đợi render hoàn tất
      await new Promise((resolve) => setTimeout(resolve, 200));

      // ✅ Capture với html2canvas với width cố định
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // High quality
        width: FIXED_WIDTH + PADDING * 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        windowWidth: FIXED_WIDTH + PADDING * 2,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(
            "exportable-session-summary"
          );
          if (clonedElement) {
            clonedElement.style.fontFamily = "Inter, Roboto, Arial, sans-serif";
            clonedElement.style.width = `${FIXED_WIDTH}px`;
            clonedElement.style.boxSizing = "border-box";
          }
        },
      });

      // ✅ Reset lại style của element
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.zIndex = "-1";
      element.style.width = "";
      element.style.maxWidth = "";
      element.style.padding = "";
      element.style.boxSizing = "";

      // Tạo tên file an toàn
      const safeDate = convertTimestampToDate(session.date);
      const dateStr = safeDate
        ? safeDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const fileName = `lich-${session.name.replace(
        /[^a-z0-9]/gi,
        "-"
      )}-${dateStr}.png`;

      // Download image với quality 95%
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSnackbar("✅ Xuất ảnh thành công!", "success");
    } catch (error) {
      console.error("Export error:", error);

      // Đảm bảo reset element nếu có lỗi
      const element = document.getElementById("exportable-session-summary");
      if (element) {
        element.style.position = "absolute";
        element.style.left = "-9999px";
        element.style.zIndex = "-1";
        element.style.width = "";
        element.style.maxWidth = "";
        element.style.padding = "";
        element.style.boxSizing = "";
      }

      showSnackbar("❌ Có lỗi xảy ra khi xuất ảnh! Vui lòng thử lại.", "error");
    }
  };

  const handleCopyMemberList = async () => {
    if (!session) return;

    try {
      // ==== Danh sách tham gia ====
      const joinedList = sessionMembers
        // .filter((m) => m.isPresent)
        .map((m, i) =>
          m.replacementNote
            ? `${i + 1}. ${m.name} <- ${m.replacementNote}`
            : `${i + 1}. ${m.name}`
        )
        .join("\n");

      // Danh sách Pass
      const passList = sessionMembers.filter(m => m.isWaitingPass)
        .map((m, i) =>
          `${i + 1}. ${m.name}`
        ).join("\n");

      // ==== Sảnh chờ ====
      const waitingList = waitingMembers
        .map((m, i) => {
          const replacementSource = sessionMembers.find(
            (sm) =>
              sm.replacementNote &&
              sm.replacementNote
                .toString()
                .toLowerCase()
                .includes(m.name.toLowerCase())
          );

          if (replacementSource?.replacementNote) {
            return `${i + 1}. ${m.name} -> ${
              replacementSource.replacementNote
            }`;
          }

          return `${i + 1}. ${m.name}`;
        })
        .join("\n");

      // ==== Nội dung đầy đủ ====
      const content = `${session.name}\n\nDanh sách:\n${joinedList}\n\nList Pass:\n${passList}\n\nSảnh chờ:\n${waitingList}`;

      // Copy vào clipboard
      await navigator.clipboard.writeText(content);

      // Phát hiện mobile (dựa theo user agent)
      const isMobile =
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
          navigator.userAgent
        );

      if (isMobile && navigator.share) {
        // Gọi native share API
        await navigator.share({
          title: session.name,
          text: content,
        });
      }

      showSnackbar(
        isMobile
          ? "✅ Đã sao chép & chia sẻ danh sách thành công!"
          : "✅ Đã sao chép danh sách vào clipboard!",
        "success"
      );
    } catch (error) {
      console.error("Clipboard copy/share error:", error);
      showSnackbar("❌ Không thể sao chép hoặc chia sẻ!", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  // ===== DATA GRID COLUMNS FOR DIALOG =====
  const settlementColumns: GridColDef[] = useMemo(
    () => [
      {
        field: "memberName",
        headerName: "Tên thành viên",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
              {params.value.charAt(0).toUpperCase()}
            </Avatar>
            {params.value}
          </Box>
        ),
      },
      {
        field: "amount",
        headerName: "Số tiền",
        width: 150,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight="medium" color="success.main">
            {formatCurrency(params.value)}
          </Typography>
        ),
      },
    ],
    []
  );

  // ===== KIỂM TRA LOADING SAU KHI ĐÃ GỌI TẤT CẢ HOOKS =====
  if (sessionLoading || !session || !id) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // ✅ Event handler for check điểm danh
  const handleOnRollCallChange = (data: any) => {
    handleAttendanceChange(data.memberId, data.isPresent);
  }
  const handleOnRollSexChange = (data: any) => {
    handleSexChange(data.memberId, data.isWoman);
  }

  // ===== RENDER =====
  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" }, // ✅ Stack on mobile
          flexDirection: { xs: "column", sm: "row" }, // ✅ Column layout on mobile
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }} // ✅ Responsive font
          >
            {session.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mt: 1,
              flexWrap: "wrap", // ✅ Wrap on mobile
            }}
          >
            <Chip
              label={getSessionStatusText(session.status)}
              color={getSessionStatusColor(session.status)}
            />
            <Typography variant="body2" color="text.secondary">
              {formatDate(session.date)} • {formatTime(session.startTime)} -{" "}
              {formatTime(session.endTime)}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            width: { xs: "100%", sm: "auto" }, // ✅ Full width on mobile
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setEditFormOpen(true)}
            startIcon={<Edit />}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Chỉnh sửa
          </Button>
          {session.status === "ongoing" && (
            <Button
              variant="contained"
              color="success"
              onClick={handleCompleteSession}
              startIcon={<CheckCircle />}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
            >
              Hoàn thành
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={handleExportImage}
            startIcon={<Download />}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Xuất ảnh
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={handleCopyMemberList}
            startIcon={<Groups />}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Xuất danh sách
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setHostDialogOpen(true)}
            startIcon={<Person />}
            fullWidth={isMobile}
            size={isMobile ? "medium" : "large"}
          >
            Chuyển Host
          </Button>

        </Box>
      </Box>

      {/* Session Summary Card - For Export */}
      <Card
        id="session-summary"
        sx={{
          mb: 3,
          p: { xs: 1.5, sm: 2, md: 3 }, // ✅ Responsive padding
        }}
      >
        <CardContent>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <LocationOn
                  sx={{
                    mr: 1,
                    color: "primary.main",
                    fontSize: { xs: "1.2rem", sm: "1.5rem" }, // ✅ Responsive icon
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                >
                  Thông tin sân
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Sân:</strong> {court?.name || "Đang tải..."}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Địa chỉ:</strong> {court?.location || "Đang tải..."}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Giá:</strong>{" "}
                {court ? formatCurrency(court.pricePerHour) : "Đang tải..."}/giờ
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AttachMoney sx={{ mr: 1, color: "warning.main" }} />
                <Typography variant="h6">Chi phí</Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Tổng chi phí:</strong>{" "}
                {formatCurrency(session.totalCost)}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Chi phí/người:</strong>{" "}
                {formatCurrency(session.costPerPerson)}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Số người tham gia:</strong>{" "}
                {session.currentParticipants}/{session.maxParticipants}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                <strong>Có mặt:</strong> {presentMembers.length} người
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Members Attendance */}
        {/* <Grid item xs={12} md={6}> */}
          <Grid item xs={12} md={12}>
            <SessionDetailPassList 
                session={session} 
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ["session", session.id] })}
                onRollCallChange={handleOnRollCallChange}
                onSexChange={handleOnRollSexChange}
              />
          </Grid>
          {/* <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Person
                  sx={{
                    mr: 0.5,
                    color: "success.main",
                    fontSize: { xs: "1.2rem", sm: "1.5rem" },
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                >
                  Điểm danh thành viên ({presentMembers.length}/
                  {sessionMembers.length})
                </Typography>

              </Box>

              <List
                dense
                sx={{
                  maxHeight: { xs: 300, sm: 400 },
                  overflow: "auto",
                }}
              >
                {sessionMembers.map((member) => {
                  const isUpdating = updateSessionMutation.isPending;

                  return (
                    <ListItem
                      key={member.id}
                      dense
                      sx={{
                        px: { xs: 1, sm: 2 }, // ✅ Responsive padding
                        py: { xs: 0.5, sm: 1 },
                      }}
                    >
                      <ListItemIcon>
                        <Box sx={{ position: "relative" }}>
                          <Checkbox
                            checked={member.isPresent}
                            onChange={(e) =>
                              handleAttendanceChange(
                                member.id,
                                e.target.checked
                              )
                            }
                            disabled={
                              session.status === "completed" || isUpdating
                            }
                          />
                          {isUpdating && (
                            <CircularProgress
                              size={20}
                              sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                marginTop: "-10px",
                                marginLeft: "-10px",
                              }}
                            />
                          )}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              {member.name}
                              {member.isCustom && (
                                <Chip
                                  label="Tùy chỉnh"
                                  size="small"
                                  sx={{ ml: 1 }}
                                  variant="outlined"
                                  color="secondary"
                                />
                              )}
                              {member.isPresent && (
                                <Chip
                                  label="Có mặt"
                                  color="success"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                            {member.replacementNote && (
                              <Typography
                                variant="caption"
                                color="info.main"
                                sx={{
                                  display: "block",
                                  mt: 0.5,
                                  fontStyle: "italic",
                                }}
                              >
                                🔄 {member.replacementNote}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          member.isCustom
                            ? "Thành viên tùy chỉnh"
                            : member.skillLevel
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card> */}
        {/* </Grid> */}

        {/* Waiting List */}
        {/* <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Schedule sx={{ mr: 1, color: "warning.main" }} />
                <Typography variant="h6">
                  Sảnh chờ ({waitingMembers.length})
                </Typography>
              </Box>

              {waitingMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sảnh chờ trống
                </Typography>
              ) : (
                <List dense>
                  {waitingMembers.map((member, index) => (
                    <ListItem key={member.id}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {`${index + 1}. ${member.name}`}
                            {member.isCustom && (
                              <Chip
                                label="Tùy chỉnh"
                                size="small"
                                sx={{ ml: 1 }}
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          member.isCustom
                            ? "Thành viên tùy chỉnh"
                            : member.skillLevel
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid> */}

        {/* CHI TIẾT CHI PHÍ + DANH SÁCH THANH TOÁN - DÙNG CHUNG COMPONENT */}
        <Grid item xs={12}>
          <ExpenseDetail
            session={session}
            members={members || []}
            onPaymentStatusChange={handlePaymentStatusChange}
            isUpdating={updateSessionMutation.isPending}
            onNoteChange={handleNoteChange} 
          />
        </Grid>

        {/* QUẢN LÝ THANH TOÁN - CHỈ HIỂN THỊ THỐNG KÊ */}
        {session.status === "completed" && currentSettlements.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Payment sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Tổng quan thanh toán</Typography>
                </Box>

                {/* Payment Progress */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Tiến độ thanh toán:</strong>{" "}
                    {Math.round(paymentStats.paymentProgress)}% - Đã thu{" "}
                    {formatCurrency(paymentStats.paidAmount)} /{" "}
                    {formatCurrency(paymentStats.totalAmount)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={paymentStats.paymentProgress}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    color="success"
                  />
                </Alert>

                {/* Payment Statistics */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                      }}
                    >
                      <AccountBalance sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(paymentStats.totalAmount)}
                      </Typography>
                      <Typography variant="body2">Tổng phải thu</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        backgroundColor: "success.light",
                        color: "success.contrastText",
                      }}
                    >
                      <CheckCircle sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(paymentStats.paidAmount)}
                      </Typography>
                      <Typography variant="body2">Đã thu được</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        backgroundColor: "error.light",
                        color: "error.contrastText",
                      }}
                    >
                      <Warning sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(paymentStats.unpaidAmount)}
                      </Typography>
                      <Typography variant="body2">Còn thiếu</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        backgroundColor: "info.light",
                        color: "info.contrastText",
                      }}
                    >
                      <TrendingUp sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {paymentStats.paidCount}/{presentMembers.length}
                      </Typography>
                      <Typography variant="body2">
                        Người đã thanh toán
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mt: 2 }} icon={false}>
                  <Typography variant="caption">
                    💡 <strong>Mẹo:</strong> Xem chi tiết và cập nhật trạng thái
                    thanh toán trong phần "Danh sách thanh toán thành viên" phía
                    trên
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* COMPONENT ẨN ĐỂ XUẤT ẢNH */}
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

      {/* Chuyển host dialog */}
      <ChangeHostDialog
        open={hostDialogOpen}
        onClose={() => setHostDialogOpen(false)}
        members={users || []}
        currentHostId={session.createdBy}
        onSelect={handleChangeHost}
      />


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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Hoàn thành lịch đánh</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Xác nhận hoàn thành lịch đánh. Chi phí sẽ được chia đều cho các
            thành viên có mặt.
          </Typography>

          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thành viên có mặt: {presentMembers.length} người
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Tổng chi phí: {formatCurrency(session.totalCost)}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Chi phí mỗi người: {formatCurrency(session.costPerPerson)}
            </Typography>
          </Box>

          {settlements.length > 0 && (
            <Box sx={{ height: 300, width: "100%" }}>
              <DataGrid
                rows={settlements}
                columns={settlementColumns}
                getRowId={(row) => row.memberId}
                hideFooter
                disableRowSelectionOnClick
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={confirmCompleteSession}
            variant="contained"
            color="success"
            disabled={updateSessionMutation.isPending}
          >
            {updateSessionMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Xác nhận hoàn thành"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionDetail;
