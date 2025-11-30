import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Divider,
  Alert,
  Checkbox,
  Tooltip,
  TextField,
  IconButton,
  Button,
} from "@mui/material";
import {
  ExpandMore,
  Receipt,
  People,
  AccountBalance,
  SportsTennis,
  Fastfood,
  CheckCircle,
  Edit,
} from "@mui/icons-material";
import { formatCurrency, calculateMemberSettlement, generateDetailedSettlements, transformUrl } from "../utils";
import { Session, SessionExpense } from "../types";
import { useCourts, useUpdateSession } from "../hooks";
import ExpenseUpdateDialog from "./ExpenseUpdateDialog";

interface ExpenseDetailProps {
  session: Session;
  members: { id: string; name: string }[];
  onPaymentStatusChange: (memberId: string, isPaid: boolean) => void;
  onNoteChange?: (memberId: string, notePayment: string) => void; // ✅ thêm prop mới
  isUpdating?: boolean;
  onUpdate?: () => void; // ✅ THÊM MỚI

}

const ExpenseDetail: React.FC<ExpenseDetailProps> = ({
  session,
  members,
  onPaymentStatusChange,
  onNoteChange,
  isUpdating = false,
  onUpdate, // ✅ THÊM MỚI

}) => {
  // Thêm state
  const [expenseDialogOpen, setExpenseDialogOpen] = React.useState(false);
  const updateSessionMutation = useUpdateSession();
  const { data: courts } = useCourts();

  // ===== STATE CHO GHI CHÚ INLINE =====
  const [pendingNoteMemberId, setPendingNoteMemberId] = React.useState<
    string | null
  >(null);
  const [editingNoteMemberId, setEditingNoteMemberId] = React.useState<
    string | null
  >(null);
  const [noteValue, setNoteValue] = React.useState<string>("");
  // ===== LOGIC MỚI: Lấy tất cả thành viên liên quan =====
  const presentMembers = session.members.filter((m) => m.isPresent);

  // Lấy danh sách các khoản chi bổ sung
  const additionalExpenses = useMemo(() => {
    return session.expenses.filter((exp) => exp.type === "other");
  }, [session.expenses]);

  // Lấy tất cả memberIds từ chi phí bổ sung
  const membersWithAdditionalExpenses = new Set<string>();
  additionalExpenses.forEach((expense) => {
    if (expense.memberIds && expense.memberIds.length > 0) {
      expense.memberIds.forEach((memberId) =>
        membersWithAdditionalExpenses.add(memberId)
      );
    }
  });

  // Kết hợp: thành viên có mặt + thành viên có chi phí bổ sung
  const allRelevantMemberIds = new Set([
    ...presentMembers.map((m) => m.memberId),
    ...Array.from(membersWithAdditionalExpenses),
  ]);

  // Lấy danh sách session members liên quan
  const relevantMembers = session.members.filter((m) =>
    allRelevantMemberIds.has(m.memberId)
  );

  // Tính toán chi tiết cho từng thành viên
  const memberPayments = useMemo(() => {
    return relevantMembers.map((sessionMember) => {
      const member = members.find((m) => m.id === sessionMember.memberId);
      const settlement = calculateMemberSettlement(
        session,
        sessionMember.memberId,
        members
      );

      // Tạo map các khoản bổ sung cho thành viên này
      const additionalCostsMap = new Map<string, number>();
      settlement.additionalCosts.forEach((cost) => {
        additionalCostsMap.set(cost.name, cost.amount);
      });

      return {
        id: sessionMember.memberId,
        name: sessionMember.memberName || member?.name || "Unknown",
        isWoman: sessionMember?.isWoman || false,
        avatar: sessionMember.avatar || '',
        isCustom: sessionMember.isCustom || !member,
        isPresent: sessionMember.isPresent,
        baseCost: settlement.baseCost,
        priceSlot: session.priceSlot,
        replacementNote: sessionMember.replacementNote,
        additionalCosts: settlement.additionalCosts,
        additionalCostsMap, // Map: tên khoản chi -> số tiền
        total: settlement.total,
        isPaid:
          session.settlements?.find(
            (s) => s.memberId === sessionMember.memberId
          )?.isPaid || false,
        note:
          session.settlements?.find(
            (s) => s.memberId === sessionMember.memberId
          )?.paymentNote || "",
      };
    });
  }, [relevantMembers, session, members]);

  // Lấy thông tin chi phí
  const courtExpense = session.expenses.find((exp) => exp.type === "court");
  const shuttlecockExpense = session.expenses.find(
    (exp) => exp.type === "shuttlecock"
  );
  const courtCost = courtExpense?.amount || 0;
  const shuttlecockCost = shuttlecockExpense?.amount || 0;

  // Tính tổng
  const totalBaseCost = memberPayments.reduce((sum, m) => sum + m.baseCost, 0);
  const grandTotal = memberPayments.reduce((sum, m) => sum + m.total, 0);
  const totalPriceSlotPass = memberPayments.reduce((sum, m) => {
    if (m.replacementNote?.trim().length > 0) {
      return sum + m.priceSlot;
    }
    return sum;
  }, 0);

  // Tính tổng cho từng cột chi phí bổ sung
  const additionalColumnTotals = useMemo(() => {
    const totals = new Map<string, number>();
    additionalExpenses.forEach((expense) => {
      let total = 0;
      memberPayments.forEach((payment) => {
        total += payment.additionalCostsMap.get(expense.name) || 0;
      });
      totals.set(expense.name, total);
    });
    return totals;
  }, [additionalExpenses, memberPayments]);

    const handleExpenseUpdate = async (expenses: SessionExpense[]) => {
    try {
      // Tính lại tổng chi phí
      const totalCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Tính lại chi phí cơ bản/người
      const presentMembers = session.members.filter(m => m.isPresent);
      const courtExpense = expenses.find(exp => exp.type === 'court');
      const shuttlecockExpense = expenses.find(exp => exp.type === 'shuttlecock');
      const courtCost = courtExpense?.amount || 0;
      const shuttlecockCost = shuttlecockExpense?.amount || 0;
      const costPerPerson = presentMembers.length > 0 
        ? (courtCost + shuttlecockCost) / presentMembers.length 
        : 0;
      
      // Tạo lại settlements với chi phí mới
      const newSettlements = generateDetailedSettlements(
        { ...session, expenses, totalCost },
        members
      );
      
      // Cập nhật vào database
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          expenses,
          totalCost,
          costPerPerson,
          settlements: newSettlements,
        },
      });
      
      // Refresh data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating expenses:', error);
      throw error;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Receipt sx={{ mr: 1, verticalAlign: "middle" }} />
          Chi tiết chi phí và thanh toán
        </Typography>

        {/* Thông báo */}
        <Alert severity="info" sx={{ mb: 2 }} component="div">
          <Typography variant="body2">
            Danh sách bao gồm cả thành viên vắng mặt nhưng có chi phí bổ sung.
            Nhấp vào checkbox để cập nhật trạng thái thanh toán.
          </Typography>
        </Alert>

          {/* ✅ NÚT CẬP NHẬT CHI PHÍ - CHỈ HIỆN KHI ĐANG DIỄN RA */}
          {session.status === 'ongoing' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Edit />}
              onClick={() => setExpenseDialogOpen(true)}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.813rem' },
                py: { xs: 0.5, sm: 0.75 },
                px: { xs: 1, sm: 1.5 },
              }}
            >
              Cập nhật chi phí
            </Button>
          )}
      

        {/* Chi phí cơ bản */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <AccountBalance sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Chi phí cơ bản
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: "auto", mr: 2 }}
              >
                {formatCurrency(courtCost + shuttlecockCost)}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">
                  <SportsTennis
                    sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }}
                  />
                  Tiền sân
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(courtCost)}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">
                  <SportsTennis
                    sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }}
                  />
                  Tiền cầu
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(shuttlecockCost)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Alert severity="info" component="div">
                <Typography variant="caption" component="span">
                  Chia đều cho<strong>{presentMembers.length} thành viên có mặt</strong> =
                  {formatCurrency(
                    (courtCost + shuttlecockCost) / (presentMembers.length || 1)
                  )}
                  /người
                </Typography>
              </Alert>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Chi phí bổ sung */}
        {additionalExpenses.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box
                sx={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <Fastfood sx={{ mr: 1, color: "warning.main" }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Chi phí bổ sung
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: "auto", mr: 2 }}
                  component="div">
                  {additionalExpenses.length} khoản
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {additionalExpenses.map((expense, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body1" fontWeight="bold" gutterBottom component="div">
                    {expense.name}
                  </Typography>
                  {expense.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <strong>Mô tả:</strong> {expense.description}
                    </Typography>
                  )}
                  <Alert severity="warning" sx={{ mt: 1 }} component="div">
                    <Typography variant="caption">
                      {expense.memberIds && expense.memberIds.length > 0
                        ? `${formatCurrency(expense.amount)} Chia cho ${
                            expense.memberIds.length
                          } thành viên được chọn = ${formatCurrency(
                            expense.amount / expense.memberIds.length
                          )}/người`
                        : `Chia đều cho ${
                            presentMembers.length
                          } thành viên có mặt = ${formatCurrency(
                            expense.amount / (presentMembers.length || 1)
                          )}/người`}
                    </Typography>
                  </Alert>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Bảng thanh toán chi tiết */}
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <People sx={{ mr: 1 }} />
            Danh sách thanh toán thành viên
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }} component="div">
              <Typography variant="body2">
                Lịch đánh ở trạng thái "Hoàn Thành" thì mới đánh dấu được trạng thái thanh toán.
              </Typography>
          </Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "action.hover" }}>
                  <TableCell>
                    <strong>Thành viên</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Trạng thái</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Sân + Cầu</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Slot Pass</strong>
                  </TableCell>
                  {additionalExpenses.map((expense, idx) => (
                    <TableCell key={idx} align="right">
                      <Tooltip title={expense.description || expense.name}>
                        <strong>{expense.name}</strong>
                      </Tooltip>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <strong>Tổng</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Ghi chú</strong>
                  </TableCell>
                  {/* ✅ thêm mới */}
                  <TableCell align="center">
                    <strong>Thanh toán</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memberPayments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    sx={{
                      "&:hover": { backgroundColor: "action.hover" },
                      opacity: payment.isPresent ? 1 : 0.7,
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                          {payment.avatar ? (
                              <Avatar
                                src={transformUrl(payment.avatar)}
                                sx={{ mr:1, width: 32, height: 32 }}
                              />
                            ) : (
                              <Avatar sx={{ mr: 1, width: 28, height: 28 }}>
                              {payment.name.charAt(0).toUpperCase()}
                            </Avatar>
                          )}

                        <Box>
                          <Typography variant="body2" sx={{color: payment.isWoman ? '#ef7be0' : '#4b9aff'}}>
                            {payment.name}
                          </Typography>
                          {payment.isCustom && (
                            <Chip
                              label="Tùy chỉnh"
                              size="small"
                              sx={{ height: 16, fontSize: "0.65rem" }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {payment.isPresent ? (
                        <Chip label="Có mặt" color="success" size="small" />
                      ) : (
                        <Chip label="Vắng" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={
                          payment.isPresent ? "text.primary" : "text.disabled"
                        }
                      >
                        {formatCurrency(payment.baseCost)}
                      </Typography>
                    </TableCell>

                    {payment?.replacementNote?.length > 0 ? (
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color="text.primary"
                      >
                        {formatCurrency(payment.priceSlot)}
                      </Typography>
                    </TableCell>
                    ) : (
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color="text.disabled"
                        >
                          -
                        </Typography>
                        </TableCell>
                    )}

                    {additionalExpenses.map((expense, idx) => {
                      const amount =
                        payment.additionalCostsMap.get(expense.name) || 0;
                      return (
                        <TableCell key={idx} align="right">
                          <Typography
                            variant="body2"
                            color={
                              amount > 0 ? "warning.main" : "text.disabled"
                            }
                            fontWeight={amount > 0 ? "medium" : "normal"}
                          >
                            {amount > 0 ? formatCurrency(amount) : "-"}
                          </Typography>
                        </TableCell>
                      );
                    })}
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="primary.main"
                      >
                        {formatCurrency(payment.total + (payment.replacementNote?.length > 0 ? payment.priceSlot : 0))}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {editingNoteMemberId === payment.id ? (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <TextField
                            size="small"
                            variant="outlined"
                            value={noteValue}
                            autoFocus
                            onChange={(e) => {
                              setNoteValue(e.target.value);
                              setPendingNoteMemberId(payment.id); // đánh dấu đang chỉnh
                            }}
                            sx={{ flex: 1, mr: 1 }}
                          />
                          <Tooltip title="Lưu ghi chú">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                if (onNoteChange)
                                  onNoteChange(payment.id, noteValue);
                                setEditingNoteMemberId(null);
                                setPendingNoteMemberId(null);
                              }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            cursor: "pointer",
                            color: payment.note
                              ? "text.primary"
                              : "text.secondary",
                            fontStyle: payment.note ? "normal" : "italic",
                          }}
                          onClick={() => {
                            setEditingNoteMemberId(payment.id);
                            setNoteValue(payment.note || "");
                          }}
                        >
                          {payment.note || "-"}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          payment.isPaid
                            ? "Nhấn để đánh dấu chưa thanh toán"
                            : "Nhấn để đánh dấu đã thanh toán"
                        }
                      >
                        <Checkbox
                          checked={payment.isPaid}
                          onChange={(e) =>
                            onPaymentStatusChange(payment.id, e.target.checked)
                          }
                          disabled={isUpdating}
                          color="success"
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Tổng cộng */}
                <TableRow sx={{ backgroundColor: "primary.light" }}>
                  <TableCell colSpan={2}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Tổng cộng
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(totalBaseCost)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(totalPriceSlotPass)}
                    </Typography>
                  </TableCell>
                  {additionalExpenses.map((expense, idx) => (
                    <TableCell key={idx} align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(
                          additionalColumnTotals.get(expense.name) || 0
                        )}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(grandTotal + (totalPriceSlotPass))}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${
                        memberPayments.filter((m) => m.isPaid).length
                      }/${memberPayments.length}`}
                      color="info"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>

      {/* ✅ THÊM DIALOG CẬP NHẬT CHI PHÍ */}
      <ExpenseUpdateDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onSave={handleExpenseUpdate}
        session={session}
        members={members || []}
        courts={courts || []}
      />
    </Card>
  );
};

export default ExpenseDetail;
