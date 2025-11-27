import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Divider,
  Paper,
  Avatar,
  ButtonGroup,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  ListItemAvatar,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import {
  Add,
  Remove,
  Delete,
  PersonAdd,
  Groups,
  Edit,
  Warning,
  Save,
  Cancel,
  Payment,
  AccountBalance,
  CheckCircle,
  RadioButtonUnchecked,
  DragHandle,
  Schedule,
  SwapHoriz,
  Close,
  Person,
  AttachMoney,
  Upload,
  HourglassEmpty,
  Female,
  Male,
} from "@mui/icons-material";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import {
  useCourts,
  useMembers,
  useGroups,
  useUpdateSession,
  useDeleteSession,
  getOrCreateSettings,
} from "../hooks";
import {
  Session,
  SessionExpense,
  Member,
  Court,
  Group,
  Settlement,
  AppSettings,
} from "../types";
import {
  formatCurrency,
  calculateSessionDuration,
  getSessionStatusText,
  getSessionStatusColor,
  generateDetailedSettlements,
  calculateMemberSettlement,
  getSafeDateForPicker,
  getCurrentUserLogin,
  calculateSlotPrice,
  transformUrl,
} from "../utils";
import { Snackbar } from "@mui/material"; // Thêm vào imports nếu chưa có
import { useResponsive } from "../hooks/useResponsive";
import { dateToString, stringToDate } from "../utils/dateUtils";
import { DroppableProps } from "@hello-pangea/dnd";

interface SessionEditFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: Session;
}

interface CustomMember {
  id: string;
  name: string;
  isCustom: boolean;
  isWoman: boolean;
  avatar?: string;
  replacementNote?: string | ""; // ✅ THÊM: Ghi chú thay thế (ví dụ: "Thay thế cho Đỗ Minh")
}

interface SessionExpenseExtended extends SessionExpense {
  memberIds: string[];
}

const steps = [
  "Thông tin cơ bản",
  "Thành viên tham gia",
  "Sảnh chờ",
  "Chi phí",
  "Thanh toán",
  "Xác nhận",
];

const removeUndefinedFields = <T extends Record<string, any>>(
  obj: T
): Partial<T> => {
  const cleaned: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined) return;

    if (Array.isArray(value)) {
      cleaned[key] = value
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return removeUndefinedFields(item);
          }
          return item === undefined ? null : item;
        })
        .filter((item) => item !== null);
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = removeUndefinedFields(value);
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

const SessionEditForm: React.FC<SessionEditFormProps> = ({
  open,
  onClose,
  onSuccess,
  session,
}) => {
  const { data: courts } = useCourts();
  const { data: members } = useMembers();
  const { data: groups } = useGroups();
  const updateSessionMutation = useUpdateSession();
  const deleteSessionMutation = useDeleteSession();
  const [qrImage, setQrImage] = useState(session.qrImage || null);

  const [activeStep, setActiveStep] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<CustomMember[]>([]);
  const [waitingList, setWaitingList] = useState<CustomMember[]>([]);
  const [expenses, setExpenses] = useState<SessionExpenseExtended[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [memberTabValue, setMemberTabValue] = useState(0);
  const [waitingTabValue, setWaitingTabValue] = useState(0);
  const [customMemberName, setCustomMemberName] = useState("");
  const [customMemberIsWoman, setCustomMemberIsWoman] = useState(false);
  const [customWaitingName, setCustomWaitingName] = useState("");
  const [customWaitingIsWoman, setCustomWaitingIsWoman] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [useAutoCourt, setUseAutoCourt] = useState(false);
  const [manualCourtCost, setManualCourtCost] = useState(0);
  const [shuttlecockCount, setShuttlecockCount] = useState(1);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(25000);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const { isMobile, isDesktop } = useResponsive();
  const currentUser = getCurrentUserLogin();
  const [passWaitingList, setPassWaitingList] = useState<string[]>([]);
  const [isFixedBadmintonCost, setIsFixedBadmintonCost] = useState(false);
  const [fixedBadmintonCost, setFixedBadmintonCost] = useState(15000);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // BỎ GIỚI HẠN maxParticipants - cho phép không giới hạn
  const validationSchemas = [
    Yup.object({
      name: Yup.string().required("Tên lịch là bắt buộc"),
      courtId: Yup.string().required("Vui lòng chọn sân"),
      date: Yup.date().required("Ngày là bắt buộc"),
      startTime: Yup.string().required("Giờ bắt đầu là bắt buộc"),
      endTime: Yup.string().required("Giờ kết thúc là bắt buộc"),
      // BỎ validation cho maxParticipants
    }),
    Yup.object({}),
    Yup.object({}),
    Yup.object({}),
    Yup.object({}),
    Yup.object({}),
  ];

  const formik = useFormik({
    initialValues: {
      notes: session.notes || "",
      name: session.name || "",
      courtId: session.courtId || "",
      date:
        session.date instanceof Date
          ? session.date
          : stringToDate(session.date),
      startTime: session.startTime || "19:30",
      endTime: session.endTime || "21:30",
      maxParticipants: session.maxParticipants || 24,
      isFixedBadmintonCost: session.isFixedBadmintonCost || false,
      fixedBadmintonCost: session.fixedBadmintonCost || null,
      priceSlot: session.priceSlot || 32500,
      status: session.status || "scheduled",
      host: session.host || currentUser,
      paymentQR: session.paymentQR || "",
    },
    validationSchema: validationSchemas[activeStep],
    onSubmit: async (values) => {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        await handleSaveSession(values);
      }
    },
  });
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

  // Load session data
  useEffect(() => {
    if (session && open) {
      setPassWaitingList(session.passWaitingList || []);

      let dateValue: Date;
      if (session.date instanceof Date) {
        dateValue = session.date;
      } else if (typeof session.date === "string") {
        dateValue = stringToDate(session.date);
      } else {
        dateValue = new Date();
      }
      formik.setValues({
        name: session.name,
        courtId: session.courtId,
        date: dateValue,
        startTime: session.startTime,
        endTime: session.endTime,
        maxParticipants: session.maxParticipants,
        priceSlot: session.priceSlot || 32500,
        isFixedBadmintonCost: session.isFixedBadmintonCost,
        fixedBadmintonCost: session.fixedBadmintonCost,
        notes: session.notes || "",
        status: session.status,
        host: session.host || currentUser,
        paymentQR: session.paymentQR,
      });

      const sessionMembers: CustomMember[] = session.members.map((sm) => {
        const member = members?.find((m) => m.id === sm.memberId);
        const memberName =
          sm.memberName ||
          member?.name ||
          `Thành viên ${sm.memberId.slice(-4)}`;

        return {
          id: sm.memberId,
          name: memberName,
          isCustom: sm.isCustom || !member,
          isWoman: sm?.isWoman || false,
          avatar: sm.avatar || "",
          replacementNote: sm.replacementNote, // ✅ Đọc ghi chú
        };
      });
      setSelectedMembers(sessionMembers);

      const waitingMembers: CustomMember[] = session.waitingList.map((wm) => {
        const member = members?.find((m) => m.id === wm.memberId);
        const memberName =
          wm.memberName ||
          member?.name ||
          `Thành viên ${wm.memberId.slice(-4)}`;

        return {
          id: wm.memberId,
          name: memberName,
          isCustom: wm.isCustom || !member,
          isWoman: wm?.isWoman || false,
          avatar: wm.avatar || "",
        };
      });
      setWaitingList(waitingMembers);

      const sessionExpenses: SessionExpenseExtended[] = session.expenses
        .filter((exp) => exp.type !== "court" && exp.type !== "shuttlecock")
        .map((exp) => ({
          ...exp,
          memberIds: exp.memberIds || sessionMembers.map((m) => m.id),
        }));
      setExpenses(sessionExpenses);

      setSettlements(session.settlements || []);

      const courtExpense = session.expenses.find((exp) => exp.type === "court");
      const shuttlecockExpense = session.expenses.find(
        (exp) => exp.type === "shuttlecock"
      );

      if (courtExpense) {
        setManualCourtCost(courtExpense.amount);
        setUseAutoCourt(false);
      }

      if (shuttlecockExpense) {
        const count = parseInt(
          shuttlecockExpense.description?.split(" ")[0] || "0"
        );
        setShuttlecockCount(count);
        setShuttlecockPrice(shuttlecockExpense.amount / count);
      }
    }
  }, [session, open]);

  useEffect(() => {
    if (session && open && members) {
      setSelectedMembers((prev) =>
        prev.map((sm) => {
          if (sm.isCustom) return sm;
          const member = members.find((m) => m.id === sm.id);
          return member ? { ...sm, name: member.name } : sm;
        })
      );

      setWaitingList((prev) =>
        prev.map((wm) => {
          if (wm.isCustom) return wm;
          const member = members.find((m) => m.id === wm.id);
          return member ? { ...wm, name: member.name } : wm;
        })
      );
    }
  }, [members]);

  useEffect(() => {
    // Calculate price slot
    if (!formik.values.courtId) return;
    const priceCourts = courts?.filter(c => c.id === formik.values.courtId);
    if (priceCourts && priceCourts.length > 0) {
      const priceSlot = calculateSlotPrice(priceCourts[0].pricePerHour, formik.values.startTime, formik.values.endTime, settings?.defaultMaxSlot);
      formik.setFieldValue("priceSlot", priceSlot);
    }
  }, [courts, formik.values.courtId, formik.values.startTime, formik.values.endTime]);

  const togglePaymentStatus = (memberId: string) => {
    setSettlements(
      settlements.map((settlement) =>
        settlement.memberId === memberId
          ? { ...settlement, isPaid: !settlement.isPaid }
          : settlement
      )
    );
  };

  // QUAN TRỌNG: Hàm lưu session với đầy đủ members và waitingList
  const handleSaveSession = async (values: any) => {
    try {
      const selectedCourt = courts?.find((c) => c.id === values.courtId);
      if (!selectedCourt) return;

      const duration = calculateSessionDuration(
        values.startTime,
        values.endTime
      );
      const courtCost = useAutoCourt
        ? selectedCourt.pricePerHour * duration
        : manualCourtCost;
      const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
      const additionalCosts = expenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );
      const totalCost = courtCost + shuttlecockCost + additionalCosts;

      const sessionExpenses: SessionExpense[] = [
        {
          id: "court-cost",
          name: "Tiền sân",
          amount: courtCost,
          type: "court",
          description: useAutoCourt
            ? `${duration} giờ x ${formatCurrency(selectedCourt.pricePerHour)}`
            : "Nhập thủ công",
        },
        {
          id: "shuttlecock-cost",
          name: "Tiền cầu",
          amount: shuttlecockCost,
          type: "shuttlecock",
          description: `${shuttlecockCount} quả x ${formatCurrency(
            shuttlecockPrice
          )}`,
        },
        ...expenses.map((exp) => ({
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          type: exp.type,
          description: `Chia cho ${exp.memberIds.length} người`,
          memberIds: exp.memberIds,
        })),
      ];

      const presentMembers = selectedMembers.filter((member) => {
        const existingMember = session.members.find(
          (m) => m.memberId === member.id
        );
        return existingMember?.isPresent || false;
      });

      const baseSharedCost =
        presentMembers.length > 0
          ? (courtCost + shuttlecockCost) / presentMembers.length
          : 0;

      // LƯU ĐẦY ĐỦ MEMBERS VÀ WAITING LIST
      const sessionData = {
        ...values,
        date: dateToString(values.date),
        qrImage,
        passWaitingList: passWaitingList, // ✅ Thêm vào

        // Lưu đầy đủ thành viên
        members: selectedMembers.map((member) => {
          const existingMember = session.members.find(
            (m) => m.memberId === member.id
          );
          const memberData: any = {
            memberId: member.id,
            memberName: member.name,
            isPresent: existingMember?.isPresent || false,
            isCustom: member.isCustom,
            isWoman: member.isWoman,
            avatar: member.avatar || "",
            isWaitingPass: passWaitingList.includes(member.id), // ✅ Thêm vào
          };

          // CHỈ THÊM nếu có giá trị
          if (member.replacementNote) {
            memberData.replacementNote = member.replacementNote;
          }

          return memberData;
        }),
        // Lưu đầy đủ sảnh chờ
        waitingList: waitingList.map((member, index) => {
          const waitingData: any = {
            memberId: member.id,
            memberName: member.name,
            addedAt: new Date(),
            priority: index + 1,
            isCustom: member.isCustom,
            isWoman: member.isWoman,
            avatar: member.avatar || "",
          };

          if (member.replacementNote) {
            waitingData.replacementNote = member.replacementNote;
          }

          return waitingData;
        }),
        currentParticipants: selectedMembers.length,
        maxParticipants: values.maxParticipants, // Không giới hạn
        expenses: sessionExpenses,
        totalCost,
        costPerPerson: baseSharedCost,
        settlements,
        createdBy: session?.createdBy || (await currentUser)?.memberId || "",
      };

      // console.log("Saving session with data:", {
      //   membersCount: sessionData.members.length,
      //   waitingListCount: sessionData.waitingList.length,
      //   members: sessionData.members,
      //   waitingList: sessionData.waitingList,
      // });

      const cleanedData = removeUndefinedFields(sessionData);

      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: cleanedData,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const handleDeleteSession = async () => {
    try {
      await deleteSessionMutation.mutateAsync(session.id);
      setDeleteDialogOpen(false);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleNext = () => {
    formik.handleSubmit();
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedMembers([]);
    setWaitingList([]);
    setExpenses([]);
    setSettlements([]);
    setCustomMemberName("");
    setCustomMemberIsWoman(false);
    setCustomWaitingName("");
    setCustomWaitingIsWoman(false);
    setUseAutoCourt(false);
    setManualCourtCost(0);
    setShuttlecockCount(1);
    setShuttlecockPrice(25000);
    formik.resetForm();
    onClose();
  };

  const addMemberFromList = (member: Member) => {
    const customMember: CustomMember = {
      id: member.id,
      name: member.name,
      isCustom: false,
      isWoman: member.isWoman,
      avatar: member.avatar || "",
    };

    // BỎ GIỚI HẠN - thêm trực tiếp vào danh sách
    if (!selectedMembers.some((m) => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, customMember]);
    }
  };

  const addMemberFromGroup = (group: Group) => {
    const groupMembers =
      members?.filter((member) => group.memberIds.includes(member.id)) || [];
    groupMembers.forEach((member) => addMemberFromList(member));
  };

  const addCustomMember = () => {
    if (!customMemberName.trim()) return;

    const customMember: CustomMember = {
      id: `custom-${Date.now()}`,
      name: customMemberName.trim(),
      isCustom: true,
      isWoman: customMemberIsWoman,
    };

    setSelectedMembers([...selectedMembers, customMember]);
    setCustomMemberName("");
    setCustomMemberIsWoman(false);
  };

  const addCustomWaitingMember = () => {
    if (!customWaitingName.trim()) return;

    const customMember: CustomMember = {
      id: `custom-waiting-${Date.now()}`,
      name: customWaitingName.trim(),
      isCustom: true,
      isWoman: customWaitingIsWoman,
    };

    setWaitingList([...waitingList, customMember]);
    setCustomWaitingName("");
    setCustomWaitingIsWoman(false);
  };

  const removeMember = (member: CustomMember) => {
    const removedMemberName = member.name;
    const newSelectedMembers = selectedMembers.filter(
      (m) => m.id !== member.id
    );
    setSelectedMembers(newSelectedMembers);

    // Kiểm tra có thành viên trong sảnh chờ không
    if (waitingList.length > 0) {
      const firstWaiting = waitingList[0];
      const addedMemberName = firstWaiting.name;

      // ✅ THÊM GHI CHÚ THAY THẾ cho thành viên mới
      const memberWithNote: CustomMember = {
        ...firstWaiting,
        replacementNote: member.replacementNote ? member.replacementNote : `Slot của ${removedMemberName}`, // ✅ Lưu ghi chú
        isWoman: firstWaiting.isWoman,
        avatar: firstWaiting.avatar || "",
      };

      // Xóa khỏi sảnh chờ
      setWaitingList(waitingList.slice(1));

      // Xóa khỏi pass waiting list
      const newPassWaitingList = passWaitingList.filter(
        (id) => id !== member.id
      );
      setPassWaitingList(newPassWaitingList);

      // Thêm vào danh sách với ghi chú
      setSelectedMembers([...newSelectedMembers, memberWithNote]);

      // Hiển thị thông báo
      showSnackbar(
        `🔄 Tự động chuyển: ${removedMemberName} → ${addedMemberName}`,
        "info"
      );
    } else {
      showSnackbar(`✓ Đã xóa ${removedMemberName} khỏi danh sách`, "success");
    }
  };

  // Bắt đầu chỉnh sửa tên
  const startEditingMemberName = (member: CustomMember) => {
    setEditingMemberId(member.id);
    setEditingMemberName(member.name);
  };

  // Hủy chỉnh sửa
  const cancelEditingMemberName = () => {
    setEditingMemberId(null);
    setEditingMemberName("");
  };

  // Lưu tên mới
  const saveMemberName = (memberId: string) => {
    if (!editingMemberName.trim()) {
      showSnackbar("Tên không được để trống", "error");
      return;
    }

    // Cập nhật tên trong danh sách
    setSelectedMembers(
      selectedMembers.map((m) =>
        m.id === memberId ? { ...m, name: editingMemberName.trim() } : m
      )
    );

    // Reset state
    setEditingMemberId(null);
    setEditingMemberName("");

    showSnackbar("Đã cập nhật tên thành viên", "success");
  };

  // Xóa ghi chú thay thế
  const removeReplacementNote = (memberId: string) => {
    setSelectedMembers(
      selectedMembers.map((m) =>
        m.id === memberId ? { ...m, replacementNote: undefined } : m
      )
    );
  };

  const removeFromWaitingList = (member: CustomMember) => {
    setWaitingList(waitingList.filter((m) => m.id !== member.id));
  };

  const moveFromWaitingToMain = (member: CustomMember) => {
    // BỎ GIỚI HẠN - cho phép chuyển tự do
    setWaitingList(waitingList.filter((m) => m.id !== member.id));
    setSelectedMembers([...selectedMembers, member]);
  };

  // THÊM HÀM XỬ LÝ DRAG & DROP CHO SẢNH CHỜ
  const handleWaitingListReorder = (result: DropResult) => {
    // Check if dropped outside the list
    if (!result.destination) {
      return;
    }

    // Check if position actually changed
    if (result.source.index === result.destination.index) {
      return;
    }

    const items = Array.from(waitingList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWaitingList(items);

    // Optional: Show feedback
    showSnackbar(
      `Đã di chuyển ${reorderedItem.name} từ vị trí ${
        result.source.index + 1
      } sang ${result.destination.index + 1}`,
      "info"
    );
  };

  const addExpense = () => {
    const newExpense: SessionExpenseExtended = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      type: "other",
      description: "",
      memberIds: selectedMembers.map((m) => m.id),
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (
    id: string,
    field: keyof SessionExpenseExtended,
    value: any
  ) => {
    setExpenses(
      expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  const toggleAttendance = (memberId: string) => {
    const updatedMembers = selectedMembers.map((member) => {
      if (member.id === memberId) {
        const currentSessionMember = session.members.find(
          (m) => m.memberId === memberId
        );
        if (currentSessionMember) {
          currentSessionMember.isPresent = !currentSessionMember.isPresent;
        }
      }
      return member;
    });
    setSelectedMembers(updatedMembers);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            {/* Session Status Alert */}
            <Alert
              severity={session.status === "completed" ? "info" : "warning"}
              sx={{ mb: 3 }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body2">
                  <strong>Trạng thái hiện tại:</strong>{" "}
                  {getSessionStatusText(session.status)}
                </Typography>
                <Chip
                  label={getSessionStatusText(session.status)}
                  color={getSessionStatusColor(session.status)}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              {session.status === "completed" && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Lịch đã hoàn thành. Bạn có thể chỉnh sửa thông tin thanh toán
                  và các chi tiết khác.
                </Typography>
              )}
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Tên lịch đánh"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Chọn sân</InputLabel>
                  <Select
                    name="courtId"
                    value={formik.values.courtId}
                    onChange={formik.handleChange}
                    label="Chọn sân"
                    error={
                      formik.touched.courtId && Boolean(formik.errors.courtId)
                    }
                  >
                    {courts
                      ?.filter((court) => court.isActive)
                      .map((court) => (
                        <MenuItem key={court.id} value={court.id}>
                          {court.name} - {court.location} (
                          {formatCurrency(court.pricePerHour)}/giờ)
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Ngày"
                  value={(() => {
                    const dateValue = formik.values.date;
                    console.log("DatePicker value:", dateValue);

                    // ✅ Xử lý tất cả trường hợp
                    if (!dateValue) {
                      return dayjs();
                    }

                    // Nếu đã là Date object
                    if (
                      dateValue instanceof Date &&
                      !isNaN(dateValue.getTime())
                    ) {
                      return dayjs(dateValue);
                    }

                    // Nếu là string
                    if (typeof dateValue === "string") {
                      const converted = stringToDate(dateValue);
                      return dayjs(converted);
                    }

                    // Fallback
                    return dayjs();
                  })()}
                  onChange={(newValue) => {
                    console.log("DatePicker onChange:", newValue);

                    if (newValue && newValue.isValid()) {
                      const dateObj = newValue.toDate();
                      // Set giờ về 00:00:00
                      dateObj.setHours(0, 0, 0, 0);

                      console.log("Setting date to:", dateObj);
                      formik.setFieldValue("date", dateObj);
                    }
                  }}
                  dayOfWeekFormatter={(day) => {
                    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                    return dayNames[day];
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error: formik.touched.date && Boolean(formik.errors.date),
                      helperText:
                        formik.touched.date &&
                        typeof formik.errors.date === "string"
                          ? formik.errors.date
                          : undefined,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ bắt đầu"
                  value={
                    formik.values.startTime
                      ? dayjs(`2000-01-01T${formik.values.startTime}`)
                      : null
                  }
                  onChange={(newValue) => {
                    try {
                      if (newValue && newValue.isValid()) {
                        formik.setFieldValue(
                          "startTime",
                          newValue.format("HH:mm")
                        );
                      }
                    } catch (error) {
                      console.error("TimePicker change error:", error);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error:
                        formik.touched.startTime &&
                        Boolean(formik.errors.startTime),
                      helperText:
                        formik.touched.startTime && formik.errors.startTime,
                      sx: {
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ kết thúc"
                  value={
                    formik.values.endTime
                      ? dayjs(`2000-01-01T${formik.values.endTime}`)
                      : null
                  }
                  onChange={(newValue) => {
                    try {
                      if (newValue && newValue.isValid()) {
                        formik.setFieldValue(
                          "endTime",
                          newValue.format("HH:mm")
                        );
                      }
                    } catch (error) {
                      console.error("TimePicker change error:", error);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error:
                        formik.touched.endTime &&
                        Boolean(formik.errors.endTime),
                      helperText:
                        formik.touched.endTime && formik.errors.endTime,
                      sx: {
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.875rem", sm: "1rem" },
                        },
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="maxParticipants"
                  label="Số người tối đa"
                  type="number"
                  value={formik.values.maxParticipants}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.maxParticipants &&
                    Boolean(formik.errors.maxParticipants)
                  }
                  helperText={
                    formik.touched.maxParticipants &&
                    formik.errors.maxParticipants
                  }
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="priceSlot"
                  label="Tiền slot cố định (VNĐ)"
                  type="number"
                  value={formik.values.priceSlot}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.priceSlot && Boolean(formik.errors.priceSlot)
                  }
                  helperText={
                    formik.touched.priceSlot && formik.errors.priceSlot
                  }
                />
              </Grid>

              {session.isFixedBadmintonCost && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    disabled
                    fullWidth
                    name="fixedBadmintonCost"
                    label="Giá cầu cố định cho nữ"
                    type="number"
                    value={session.fixedBadmintonCost}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    label="Trạng thái"
                  >
                    <MenuItem value="scheduled">Đã lên lịch</MenuItem>
                    <MenuItem value="ongoing">Đang diễn ra</MenuItem>
                    <MenuItem value="completed">Đã hoàn thành</MenuItem>
                    <MenuItem value="cancelled">Đã hủy</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Ghi chú"
                  multiline
                  rows={3}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
              {/* QR CODE UPLOAD SECTION */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <AttachMoney sx={{ mr: 1 }} />
                      QR Code thanh toán (tùy chọn)
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <input
                        accept="image/*"
                        style={{ display: "none" }}
                        id="qr-upload-edit"
                        type="file"
                        onChange={handleQrImageUpload}
                      />
                      <label htmlFor="qr-upload-edit">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Upload />}
                        >
                          {qrImage ? "Thay đổi QR" : "Tải ảnh QR"}
                        </Button>
                      </label>

                      {qrImage && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => setQrImage(null)}
                        >
                          Xóa
                        </Button>
                      )}
                    </Box>

                    {qrImage && (
                      <Box sx={{ mt: 2, textAlign: "center" }}>
                        <img
                          src={qrImage}
                          alt="QR Code"
                          style={{
                            maxWidth: 200,
                            maxHeight: 200,
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            objectFit: "contain",
                          }}
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 1, color: "text.secondary" }}
                        >
                          QR Code thanh toán
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Thành viên tham gia ({selectedMembers.length}/
              {formik.values.maxParticipants})
            </Typography>

            <Tabs
              value={memberTabValue}
              onChange={(_, newValue) => setMemberTabValue(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Từ danh sách" />
              <Tab label="Từ nhóm" />
              <Tab label="Tùy chỉnh" />
            </Tabs>

            {memberTabValue === 0 && (
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={
                    members?.filter(
                      (member) =>
                        member.isActive &&
                        !selectedMembers.some((sm) => sm.id === member.id) &&
                        !waitingList.some((wm) => wm.id === member.id)
                    ) || []
                  }
                  getOptionLabel={(option) =>
                    `${option.name}`
                  }
                  onChange={(_, value) => {
                    if (value) {
                      addMemberFromList(value);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Chọn thành viên"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      {option.avatar ? (
                        <Avatar
                          src={transformUrl(option.avatar)}
                          sx={{ mr: 2, width: 32, height: 32 }}
                        />
                      ) : (
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {option.name.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        {/* <Typography variant="caption" color="text.secondary">
                          {option.skillLevel}
                        </Typography> */}
                      </Box>
                    </Box>
                  )}
                />
              </Box>
            )}

            {memberTabValue === 1 && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Chọn nhóm</InputLabel>
                  <Select
                    value=""
                    onChange={(e) => {
                      const group = groups?.find(
                        (g) => g.id === e.target.value
                      );
                      if (group) {
                        addMemberFromGroup(group);
                      }
                    }}
                    label="Chọn nhóm"
                  >
                    {groups?.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Groups sx={{ mr: 1 }} />
                          {group.name} ({group.memberIds.length} thành viên)
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {memberTabValue === 2 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Nhập tên thành viên"
                    value={customMemberName}
                    onChange={(e) => setCustomMemberName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addCustomMember();
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        onChange={(e) =>
                          setCustomMemberIsWoman(e.target.checked)
                        }
                        name="isWoman"
                      />
                    }
                    label="Nữ"
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomMember}
                    disabled={!customMemberName.trim()}
                    startIcon={<PersonAdd />}
                  >
                    Thêm
                  </Button>
                </Box>
              </Box>
            )}

            {/* ===== DANH SÁCH THÀNH VIÊN VỚI CHI CHÚ VÀ CHỈNH SỬA ===== */}
            <Card>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Groups sx={{ mr: 1 }} />
                  Danh sách tham gia ({selectedMembers.length})
                </Typography>

                {selectedMembers.length === 0 ? (
                  <Alert severity="warning">
                    Chưa có thành viên nào được chọn
                  </Alert>
                ) : (
                  <List dense>
                    {selectedMembers.map((member, index) => {
                      const isEditing = editingMemberId === member.id;

                      return (
                        <ListItem
                          key={member.id}
                          divider={index < selectedMembers.length - 1}
                          sx={{
                            flexDirection: "column",
                            alignItems: "flex-start",
                            py: 1.5,
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          {/* Dòng 1: Avatar + Tên + Actions */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar
                                sx={{
                                  bgcolor: member.isCustom
                                    ? "secondary.main"
                                    : "primary.main",
                                  width: 36,
                                  height: 36,
                                }}
                                src={transformUrl(member.avatar ?? "")}
                              >
                                {member.isCustom ? (
                                  <Person />
                                ) : (
                                  member.name.charAt(0)
                                )}
                              </Avatar>
                            </ListItemAvatar>

                            {/* Tên thành viên - Có thể chỉnh sửa */}
                            {isEditing ? (
                              <Box
                                sx={{
                                  flex: 1,
                                  display: "flex",
                                  gap: 1,
                                  alignItems: "center",
                                }}
                              >
                                <TextField
                                  size="small"
                                  value={editingMemberName}
                                  onChange={(e) =>
                                    setEditingMemberName(e.target.value)
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      saveMemberName(member.id);
                                    } else if (e.key === "Escape") {
                                      cancelEditingMemberName();
                                    }
                                  }}
                                  autoFocus
                                  sx={{ flex: 1 }}
                                />
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => saveMemberName(member.id)}
                                >
                                  <CheckCircle />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={cancelEditingMemberName}
                                >
                                  <Cancel />
                                </IconButton>
                              </Box>
                            ) : (
                              <Box sx={{ flex: 1 }}>
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
                                  >
                                    {member.name}
                                  </Typography>

                                  {/* Badge tùy chỉnh */}
                                  {member.isCustom && (
                                    <Chip
                                      label="Tùy chỉnh"
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                    />
                                  )}

                                  {/* Nút chỉnh sửa tên */}
                                  <Tooltip title="Chỉnh sửa tên">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        startEditingMemberName(member)
                                      }
                                      sx={{
                                        opacity: 0.6,
                                        "&:hover": { opacity: 1 },
                                      }}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>

                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {member.isCustom
                                    ? "Tên tùy chỉnh"
                                    : "Từ danh sách"}
                                </Typography>

                                {/* Icon Male/Female */}
                                {member.isWoman ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    <Female sx={{ fontSize: 20, ml: 1 }} />
                                    Nữ
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    <Male sx={{ fontSize: 20, ml: 1 }} />
                                    Nam
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {/* Nút xóa */}
                            {!isEditing && (
                              <ListItemSecondaryAction>
                                <Tooltip title="Xóa khỏi danh sách">
                                  <IconButton
                                    edge="end"
                                    onClick={() => removeMember(member)}
                                    size="small"
                                    color="error"
                                  >
                                    <Remove />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            )}
                          </Box>

                          {/* Dòng 2: Ghi chú thay thế (nếu có) */}
                          {member.replacementNote && (
                            <Box
                              sx={{
                                mt: 1,
                                ml: 6,
                                width: "calc(100% - 48px)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Alert
                                severity="info"
                                variant="outlined"
                                sx={{
                                  width: "100%",
                                  py: 0,
                                  px: 1,
                                  fontSize: "0.75rem",
                                  "& .MuiAlert-icon": {
                                    fontSize: "1rem",
                                  },
                                }}
                                icon={<SwapHoriz fontSize="small" />}
                                action={
                                  <Tooltip title="Xóa ghi chú">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        removeReplacementNote(member.id)
                                      }
                                      sx={{ p: 0.5 }}
                                    >
                                      <Close fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                }
                              >
                                {member.replacementNote}
                              </Alert>
                            </Box>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}

                {/* Hướng dẫn */}
                {selectedMembers.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <Typography variant="caption">
                      💡 <strong>Mẹo:</strong> Nhấn vào icon{" "}
                      <Edit fontSize="inherit" /> để chỉnh sửa tên thành viên
                      trực tiếp
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Danh sách chờ pass */}
            {selectedMembers.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <HourglassEmpty sx={{ mr: 1 }} />
                    Danh sách chờ pass ({passWaitingList.length})
                  </Typography>

                  {/* Table với checkbox cho mỗi thành viên */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <Checkbox
                              checked={
                                passWaitingList.length ===
                                selectedMembers.length
                              }
                              onChange={(e) => {
                                setPassWaitingList(
                                  e.target.checked
                                    ? selectedMembers.map((m) => m.id)
                                    : []
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>Tên</TableCell>
                          <TableCell>Trạng thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Checkbox
                                checked={passWaitingList.includes(member.id)}
                                onChange={() => {
                                  if (passWaitingList.includes(member.id)) {
                                    setPassWaitingList(
                                      passWaitingList.filter(
                                        (id) => id !== member.id
                                      )
                                    );
                                  } else {
                                    setPassWaitingList([
                                      ...passWaitingList,
                                      member.id,
                                    ]);
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>
                              {passWaitingList.includes(member.id) ? (
                                <Chip
                                  label="Chờ pass"
                                  color="warning"
                                  size="small"
                                />
                              ) : (
                                <Chip label="Bình thường" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      // COPY TOÀN BỘ CODE NÀY VÀ THAY THẾ case 2: TRONG SessionEditForm.tsx

      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sảnh chờ ({waitingList.length} người)
            </Typography>

            <Tabs
              value={waitingTabValue}
              onChange={(_, newValue) => setWaitingTabValue(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Từ danh sách" />
              <Tab label="Tùy chỉnh" />
            </Tabs>

            {/* TAB 0: Thêm từ danh sách thành viên */}
            {waitingTabValue === 0 && (
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={
                    members?.filter(
                      (member) =>
                        member.isActive &&
                        !selectedMembers.some((sm) => sm.id === member.id) &&
                        !waitingList.some((wm) => wm.id === member.id)
                    ) || []
                  }
                  getOptionLabel={(option) =>
                    `${option.name}`
                  }
                  onChange={(_, value) => {
                    if (value) {
                      const customMember: CustomMember = {
                        id: value.id,
                        name: value.name,
                        isCustom: false,
                        isWoman: value.isWoman,
                        avatar: value.avatar || '',
                      };
                      setWaitingList([...waitingList, customMember]);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Thêm vào sảnh chờ từ danh sách"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      {option.avatar ? (
                        <Avatar
                          src={transformUrl(option.avatar)}
                          sx={{ mr:2, width: 32, height: 32 }}
                        />
                      ) : (
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {option.name.charAt(0).toUpperCase()}
                        </Avatar>
                      )}

                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        {/* <Typography variant="caption" color="text.secondary">
                          {option.skillLevel}
                        </Typography> */}
                      </Box>
                    </Box>
                  )}
                />
              </Box>
            )}

            {/* TAB 1: Thêm tên tùy chỉnh */}
            {waitingTabValue === 1 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Nhập tên thành viên chờ"
                    value={customWaitingName}
                    onChange={(e) => setCustomWaitingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addCustomWaitingMember();
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={customWaitingIsWoman}
                        onChange={(e) =>
                          setCustomWaitingIsWoman(e.target.checked)
                        }
                        name="isWoman"
                      />
                    }
                    label="Nữ"
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomWaitingMember}
                    disabled={!customWaitingName.trim()}
                    startIcon={<PersonAdd />}
                  >
                    Thêm
                  </Button>
                </Box>
              </Box>
            )}

            {/* ===== DANH SÁCH CHỜ VỚI DRAG-AND-DROP ===== */}
            <Card>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Schedule sx={{ mr: 1 }} />
                  Danh sách chờ ({waitingList.length})
                  {waitingList.length > 0 && (
                    <Chip
                      label="Kéo thả để sắp xếp"
                      size="small"
                      sx={{ ml: 2 }}
                      color="info"
                      variant="outlined"
                      icon={<DragHandle />}
                    />
                  )}
                </Typography>

                {waitingList.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Sảnh chờ trống. Thêm thành viên vào sảnh chờ để quản lý danh
                    sách dự phòng.
                  </Alert>
                ) : (
                  <DragDropContext onDragEnd={handleWaitingListReorder}>
                    <StrictModeDroppable droppableId="waiting-list">
                      {(provided, snapshot) => (
                        <List
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          dense
                          sx={{
                            backgroundColor: snapshot.isDraggingOver
                              ? "action.hover"
                              : "transparent",
                            borderRadius: 1,
                            transition: "background-color 0.2s ease",
                            p: 1,
                            minHeight: 100,
                          }}
                        >
                          {waitingList.map((member, index) => (
                            <Draggable
                              key={member.id}
                              draggableId={member.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <ListItem
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  sx={{
                                    backgroundColor: snapshot.isDragging
                                      ? "primary.light"
                                      : "background.paper",
                                    borderRadius: 1,
                                    mb: 1,
                                    border: "1px solid",
                                    borderColor: snapshot.isDragging
                                      ? "primary.main"
                                      : "divider",
                                    boxShadow: snapshot.isDragging ? 3 : 0,
                                    transition: "all 0.2s ease",
                                    cursor: "default",
                                    "&:hover": {
                                      backgroundColor: "action.hover",
                                    },
                                  }}
                                >
                                  {/* Icon Kéo Thả */}
                                  <Box
                                    {...provided.dragHandleProps}
                                    sx={{
                                      mr: 1,
                                      cursor: "grab",
                                      display: "flex",
                                      alignItems: "center",
                                      color: "text.secondary",
                                      "&:active": {
                                        cursor: "grabbing",
                                      },
                                      "&:hover": {
                                        color: "primary.main",
                                      },
                                      touchAction: "none",
                                      userSelect: "none",
                                    }}
                                  >
                                    <DragHandle />
                                  </Box>

                                  {/* Avatar với số thứ tự */}
                                  {member.avatar ? (
                                    <Avatar
                                      src={transformUrl(member.avatar)}
                                      sx={{mr:2, width: 32, height: 32 }}
                                    />
                                  ) : (
                                    <Avatar
                                      sx={{
                                        mr: 2,
                                        width: 36,
                                        height: 36,
                                        bgcolor: member.isCustom
                                          ? "secondary.main"
                                          : "warning.main",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {member.name?.charAt(0).toUpperCase() || index + 1}
                                    </Avatar>
                                  )}

                                  {/* Thông tin thành viên */}
                                  <ListItemText
                                    primary={
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                        }}
                                      >
                                        <Typography
                                          variant="body1"
                                          fontWeight="medium"
                                        >
                                          {member.name}
                                        </Typography>
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
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {member.isCustom
                                          ? "Tùy chỉnh"
                                          : "Thành viên"}
                                        {/* {member.isWoman ? (
                                          <Female
                                            sx={{ fontSize: 18, ml: 1 }}
                                          />
                                        ) : (
                                          <Male sx={{ fontSize: 18, ml: 1 }} />
                                        )} */}
                                      </Typography>
                                    }
                                  />

                                  {/* Nút hành động */}
                                  <ListItemSecondaryAction>
                                    <ButtonGroup
                                      size="small"
                                      variant="outlined"
                                    >
                                      <Tooltip title="Chuyển vào danh sách chính">
                                        <Button
                                          onClick={() =>
                                            moveFromWaitingToMain(member)
                                          }
                                          color="primary"
                                          startIcon={<Add />}
                                        >
                                          Thêm
                                        </Button>
                                      </Tooltip>
                                      <Tooltip title="Xóa khỏi sảnh chờ">
                                        <Button
                                          onClick={() =>
                                            removeFromWaitingList(member)
                                          }
                                          color="error"
                                          startIcon={<Delete />}
                                        >
                                          Xóa
                                        </Button>
                                      </Tooltip>
                                    </ButtonGroup>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </List>
                      )}
                    </StrictModeDroppable>
                  </DragDropContext>
                )}

                {/* Hướng dẫn sử dụng */}
                {waitingList.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <Typography variant="caption">
                      💡 <strong>Mẹo:</strong> Kéo icon ≡ để sắp xếp lại thứ tự
                      ưu tiên trong sảnh chờ
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 3:
        const selectedCourt = courts?.find(
          (c) => c.id === formik.values.courtId
        );
        const duration = calculateSessionDuration(
          formik.values.startTime,
          formik.values.endTime
        );
        const courtCost = useAutoCourt
          ? selectedCourt
            ? selectedCourt.pricePerHour * duration
            : 0
          : manualCourtCost;
        const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
        const additionalCosts = expenses.reduce(
          (sum, exp) => sum + exp.amount,
          0
        );
        const totalCost = courtCost + shuttlecockCost + additionalCosts;

        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chi phí dự kiến
            </Typography>

            {/* Court Cost */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1">Tiền sân</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useAutoCourt}
                        onChange={(e) => setUseAutoCourt(e.target.checked)}
                      />
                    }
                    label="Tự động tính"
                  />
                </Box>

                {useAutoCourt ? (
                  <Typography variant="body2" color="text.secondary">
                    {duration} giờ x{" "}
                    {formatCurrency(selectedCourt?.pricePerHour || 0)} ={" "}
                    {formatCurrency(courtCost)}
                  </Typography>
                ) : (
                  <TextField
                    fullWidth
                    label="Nhập tiền sân thủ công"
                    type="number"
                    value={manualCourtCost}
                    onChange={(e) => setManualCourtCost(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Shuttlecock Cost */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Tiền cầu
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Số lượng quả"
                      type="number"
                      value={shuttlecockCount}
                      onChange={(e) =>
                        setShuttlecockCount(Number(e.target.value))
                      }
                      size="small"
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Giá mỗi quả"
                      type="number"
                      value={shuttlecockPrice}
                      onChange={(e) =>
                        setShuttlecockPrice(Number(e.target.value))
                      }
                      size="small"
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Tổng: {shuttlecockCount} quả x{" "}
                  {formatCurrency(shuttlecockPrice)} ={" "}
                  {formatCurrency(shuttlecockCost)}
                </Typography>
              </CardContent>
            </Card>

            {/* Additional Expenses */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1">Chi phí bổ sung</Typography>
                  <Button startIcon={<Add />} onClick={addExpense} size="small">
                    Thêm
                  </Button>
                </Box>

                {expenses.map((expense) => (
                  <Paper
                    key={expense.id}
                    sx={{ p: 2, mb: 2, backgroundColor: "action.hover" }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Tên chi phí"
                          value={expense.name}
                          onChange={(e) =>
                            updateExpense(expense.id, "name", e.target.value)
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Số tiền"
                          type="number"
                          value={expense.amount}
                          onChange={(e) =>
                            updateExpense(
                              expense.id,
                              "amount",
                              Number(e.target.value)
                            )
                          }
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <IconButton
                          onClick={() => removeExpense(expense.id)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Grid>

                      {/* Chọn thành viên chia tiền - CHỈ NHỮNG NGƯỜI ĐÃ THAM GIA */}
                      <Grid item xs={12}>
                        <Typography variant="body2" gutterBottom>
                          Chia tiền cho (chỉ thành viên đã tham gia):
                        </Typography>
                        <Autocomplete
                          multiple
                          // CHỈ LẤY THÀNH VIÊN ĐÃ ĐƯỢC CHỌN THAM GIA
                          options={selectedMembers.filter((m) => {
                            const sessionMember = session.members.find(
                              (sm) => sm.memberId === m.id
                            );
                            // return sessionMember?.isPresent !== false; // Chỉ lấy những người có mặt hoặc chưa điểm danh
                            return sessionMember; // Chỉ lấy những người có mặt hoặc chưa điểm danh
                          })}
                          getOptionLabel={(option) => option.name}
                          value={selectedMembers.filter((m) =>
                            expense.memberIds.includes(m.id)
                          )}
                          onChange={(_, newValue) => {
                            updateExpense(
                              expense.id,
                              "memberIds",
                              newValue.map((m) => m.id)
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              size="small"
                              placeholder="Chọn thành viên chia tiền"
                              helperText="Chỉ hiển thị thành viên đã tham gia lịch đánh này"
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                variant="outlined"
                                label={option.name}
                                size="small"
                                {...getTagProps({ index })}
                                avatar={
                                  option.avatar ? (
                                    <Avatar
                                      src={transformUrl(option.avatar)}
                                      sx={{mr:2, width: 32, height: 32 }}
                                    />
                                  ) : (
                                    <Avatar
                                      sx={{
                                        bgcolor: option.isCustom
                                          ? "secondary.main"
                                          : "primary.main",
                                      }}
                                    >
                                      {option.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                  )
                                }
                              />
                            ))
                          }
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
                              {option.avatar ? (
                                <Avatar
                                  src={transformUrl(option.avatar)}
                                  sx={{mr:2, width: 32, height: 32 }}
                                />
                              ) : (
                                <Avatar sx={{ mr: 1, width: 24, height: 24 }}>
                                  {option.name.charAt(0).toUpperCase()}
                                </Avatar>
                              )}

                              <Typography variant="body2">
                                {option.name}
                              </Typography>
                              {option.isCustom && (
                                <Chip
                                  label="Tùy chỉnh"
                                  size="small"
                                  sx={{ ml: 1 }}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          )}
                        />
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            {expense.amount > 0 && expense.memberIds.length > 0
                              ? `${formatCurrency(
                                  expense.amount / expense.memberIds.length
                                )}/người (${expense.memberIds.length} người)`
                              : "Chọn thành viên để tính chi phí mỗi người"}
                          </Typography>
                        </Alert>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                {expenses.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 2 }}
                  >
                    Chưa có chi phí bổ sung nào
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Tổng kết chi phí
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Tiền sân:</Typography>
                  <Typography>{formatCurrency(courtCost)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Tiền cầu:</Typography>
                  <Typography>{formatCurrency(shuttlecockCost)}</Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Chi phí khác:</Typography>
                  <Typography>{formatCurrency(additionalCosts)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                  }}
                >
                  <Typography fontWeight="bold">Tổng cộng:</Typography>
                  <Typography fontWeight="bold" color="primary.main">
                    {formatCurrency(totalCost)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Chi phí cơ bản/người (chia đều):
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(
                      selectedMembers.filter(
                        (m) =>
                          session.members.find((sm) => sm.memberId === m.id)
                            ?.isPresent
                      ).length > 0
                        ? (courtCost + shuttlecockCost) /
                            selectedMembers.filter(
                              (m) =>
                                session.members.find(
                                  (sm) => sm.memberId === m.id
                                )?.isPresent
                            ).length
                        : 0
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );

      // SessionEditForm.tsx - Step 4: Payment Management
      // SessionEditForm.tsx - Step 4: Payment Management (FIXED - Đầy đủ)

      case 4: {
        // Thanh toán - CHÚ Ý: Bọc trong {} để tạo block scope
        // ===== BƯỚC 1: TÍNH TOÁN CHI PHÍ TRƯỚC KHI SỬ DỤNG =====
        const selectedCourt = courts?.find(
          (c) => c.id === formik.values.courtId
        );
        const duration = calculateSessionDuration(
          formik.values.startTime,
          formik.values.endTime
        );
        const courtCost = useAutoCourt
          ? selectedCourt
            ? selectedCourt.pricePerHour * duration
            : 0
          : manualCourtCost;
        const shuttlecockCost = shuttlecockCount * shuttlecockPrice;

        // ===== BƯỚC 2: RENDER UI =====
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quản lý thanh toán
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Cách tính:</strong> Tiền sân + tiền cầu chia đều cho
                thành viên có mặt. Chi phí bổ sung chia theo danh sách đã chọn.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                💡 <strong>Lưu ý:</strong> Danh sách bao gồm cả thành viên vắng
                mặt nhưng có chi phí bổ sung cần thanh toán.
              </Typography>
            </Alert>

            {/* Chi tiết thanh toán từng thành viên */}
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Payment sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Chi tiết thanh toán từng thành viên
                  </Typography>
                </Box>

                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "action.hover" }}>
                        <TableCell>
                          <strong>Thành viên</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Có mặt</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Số tiền</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Đã thanh toán</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Thao tác</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        // ===== LOGIC TÍNH TOÁN DANH SÁCH THÀNH VIÊN LIÊN QUAN =====
                        const presentMembers = selectedMembers.filter(
                          (m) =>
                            session.members.find((sm) => sm.memberId === m.id)
                              ?.isPresent
                        );

                        // Lấy tất cả memberIds từ chi phí bổ sung
                        const membersWithAdditionalExpenses = new Set<string>();
                        expenses.forEach((expense) => {
                          if (
                            expense.memberIds &&
                            expense.memberIds.length > 0
                          ) {
                            expense.memberIds.forEach((memberId) =>
                              membersWithAdditionalExpenses.add(memberId)
                            );
                          }
                        });

                        // Kết hợp: thành viên có mặt + thành viên có chi phí bổ sung
                        const allRelevantMemberIds = new Set([
                          ...presentMembers.map((m) => m.id),
                          ...Array.from(membersWithAdditionalExpenses),
                        ]);

                        // Lọc danh sách thành viên liên quan
                        const relevantMembers = selectedMembers.filter((m) =>
                          allRelevantMemberIds.has(m.id)
                        );

                        return relevantMembers.map((member) => {
                          const settlement = settlements.find(
                            (s) => s.memberId === member.id
                          );
                          const sessionMember = session.members.find(
                            (sm) => sm.memberId === member.id
                          );
                          const isPresent = sessionMember?.isPresent || false;

                          // Tính chi phí cho thành viên này
                          const baseCost =
                            isPresent && presentMembers.length > 0
                              ? (courtCost + shuttlecockCost) /
                                presentMembers.length
                              : 0;

                          let additionalCost = 0;
                          expenses.forEach((expense) => {
                            if (
                              expense.memberIds &&
                              expense.memberIds.includes(member.id)
                            ) {
                              additionalCost +=
                                expense.amount / expense.memberIds.length;
                            } else if (
                              !expense.memberIds ||
                              expense.memberIds.length === 0
                            ) {
                              if (isPresent && presentMembers.length > 0) {
                                additionalCost +=
                                  expense.amount / presentMembers.length;
                              }
                            }
                          });

                          const totalAmount = Math.round(
                            baseCost + additionalCost
                          );

                          return (
                            <TableRow
                              key={member.id}
                              sx={{
                                "&:hover": { backgroundColor: "action.hover" },
                                opacity: isPresent ? 1 : 0.7,
                              }}
                            >
                              <TableCell>
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  {member.avatar ? (
                                    <Avatar
                                      src={transformUrl(member.avatar)}
                                      sx={{mr:2, width: 32, height: 32 }}
                                    />
                                  ) : (
                                    <Avatar
                                      sx={{ mr: 2, width: 32, height: 32 }}
                                    >
                                      {member.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                  )}

                                  <Box>
                                    <Typography variant="body2">
                                      {member.name}
                                    </Typography>
                                    {member.isCustom && (
                                      <Chip
                                        label="Tùy chỉnh"
                                        size="small"
                                        sx={{ mt: 0.5, height: 18 }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {isPresent ? (
                                  <CheckCircle color="success" />
                                ) : (
                                  <Chip
                                    label="Vắng"
                                    color="default"
                                    size="small"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                    color={
                                      totalAmount > 0
                                        ? "primary.main"
                                        : "text.disabled"
                                    }
                                  >
                                    {formatCurrency(totalAmount)}
                                  </Typography>
                                  {additionalCost > 0 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      ({formatCurrency(baseCost)} +{" "}
                                      {formatCurrency(additionalCost)})
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Checkbox
                                  checked={settlement?.isPaid || false}
                                  onChange={() =>
                                    togglePaymentStatus(member.id)
                                  }
                                  disabled={totalAmount === 0}
                                  color="success"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={
                                    settlement?.isPaid
                                      ? "Đã thanh toán"
                                      : "Chưa thanh toán"
                                  }
                                  color={
                                    settlement?.isPaid ? "success" : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Thống kê thanh toán */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    backgroundColor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Tổng số người
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {(() => {
                          const presentMembers = selectedMembers.filter(
                            (m) =>
                              session.members.find((sm) => sm.memberId === m.id)
                                ?.isPresent
                          );
                          const membersWithAdditionalExpenses =
                            new Set<string>();
                          expenses.forEach((expense) => {
                            if (
                              expense.memberIds &&
                              expense.memberIds.length > 0
                            ) {
                              expense.memberIds.forEach((id) =>
                                membersWithAdditionalExpenses.add(id)
                              );
                            }
                          });
                          return new Set([
                            ...presentMembers.map((m) => m.id),
                            ...Array.from(membersWithAdditionalExpenses),
                          ]).size;
                        })()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Đã thanh toán
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="success.main"
                      >
                        {settlements.filter((s) => s.isPaid).length}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">
                        Chưa thanh toán
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        {settlements.filter((s) => !s.isPaid).length}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );
      }

      case 5:
        return (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Xác nhận thay đổi
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Vui lòng kiểm tra lại thông tin trước khi lưu thay đổi.
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Thông tin cơ bản
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tên:</strong> {formik.values.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sân:</strong>{" "}
                      {
                        courts?.find((c) => c.id === formik.values.courtId)
                          ?.name
                      }
                    </Typography>
                    <Typography variant="body2">
                      <strong>Ngày:</strong>{" "}
                      {dayjs(formik.values.date).format("DD/MM/YYYY")}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Giờ:</strong> {formik.values.startTime} -{" "}
                      {formik.values.endTime}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Trạng thái:</strong>{" "}
                      {getSessionStatusText(formik.values.status)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Thành viên và thanh toán
                    </Typography>
                    <Typography variant="body2">
                      <strong>Thành viên:</strong> {selectedMembers.length}/
                      {formik.values.maxParticipants}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Có mặt:</strong>{" "}
                      {
                        selectedMembers.filter(
                          (m) =>
                            session.members.find((sm) => sm.memberId === m.id)
                              ?.isPresent
                        ).length
                      }{" "}
                      người
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sảnh chờ:</strong> {waitingList.length} người
                    </Typography>
                    <Typography variant="body2">
                      <strong>Đã thanh toán:</strong>{" "}
                      {settlements.filter((s) => s.isPaid).length}/
                      {
                        settlements.filter((s) => {
                          const sessionMember = session.members.find(
                            (sm) => sm.memberId === s.memberId
                          );
                          return sessionMember?.isPresent;
                        }).length
                      }{" "}
                      người
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Tổng kết chi phí
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tổng chi phí:</strong>{" "}
                      {formatCurrency(
                        (useAutoCourt
                          ? (courts?.find((c) => c.id === formik.values.courtId)
                              ?.pricePerHour || 0) *
                            calculateSessionDuration(
                              formik.values.startTime,
                              formik.values.endTime
                            )
                          : manualCourtCost) +
                          shuttlecockCount * shuttlecockPrice +
                          expenses.reduce((sum, exp) => sum + exp.amount, 0)
                      )}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Đã thu:</strong>{" "}
                      {formatCurrency(
                        settlements.reduce((sum, s) => {
                          const sessionMember = session.members.find(
                            (sm) => sm.memberId === s.memberId
                          );
                          return sessionMember?.isPresent && s.isPaid
                            ? sum + s.amount
                            : sum;
                        }, 0)
                      )}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Còn thiếu:</strong>{" "}
                      {formatCurrency(
                        settlements.reduce((sum, s) => {
                          const sessionMember = session.members.find(
                            (sm) => sm.memberId === s.memberId
                          );
                          return sessionMember?.isPresent && !s.isPaid
                            ? sum + s.amount
                            : sum;
                        }, 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return "Unknown step";
    }
  };

  const handleQrImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Kiểm tra kích thước file (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar("Kích thước ảnh không được vượt quá 5MB", "error");
        return;
      }

      // Kiểm tra loại file
      if (!file.type.startsWith("image/")) {
        showSnackbar("Vui lòng chọn file ảnh", "error");
        return;
      }

      const reader = new FileReader();

      reader.onloadend = () => {
        setQrImage(reader.result as string);
        showSnackbar("Đã tải ảnh QR thành công", "success");
      };

      reader.onerror = () => {
        showSnackbar("Có lỗi khi tải ảnh QR", "error");
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile} // ✅ Thêm fullScreen cho mobile
        sx={{
          "& .MuiDialog-paper": {
            maxHeight: { xs: "100vh", sm: "90vh" }, // ✅ Full height trên mobile
            m: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            fontSize: { xs: "1.25rem", sm: "1.5rem" }, // ✅ Responsive title
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6">
                Chỉnh sửa lịch đánh: {session.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {session.id}
              </Typography>
            </Box>
            <Tooltip title="Xóa lịch đánh">
              <IconButton
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: { xs: 2, sm: 3 }, // ✅ Responsive padding
            overflowY: "auto",
          }}
        >
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(activeStep)}
        </DialogContent>

        <DialogActions
          sx={{
            p: { xs: 1.5, sm: 2 }, // ✅ Responsive padding
            flexDirection: { xs: "column", sm: "row" }, // ✅ Stack buttons on mobile
            gap: 1,
          }}
        >
          <Button
            onClick={handleClose}
            startIcon={<Cancel />}
            fullWidth={isMobile}
          >
            Hủy
          </Button>
          <Box sx={{ flex: "1 1 auto" }} />
          {activeStep !== 0 && <Button onClick={handleBack}>Quay lại</Button>}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={updateSessionMutation.isPending}
            startIcon={activeStep === steps.length - 1 ? <Save /> : undefined}
          >
            {updateSessionMutation.isPending ? (
              <CircularProgress size={20} />
            ) : activeStep === steps.length - 1 ? (
              "Lưu thay đổi"
            ) : (
              "Tiếp theo"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Warning sx={{ mr: 1, color: "error.main" }} />
            Xác nhận xóa lịch đánh
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác!
            </Typography>
          </Alert>
          <Typography variant="body1">
            Bạn có chắc chắn muốn xóa lịch đánh{" "}
            <strong>"{session.name}"</strong>?
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "action.hover",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Ngày:</strong> {dayjs(session.date).format("DD/MM/YYYY")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Giờ:</strong> {session.startTime} - {session.endTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Thành viên:</strong> {session.currentParticipants} người
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Chi phí:</strong> {formatCurrency(session.totalCost)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Trạng thái:</strong>{" "}
              {getSessionStatusText(session.status)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleDeleteSession}
            color="error"
            variant="contained"
            disabled={deleteSessionMutation.isPending}
            startIcon={
              deleteSessionMutation.isPending ? (
                <CircularProgress size={16} />
              ) : (
                <Delete />
              )
            }
          >
            {deleteSessionMutation.isPending ? "Đang xóa..." : "Xóa lịch đánh"}
          </Button>
        </DialogActions>

        {/* ===== THÊM SNACKBAR MỚI ===== */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
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
    </>
  );
};

export default SessionEditForm;
