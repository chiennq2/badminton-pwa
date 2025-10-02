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
  Divider,
  Switch,
  FormControlLabel,
  Avatar,
  Paper,
  Alert,
  Tooltip,
  ListItemAvatar,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import {
  Add,
  Remove,
  Delete,
  Group,
  Person,
  Upload,
  AttachMoney,
  SportsTennis,
  Schedule,
  MoveUp,
  Close,
} from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import {
  useCourts,
  useMembers,
  useGroups,
  useCreateSession,
  useUpdateSession,
} from "../hooks";
import {
  Session,
  SessionExpense,
  Member,
  Court,
  Group as GroupType,
} from "../types";
import { formatCurrency, calculateSessionDuration } from "../utils";

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSession?: Session | null;
}

interface CustomMember {
  id: string;
  name: string;
  isCustom: boolean;
}

interface ExpenseWithMembers extends SessionExpense {
  assignedMembers: string[];
}

const steps = ["Thông tin cơ bản", "Chọn thành viên", "Sảnh chờ", "Chi phí"];
const SessionForm: React.FC<SessionFormProps> = ({
  open,
  onClose,
  onSuccess,
  editingSession,
}) => {
  const { data: courts } = useCourts();
  const { data: members } = useMembers();
  const { data: groups } = useGroups();
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<CustomMember[]>([]);
  const [waitingList, setWaitingList] = useState<CustomMember[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithMembers[]>([]);
  const [courtCost, setCourtCost] = useState(0);
  const [shuttlecockCount, setShuttlecockCount] = useState(0);
  const [shuttlecockPrice, setShuttlecockPrice] = useState(25000);
  const [customMemberName, setCustomMemberName] = useState("");
  const [customWaitingMemberName, setCustomWaitingMemberName] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);

  const validationSchemas = [
    // Step 1: Basic Info
    Yup.object({
      name: Yup.string().required("Tên lịch là bắt buộc"),
      courtId: Yup.string().required("Vui lòng chọn sân"),
      date: Yup.date().required("Ngày là bắt buộc"),
      startTime: Yup.string().required("Giờ bắt đầu là bắt buộc"),
      endTime: Yup.string().required("Giờ kết thúc là bắt buộc"),
      maxParticipants: Yup.number()
        .min(2, "Tối thiểu 2 người")
        .max(60, "Tối đa 60 người")
        .required("Số người tối đa là bắt buộc"),
    }),
    Yup.object({}), // Step 2
    Yup.object({}), // Step 3
    Yup.object({}), // Step 4
  ];

  const formik = useFormik({
    initialValues: {
      name: editingSession?.name || "",
      courtId: editingSession?.courtId || "",
      date: editingSession?.date || dayjs().add(1, "day").toDate(),
      startTime: editingSession?.startTime || "19:00",
      endTime: editingSession?.endTime || "21:00",
      maxParticipants: editingSession?.maxParticipants || 8,
      notes: editingSession?.notes || "",
      status: editingSession?.status || "scheduled",
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
  // Load existing session data for edit mode
  useEffect(() => {
    if (editingSession && members) {
      // Load existing members
      const existingMembers: CustomMember[] = editingSession.members.map(
        (sm) => ({
          id: sm.memberId,
          name:
            sm.memberName ||
            members.find((m) => m.id === sm.memberId)?.name ||
            sm.memberId,
          isCustom: sm.isCustom || false,
        })
      );
      setSelectedMembers(existingMembers);

      // Load existing waiting list
      const existingWaiting: CustomMember[] = editingSession.waitingList.map(
        (wm) => ({
          id: wm.memberId,
          name:
            wm.memberName ||
            members.find((m) => m.id === wm.memberId)?.name ||
            wm.memberId,
          isCustom: wm.isCustom || false,
        })
      );
      setWaitingList(existingWaiting);

      // Load expenses
      const courtExpense = editingSession.expenses.find(
        (e) => e.type === "court"
      );
      setCourtCost(courtExpense?.amount || 0);

      const shuttleExpense = editingSession.expenses.find(
        (e) => e.type === "shuttlecock"
      );
      if (shuttleExpense) {
        const description = shuttleExpense.description || "";
        const match = description.match(/(\d+)\s*quả\s*x\s*[\d,]+/);
        if (match) {
          setShuttlecockCount(parseInt(match[1]));
          setShuttlecockPrice(shuttleExpense.amount / parseInt(match[1]));
        } else {
          setShuttlecockCount(1);
          setShuttlecockPrice(shuttleExpense.amount);
        }
      }

      const otherExpenses: ExpenseWithMembers[] = editingSession.expenses
        .filter((e) => e.type === "other")
        .map((e) => ({ ...e, assignedMembers: [] }));
      setExpenses(otherExpenses);

      if (editingSession.qrImage) {
        setQrImage(editingSession.qrImage);
      }
    }
  }, [editingSession, members]);

  const handleSaveSession = async (values: any) => {
    try {
      const selectedCourt = courts?.find((c) => c.id === values.courtId);
      if (!selectedCourt) return;

      const shuttlecockCost = shuttlecockCount * shuttlecockPrice;
      const totalFixedCost = courtCost + shuttlecockCost;
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalCost = totalFixedCost + totalExpenses;

      const sessionExpenses = [
        ...(courtCost > 0
          ? [
              {
                id: "court-cost",
                name: "Tiền sân",
                amount: courtCost,
                type: "court" as const,
                description: `Phí thuê sân`,
              },
            ]
          : []),
        ...(shuttlecockCost > 0
          ? [
              {
                id: "shuttlecock-cost",
                name: "Tiền cầu",
                amount: shuttlecockCost,
                type: "shuttlecock" as const,
                description: `${shuttlecockCount} quả x ${formatCurrency(
                  shuttlecockPrice
                )}`,
              },
            ]
          : []),
        ...expenses.map((exp) => ({
          id: exp.id,
          name: exp.name,
          amount: exp.amount,
          type: exp.type,
          description: exp.description,
        })),
      ];

      const sessionData = {
        name: values.name,
        courtId: values.courtId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        maxParticipants: values.maxParticipants,
        currentParticipants: selectedMembers.length,
        status: values.status,

        // CẢI THIỆN: Lưu cả memberName cho custom members
        members: selectedMembers.map((member) => ({
          memberId: member.id,
          memberName: member.name, // QUAN TRỌNG: Luôn lưu memberName
          isPresent:
            editingSession?.members.find((m) => m.memberId === member.id)
              ?.isPresent || false,
          isCustom: member.isCustom, // QUAN TRỌNG: Lưu flag isCustom
        })),

        // CẢI THIỆN: Lưu cả memberName cho custom members trong waiting list
        waitingList: waitingList.map((member, index) => ({
          memberId: member.id,
          memberName: member.name, // QUAN TRỌNG: Luôn lưu memberName
          addedAt: new Date(),
          priority: index + 1,
          isCustom: member.isCustom, // QUAN TRỌNG: Lưu flag isCustom
        })),

        expenses: sessionExpenses,
        totalCost,
        costPerPerson:
          selectedMembers.length > 0
            ? totalFixedCost / selectedMembers.length
            : 0,
        settlements: editingSession?.settlements || [],
        notes: values.notes,
        qrImage: qrImage ?? "",
        createdBy: editingSession?.createdBy || "current-user",
        ...(editingSession
          ? { updatedAt: new Date() }
          : { createdAt: new Date(), updatedAt: new Date() }),
      };

      console.log("Saving session with custom members:", {
        selectedMembers: selectedMembers.map((m) => ({
          id: m.id,
          name: m.name,
          isCustom: m.isCustom,
        })),
        waitingList: waitingList.map((m) => ({
          id: m.id,
          name: m.name,
          isCustom: m.isCustom,
        })),
      });

      if (editingSession) {
        await updateSessionMutation.mutateAsync({
          id: editingSession.id,
          data: sessionData,
        });
      } else {
        await createSessionMutation.mutateAsync(sessionData);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedMembers([]);
    setWaitingList([]);
    setExpenses([]);
    setCourtCost(0);
    setShuttlecockCount(0);
    setShuttlecockPrice(25000);
    setQrImage(null);
    setCustomMemberName("");
    setCustomWaitingMemberName("");
    formik.resetForm();
    onClose();
  };
  const addMemberFromList = (member: Member) => {
    const customMember: CustomMember = {
      id: member.id,
      name: member.name,
      isCustom: false,
    };
    if (selectedMembers.length < formik.values.maxParticipants) {
      if (!selectedMembers.some((m) => m.id === member.id)) {
        setSelectedMembers([...selectedMembers, customMember]);
      }
    } else {
      if (!waitingList.some((m) => m.id === member.id)) {
        setWaitingList([...waitingList, customMember]);
      }
    }
  };

  const addMemberFromGroup = (group: GroupType) => {
    const groupMembers =
      members?.filter((m) => group.memberIds.includes(m.id)) || [];
    const newSelectedMembers = [...selectedMembers];
    const newWaitingList = [...waitingList];

    groupMembers.forEach((member) => {
      const customMember: CustomMember = {
        id: member.id,
        name: member.name,
        isCustom: false,
      };

      if (
        !newSelectedMembers.some((m) => m.id === member.id) &&
        !newWaitingList.some((m) => m.id === member.id)
      ) {
        if (newSelectedMembers.length < formik.values.maxParticipants) {
          newSelectedMembers.push(customMember);
        } else {
          newWaitingList.push(customMember);
        }
      }
    });

    setSelectedMembers(newSelectedMembers);
    setWaitingList(newWaitingList);
  };

  const addCustomMember = () => {
    if (!customMemberName.trim()) return;

    const customMember: CustomMember = {
      id: `custom-member-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`, // ID unique hơn
      name: customMemberName.trim(),
      isCustom: true,
    };

    if (selectedMembers.length < formik.values.maxParticipants) {
      setSelectedMembers([...selectedMembers, customMember]);
    } else {
      setWaitingList([...waitingList, customMember]);
    }

    setCustomMemberName("");
    console.log("Added custom member:", customMember);
  };

  const addCustomWaitingMember = () => {
    if (!customWaitingMemberName.trim()) return;

    const customMember: CustomMember = {
      id: `custom-waiting-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`, // ID unique hơn
      name: customWaitingMemberName.trim(),
      isCustom: true,
    };

    setWaitingList([...waitingList, customMember]);
    setCustomWaitingMemberName("");
    console.log("Added custom waiting member:", customMember);
  };

  const removeMember = (member: CustomMember) => {
    const newSelectedMembers = selectedMembers.filter(
      (m) => m.id !== member.id
    );
    setSelectedMembers(newSelectedMembers);

    if (
      waitingList.length > 0 &&
      newSelectedMembers.length < formik.values.maxParticipants
    ) {
      const firstWaiting = waitingList[0];
      setWaitingList(waitingList.slice(1));
      setSelectedMembers([...newSelectedMembers, firstWaiting]);
    }
  };

  const removeFromWaitingList = (member: CustomMember) => {
    setWaitingList(waitingList.filter((m) => m.id !== member.id));
  };

  const moveFromWaitingToMain = (member: CustomMember) => {
    if (selectedMembers.length < formik.values.maxParticipants) {
      setWaitingList(waitingList.filter((m) => m.id !== member.id));
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const addExpense = () => {
    const newExpense: ExpenseWithMembers = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      type: "other",
      description: "",
      assignedMembers: [],
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (
    id: string,
    field: keyof ExpenseWithMembers,
    value: any
  ) => {
    setExpenses(
      expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  const handleQrImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Tên lịch đánh"
                  placeholder="VD: Lịch đánh thứ 7 tuần này"
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
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <SportsTennis sx={{ mr: 1, fontSize: "small" }} />
                            {court.name} - {court.location} (
                            {formatCurrency(court.pricePerHour)}/giờ)
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Ngày"
                  value={formik.values.date ? dayjs(formik.values.date) : null}
                  onChange={(newValue) => {
                    formik.setFieldValue("date", newValue?.toDate());
                  }}
                  dayOfWeekFormatter={(day) => {
                    // ✅ THÊM
                    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                    return dayNames[day];
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: formik.touched.date && Boolean(formik.errors.date),
                      helperText:
                        formik.touched.date && formik.errors.date
                          ? String(formik.errors.date)
                          : undefined,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ bắt đầu"
                  value={dayjs(`2000-01-01T${formik.values.startTime}`)}
                  onChange={(newValue) => {
                    formik.setFieldValue(
                      "startTime",
                      newValue?.format("HH:mm")
                    );
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error:
                        formik.touched.startTime &&
                        Boolean(formik.errors.startTime),
                      helperText:
                        formik.touched.startTime && formik.errors.startTime,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TimePicker
                  label="Giờ kết thúc"
                  value={dayjs(`2000-01-01T${formik.values.endTime}`)}
                  onChange={(newValue) => {
                    formik.setFieldValue("endTime", newValue?.format("HH:mm"));
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error:
                        formik.touched.endTime &&
                        Boolean(formik.errors.endTime),
                      helperText:
                        formik.touched.endTime && formik.errors.endTime,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
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

              {editingSession && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      label="Trạng thái"
                    >
                      <MenuItem value="scheduled">
                        <Chip
                          label="Đã lên lịch"
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        Đã lên lịch
                      </MenuItem>
                      <MenuItem value="ongoing">
                        <Chip
                          label="Đang diễn ra"
                          color="warning"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        Đang diễn ra
                      </MenuItem>
                      <MenuItem value="completed">
                        <Chip
                          label="Đã hoàn thành"
                          color="success"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        Đã hoàn thành
                      </MenuItem>
                      <MenuItem value="cancelled">
                        <Chip
                          label="Đã hủy"
                          color="error"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        Đã hủy
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="notes"
                  label="Ghi chú"
                  placeholder="Ghi chú thêm về lịch đánh..."
                  multiline
                  rows={3}
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>

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
                        id="qr-upload"
                        type="file"
                        onChange={handleQrImageUpload}
                      />
                      <label htmlFor="qr-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Upload />}
                        >
                          Tải ảnh QR
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
                          }}
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 1 }}
                        >
                          QR Code đã tải lên
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
            <Alert severity="info" sx={{ mb: 3 }}>
              Đang chọn:{" "}
              <strong>
                {selectedMembers.length}/{formik.values.maxParticipants}
              </strong>{" "}
              thành viên tham gia
            </Alert>

            {/* Add from member list */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Person sx={{ mr: 1 }} />
                  Thêm từ danh sách thành viên
                </Typography>
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
                    `${option.name} (${option.skillLevel})`
                  }
                  onChange={(_, value) => {
                    if (value) {
                      addMemberFromList(value);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tìm và thêm thành viên"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {option.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.skillLevel}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </CardContent>
            </Card>

            {/* Add from groups */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Group sx={{ mr: 1 }} />
                  Thêm từ nhóm
                </Typography>
                {groups && groups.length > 0 ? (
                  <Grid container spacing={1}>
                    {groups.map((group) => (
                      <Grid item key={group.id}>
                        <Tooltip
                          title={`Thêm tất cả ${group.memberIds.length} thành viên`}
                        >
                          <Chip
                            label={`${group.name} (${group.memberIds.length})`}
                            onClick={() => addMemberFromGroup(group)}
                            icon={<Group />}
                            variant="outlined"
                            clickable
                            color="primary"
                          />
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có nhóm nào được tạo
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Add custom member */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Add sx={{ mr: 1 }} />
                  Thêm tên tùy chỉnh
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    label="Tên thành viên"
                    placeholder="Nhập tên..."
                    value={customMemberName}
                    onChange={(e) => setCustomMemberName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addCustomMember()}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomMember}
                    disabled={!customMemberName.trim()}
                    startIcon={<Add />}
                  >
                    Thêm
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Selected members list */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Danh sách tham gia ({selectedMembers.length})
                </Typography>
                {selectedMembers.length === 0 ? (
                  <Alert severity="warning">
                    Chưa có thành viên nào được chọn
                  </Alert>
                ) : (
                  <List dense>
                    {selectedMembers.map((member, index) => (
                      <ListItem
                        key={member.id}
                        divider={index < selectedMembers.length - 1}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: member.isCustom
                                ? "secondary.main"
                                : "primary.main",
                            }}
                          >
                            {member.isCustom ? (
                              <Person />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.name}
                          secondary={
                            member.isCustom ? "Tên tùy chỉnh" : "Thành viên"
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Xóa khỏi danh sách">
                            <IconButton
                              edge="end"
                              onClick={() => removeMember(member)}
                              size="small"
                              color="error"
                            >
                              <Close />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Sảnh chờ: <strong>{waitingList.length}</strong> người đang chờ
            </Alert>

            {/* Add from member list to waiting */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Person sx={{ mr: 1 }} />
                  Thêm từ danh sách thành viên
                </Typography>
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
                    `${option.name} (${option.skillLevel})`
                  }
                  onChange={(_, value) => {
                    if (value) {
                      const customMember: CustomMember = {
                        id: value.id,
                        name: value.name,
                        isCustom: false,
                      };
                      setWaitingList([...waitingList, customMember]);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Thêm vào sảnh chờ"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {option.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.skillLevel}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </CardContent>
            </Card>

            {/* Add custom waiting member */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Add sx={{ mr: 1 }} />
                  Thêm tên tùy chỉnh vào sảnh chờ
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    size="small"
                    label="Tên thành viên"
                    placeholder="Nhập tên..."
                    value={customWaitingMemberName}
                    onChange={(e) => setCustomWaitingMemberName(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && addCustomWaitingMember()
                    }
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={addCustomWaitingMember}
                    disabled={!customWaitingMemberName.trim()}
                    startIcon={<Add />}
                  >
                    Thêm
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Waiting list */}
            <Card>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Schedule sx={{ mr: 1 }} />
                  Danh sách chờ ({waitingList.length})
                </Typography>
                {waitingList.length === 0 ? (
                  <Alert severity="info">
                    Sảnh chờ trống. Thành viên sẽ được thêm vào đây khi danh
                    sách chính đã đầy.
                  </Alert>
                ) : (
                  <List dense>
                    {waitingList.map((member, index) => (
                      <ListItem
                        key={member.id}
                        divider={index < waitingList.length - 1}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: member.isCustom
                                ? "secondary.main"
                                : "warning.main",
                            }}
                          >
                            {member.isCustom ? <Person /> : index + 1}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${index + 1}. ${member.name}`}
                          secondary={
                            member.isCustom ? "Tên tùy chỉnh" : "Thành viên"
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Chuyển vào danh sách chính">
                            <IconButton
                              onClick={() => moveFromWaitingToMain(member)}
                              size="small"
                              disabled={
                                selectedMembers.length >=
                                formik.values.maxParticipants
                              }
                              color="primary"
                            >
                              <MoveUp />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa khỏi sảnh chờ">
                            <IconButton
                              edge="end"
                              onClick={() => removeFromWaitingList(member)}
                              size="small"
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      case 3:
        const totalFixedCost = courtCost + shuttlecockCount * shuttlecockPrice;
        const totalExpenses = expenses.reduce(
          (sum, exp) => sum + exp.amount,
          0
        );
        const totalCost = totalFixedCost + totalExpenses;
        const allMembers = [...selectedMembers, ...waitingList];

        return (
          <Box sx={{ pt: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center" }}
            >
              <AttachMoney sx={{ mr: 1 }} />
              Chi phí dự kiến
            </Typography>

            {/* Court Cost */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <SportsTennis sx={{ mr: 1 }} />
                  Tiền sân
                </Typography>
                <TextField
                  fullWidth
                  label="Số tiền sân (VNĐ)"
                  type="number"
                  value={courtCost}
                  onChange={(e) => setCourtCost(Number(e.target.value))}
                  helperText="Mặc định là 0, có thể tùy chỉnh"
                  InputProps={{
                    startAdornment: (
                      <AttachMoney sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
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
                      label="Số lượng quả cầu"
                      type="number"
                      value={shuttlecockCount}
                      onChange={(e) =>
                        setShuttlecockCount(Number(e.target.value))
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Giá mỗi quả (VNĐ)"
                      type="number"
                      value={shuttlecockPrice}
                      onChange={(e) =>
                        setShuttlecockPrice(Number(e.target.value))
                      }
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                </Grid>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ mt: 1, fontWeight: "medium" }}
                >
                  Tổng tiền cầu:{" "}
                  {formatCurrency(shuttlecockCount * shuttlecockPrice)}
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Tiền sân và tiền cầu</strong> sẽ được chia đều cho{" "}
                <strong>{selectedMembers.length} người tham gia</strong>
                {selectedMembers.length > 0 && (
                  <span>
                    {" "}
                    ({formatCurrency(totalFixedCost / selectedMembers.length)}
                    /người)
                  </span>
                )}
              </Typography>
            </Alert>
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
                  <Button
                    startIcon={<Add />}
                    onClick={addExpense}
                    size="small"
                    variant="outlined"
                  >
                    Thêm khoản chi
                  </Button>
                </Box>

                {expenses.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 2 }}
                  >
                    Chưa có khoản chi bổ sung nào
                  </Typography>
                ) : (
                  expenses.map((expense, index) => (
                    <Paper
                      key={expense.id}
                      sx={{ p: 2, mb: 2, bgcolor: "action.hover" }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Tên chi phí"
                            placeholder="VD: Nước uống, đồ ăn..."
                            value={expense.name}
                            onChange={(e) =>
                              updateExpense(expense.id, "name", e.target.value)
                            }
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Số tiền (VNĐ)"
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
                        <Grid item xs={12} sm={2}>
                          <Tooltip title="Xóa khoản chi này">
                            <IconButton
                              onClick={() => removeExpense(expense.id)}
                              color="error"
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Mô tả"
                            placeholder="Mô tả chi tiết về khoản chi..."
                            value={expense.description}
                            onChange={(e) =>
                              updateExpense(
                                expense.id,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            Người chia tiền cho khoản này:
                          </Typography>
                          <Autocomplete
                            multiple
                            options={allMembers}
                            getOptionLabel={(option) => option.name}
                            value={allMembers.filter((m) =>
                              expense.assignedMembers.includes(m.id)
                            )}
                            onChange={(_, newValue) => {
                              updateExpense(
                                expense.id,
                                "assignedMembers",
                                newValue.map((m) => m.id)
                              );
                            }}
                            renderTags={(value, getTagProps) =>
                              value.map((option, index) => (
                                <Chip
                                  variant="outlined"
                                  label={option.name}
                                  {...getTagProps({ index })}
                                  key={option.id}
                                  avatar={
                                    <Avatar
                                      sx={{
                                        bgcolor: option.isCustom
                                          ? "secondary.main"
                                          : "primary.main",
                                      }}
                                    >
                                      {option.isCustom ? (
                                        <Person />
                                      ) : (
                                        option.name.charAt(0)
                                      )}
                                    </Avatar>
                                  }
                                />
                              ))
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                placeholder="Chọn người chia tiền hoặc để trống để chia cho tất cả"
                                helperText={
                                  expense.assignedMembers.length === 0
                                    ? "Sẽ chia đều cho tất cả thành viên tham gia"
                                    : `Chia cho ${expense.assignedMembers.length} người được chọn`
                                }
                              />
                            )}
                            renderOption={(props, option) => (
                              <Box component="li" {...props}>
                                <Avatar
                                  sx={{
                                    mr: 2,
                                    width: 32,
                                    height: 32,
                                    bgcolor: option.isCustom
                                      ? "secondary.main"
                                      : "primary.main",
                                  }}
                                >
                                  {option.isCustom ? (
                                    <Person />
                                  ) : (
                                    option.name.charAt(0)
                                  )}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2">
                                    {option.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {option.isCustom
                                      ? "Tên tùy chỉnh"
                                      : "Thành viên"}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  ))
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
                  <Typography fontWeight="medium">
                    {formatCurrency(courtCost)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Tiền cầu:</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(shuttlecockCount * shuttlecockPrice)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography>Chi phí bổ sung:</Typography>
                  <Typography fontWeight="medium">
                    {formatCurrency(totalExpenses)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Tổng cộng:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatCurrency(totalCost)}
                  </Typography>
                </Box>

                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Chi phí cố định/người:</strong>{" "}
                    {formatCurrency(
                      selectedMembers.length > 0
                        ? totalFixedCost / selectedMembers.length
                        : 0
                    )}
                    <br />
                    <strong>Số người chia:</strong> {selectedMembers.length}{" "}
                    người tham gia
                    {totalExpenses > 0 && (
                      <>
                        <br />
                        <strong>Chi phí bổ sung:</strong> Chia theo lựa chọn
                        riêng
                      </>
                    )}
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return "Unknown step";
    }
  };

  const isLoading =
    createSessionMutation.isPending || updateSessionMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div">
          {editingSession ? "Chỉnh sửa lịch đánh" : "Tạo lịch đánh mới"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {editingSession
            ? "Cập nhật thông tin lịch đánh"
            : "Tạo lịch đánh cầu lông mới"}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>
                <Typography variant={activeStep === index ? "body1" : "body2"}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} size="large">
          Hủy
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        {activeStep !== 0 && (
          <Button
            onClick={() => setActiveStep(activeStep - 1)}
            size="large"
            disabled={isLoading}
          >
            Quay lại
          </Button>
        )}
        <Button
          variant="contained"
          component="button"
          onClick={() => formik.handleSubmit()}
          disabled={isLoading}
          size="large"
          sx={{ minWidth: 120 }}
        >
          {isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            editingSession ? (
              "Cập nhật lịch"
            ) : (
              "Tạo lịch"
            )
          ) : (
            "Tiếp theo"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionForm;
