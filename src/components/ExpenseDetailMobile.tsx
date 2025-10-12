// ============================================================
// ExpenseDetail.tsx - Mobile-Friendly Version
// ============================================================

import { Receipt, ExpandMore, AccountBalance, Fastfood, People, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { Card, CardContent, Typography, Alert, Accordion, AccordionSummary, Box, AccordionDetails, Stack, Divider, Paper, Avatar, Chip, TextField, IconButton, Button } from "@mui/material";
import { useState, useMemo } from "react";
import { useResponsive } from "../hooks/useResponsive";
import { calculateMemberSettlement, formatCurrency } from "../utils";
import { Session } from "../types";

interface ExpenseDetailProps {
  session: Session;
  members: { id: string; name: string }[];
  onPaymentStatusChange: (memberId: string, isPaid: boolean) => void;
  onNoteChange?: (memberId: string, notePayment: string) => void; // ✅ thêm prop mới
  isUpdating?: boolean;
}


const ExpenseDetailMobile: React.FC<ExpenseDetailProps> = ({
    session,
    members,
    onPaymentStatusChange,
    onNoteChange,
    isUpdating = false,
  }) => {
    const [editingNoteMemberId, setEditingNoteMemberId] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState<string>("");
    const { isMobile } = useResponsive();
  
    const presentMembers = session.members.filter((m) => m.isPresent);
    
    const additionalExpenses = useMemo(() => {
      return session.expenses.filter((exp) => exp.type === "other");
    }, [session.expenses]);
  
    const membersWithAdditionalExpenses = new Set<string>();
    additionalExpenses.forEach((expense) => {
      if (expense.memberIds && expense.memberIds.length > 0) {
        expense.memberIds.forEach((memberId) =>
          membersWithAdditionalExpenses.add(memberId)
        );
      }
    });
  
    const allRelevantMemberIds = new Set([
      ...presentMembers.map((m) => m.memberId),
      ...Array.from(membersWithAdditionalExpenses),
    ]);
  
    const relevantMembers = session.members.filter((m) =>
      allRelevantMemberIds.has(m.memberId)
    );
  
    const memberPayments = useMemo(() => {
      return relevantMembers.map((sessionMember) => {
        const member = members.find((m) => m.id === sessionMember.memberId);
        const settlement = calculateMemberSettlement(
          session,
          sessionMember.memberId,
          members
        );
  
        const additionalCostsMap = new Map<string, number>();
        settlement.additionalCosts.forEach((cost) => {
          additionalCostsMap.set(cost.name, cost.amount);
        });
  
        return {
          id: sessionMember.memberId,
          name: sessionMember.memberName || member?.name || "Unknown",
          avatar: sessionMember.avatar || '',
          isCustom: sessionMember.isCustom || !member,
          isPresent: sessionMember.isPresent,
          baseCost: settlement.baseCost,
          additionalCostsMap,
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
  
    const courtExpense = session.expenses.find((exp) => exp.type === "court");
    const shuttlecockExpense = session.expenses.find(
      (exp) => exp.type === "shuttlecock"
    );
    const courtCost = courtExpense?.amount || 0;
    const shuttlecockCost = shuttlecockExpense?.amount || 0;
  
    const totalBaseCost = memberPayments.reduce((sum, m) => sum + m.baseCost, 0);
    const grandTotal = memberPayments.reduce((sum, m) => sum + m.total, 0);
  
    return (
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            <Receipt sx={{ mr: 1, verticalAlign: "middle", fontSize: { xs: 20, sm: 24 } }} />
            Chi tiết chi phí và thanh toán
          </Typography>
  
          <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
            Danh sách bao gồm cả thành viên vắng mặt nhưng có chi phí bổ sung.
            Nhấp vào checkbox để cập nhật trạng thái thanh toán.
          </Alert>
  
          {/* Chi phí cơ bản - Accordion cho mobile */}
          <Accordion defaultExpanded={!isMobile} sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ backgroundColor: 'primary.light' }}
            >
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                <AccountBalance sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                  Chi phí cơ bản
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {formatCurrency(courtCost + shuttlecockCost)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                    🏸 Tiền sân
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(courtCost)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
                    🏸 Tiền cầu
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(shuttlecockCost)}
                  </Typography>
                </Box>
                <Divider />
                <Alert severity="info" sx={{ fontSize: { xs: '0.75rem', sm: '0.813rem' } }}>
                  Chia đều cho <strong>{presentMembers.length} thành viên có mặt</strong> =
                  {formatCurrency((courtCost + shuttlecockCost) / (presentMembers.length || 1))}/người
                </Alert>
              </Stack>
            </AccordionDetails>
          </Accordion>
  
          {/* Chi phí bổ sung */}
          {additionalExpenses.length > 0 && (
            <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
              <AccordionSummary 
                expandIcon={<ExpandMore />}
                sx={{ backgroundColor: 'warning.light' }}
              >
                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <Fastfood sx={{ mr: 1, color: "warning.main" }} />
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                    Chi phí bổ sung
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    {additionalExpenses.length} khoản
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack spacing={2}>
                  {additionalExpenses.map((expense, index) => (
                    <Paper key={index} sx={{ p: { xs: 1.5, sm: 2 }, backgroundColor: "action.hover", borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {expense.name}
                      </Typography>
                      {expense.description && (
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          {expense.description}
                        </Typography>
                      )}
                      <Alert severity="warning" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.813rem' } }}>
                        {expense.memberIds && expense.memberIds.length > 0
                          ? `Chia cho ${expense.memberIds.length} thành viên = ${formatCurrency(
                              expense.amount / expense.memberIds.length
                            )}/người`
                          : `Chia đều cho ${presentMembers.length} thành viên = ${formatCurrency(
                              expense.amount / (presentMembers.length || 1)
                            )}/người`}
                      </Alert>
                    </Paper>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
  
          {/* Danh sách thanh toán thành viên - Mobile Cards */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
              <People sx={{ mr: 1 }} />
              Danh sách thanh toán thành viên
            </Typography>
  
            <Alert severity="info" sx={{ mb: 2, fontSize: { xs: '0.813rem', sm: '0.875rem' } }}>
              Lịch đánh ở trạng thái "Hoàn Thành" thì mới đánh dấu được trạng thái thanh toán.
            </Alert>
  
            <Stack spacing={2}>
              {memberPayments.map((payment) => (
                <Card 
                  key={payment.id} 
                  variant="outlined"
                  sx={{ 
                    borderRadius: 2,
                    opacity: payment.isPresent ? 1 : 0.7,
                    border: payment.isPaid ? '2px solid' : '1px solid',
                    borderColor: payment.isPaid ? 'success.main' : 'divider',
                  }}
                >
                  <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                        {payment.avatar ? (
                            <Avatar
                              src={payment.avatar}
                              sx={{ mr:1, width: 32, height: 32 }}
                            />
                          ) : (
                            <Avatar sx={{mr:1, width: 36, height: 36 }}>
                            {payment.name.charAt(0).toUpperCase()}
                          </Avatar>
                        )}

                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {payment.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                          {payment.isCustom && (
                            <Chip label="Tùy chỉnh" size="small" sx={{ height: 18, fontSize: '0.688rem' }} />
                          )}
                          <Chip 
                            label={payment.isPresent ? "Có mặt" : "Vắng"}
                            color={payment.isPresent ? "success" : "default"}
                            size="small"
                            sx={{ height: 18, fontSize: '0.688rem' }}
                          />
                          {payment.isPaid && (
                            <Chip 
                              label="Đã thanh toán" 
                              color="success"
                              size="small"
                              icon={<CheckCircle />}
                              sx={{ height: 18, fontSize: '0.688rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
  
                    <Divider sx={{ my: 1.5 }} />
  
                    {/* Chi phí */}
                    <Stack spacing={0.75}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">
                          Sân + Cầu:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(payment.baseCost)}
                        </Typography>
                      </Box>
  
                      {additionalExpenses.map((expense, idx) => {
                        const amount = payment.additionalCostsMap.get(expense.name) || 0;
                        if (amount === 0) return null;
                        return (
                          <Box key={idx} sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">
                              {expense.name}:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="warning.main">
                              {formatCurrency(amount)}
                            </Typography>
                          </Box>
                        );
                      })}
  
                      <Divider />
  
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" fontWeight="bold">
                          Tổng:
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {formatCurrency(payment.total)}
                        </Typography>
                      </Box>
                    </Stack>
  
                    {/* Ghi chú */}
                    {editingNoteMemberId === payment.id ? (
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                        <TextField
                          size="small"
                          variant="outlined"
                          value={noteValue}
                          autoFocus
                          placeholder="Nhập ghi chú..."
                          onChange={(e) => setNoteValue(e.target.value)}
                          fullWidth
                          sx={{ fontSize: { xs: '0.813rem', sm: '0.875rem' } }}
                        />
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            if (onNoteChange) onNoteChange(payment.id, noteValue);
                            setEditingNoteMemberId(null);
                          }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1,
                          backgroundColor: 'action.hover',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setEditingNoteMemberId(payment.id);
                          setNoteValue(payment.note || "");
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          Ghi chú:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontStyle: payment.note ? 'normal' : 'italic',
                            color: payment.note ? 'text.primary' : 'text.disabled'
                          }}
                        >
                          {payment.note || "Nhấn để thêm ghi chú"}
                        </Typography>
                      </Box>
                    )}
  
                    {/* Checkbox thanh toán */}
                    <Button
                      variant={payment.isPaid ? "contained" : "outlined"}
                      color="success"
                      fullWidth
                      sx={{ mt: 1.5 }}
                      startIcon={payment.isPaid ? <CheckCircle /> : <RadioButtonUnchecked />}
                      onClick={() => onPaymentStatusChange(payment.id, !payment.isPaid)}
                      disabled={isUpdating || session.status !== 'completed'}
                    >
                      {payment.isPaid ? "Đã thanh toán" : "Đánh dấu đã thanh toán"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
  
              {/* Tổng cộng */}
              <Paper sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Tổng cộng
                    </Typography>
                    <Typography variant="caption" color="text.primary">
                      Đã thanh toán: {memberPayments.filter((m) => m.isPaid).length}/{memberPayments.length}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {formatCurrency(grandTotal)}
                  </Typography>
                </Box>
              </Paper>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Export both versions
  export { ExpenseDetailMobile };