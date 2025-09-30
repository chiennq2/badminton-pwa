import React, { useMemo } from 'react';
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
} from '@mui/material';
import {
  ExpandMore,
  Receipt,
  People,
  AccountBalance,
  SportsTennis,
  Fastfood,
} from '@mui/icons-material';
import { formatCurrency, calculateMemberSettlement } from '../utils';
import { Session } from '../types';

interface ExpenseDetailProps {
  session: Session;
  members: { id: string; name: string }[];
  onPaymentStatusChange: (memberId: string, isPaid: boolean) => void;
  isUpdating?: boolean;
}

const ExpenseDetail: React.FC<ExpenseDetailProps> = ({ 
  session, 
  members, 
  onPaymentStatusChange,
  isUpdating = false 
}) => {
  const presentMembers = session.members.filter(m => m.isPresent);

  // Lấy danh sách các khoản chi bổ sung
  const additionalExpenses = useMemo(() => {
    return session.expenses.filter(exp => exp.type === 'other');
  }, [session.expenses]);

  // Tính toán chi tiết cho từng thành viên
  const memberPayments = useMemo(() => {
    return presentMembers.map(sessionMember => {
      const member = members.find(m => m.id === sessionMember.memberId);
      const settlement = calculateMemberSettlement(session, sessionMember.memberId, members);
      
      // Tạo map các khoản bổ sung cho thành viên này
      const additionalCostsMap = new Map<string, number>();
      settlement.additionalCosts.forEach(cost => {
        additionalCostsMap.set(cost.name, cost.amount);
      });

      return {
        id: sessionMember.memberId,
        name: sessionMember.memberName || member?.name || 'Unknown',
        isCustom: sessionMember.isCustom || !member,
        baseCost: settlement.baseCost,
        additionalCostsMap, // Map: tên khoản chi -> số tiền
        total: settlement.total,
        isPaid: session.settlements?.find(s => s.memberId === sessionMember.memberId)?.isPaid || false,
      };
    });
  }, [presentMembers, session, members]);

  const totalBaseCost = memberPayments.reduce((sum, m) => sum + m.baseCost, 0);
  const grandTotal = memberPayments.reduce((sum, m) => sum + m.total, 0);

  // Tính tổng cho từng cột chi phí bổ sung
  const additionalColumnTotals = useMemo(() => {
    const totals = new Map<string, number>();
    additionalExpenses.forEach(expense => {
      let total = 0;
      memberPayments.forEach(payment => {
        total += payment.additionalCostsMap.get(expense.name) || 0;
      });
      totals.set(expense.name, total);
    });
    return totals;
  }, [additionalExpenses, memberPayments]);

  // Thống kê thanh toán
  const paidCount = memberPayments.filter(m => m.isPaid).length;
  const paidAmount = memberPayments.filter(m => m.isPaid).reduce((sum, m) => sum + m.total, 0);
  const unpaidAmount = grandTotal - paidAmount;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Receipt sx={{ mr: 1, color: 'info.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Chi tiết chi phí
          </Typography>
        </Box>

        {/* PHẦN 1: CHI TIẾT CÁC KHOẢN CHI */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalance sx={{ mr: 1, fontSize: 20 }} />
            Các khoản chi phí
          </Typography>

          {session.expenses.map((expense, index) => (
            <Accordion 
              key={expense.id} 
              defaultExpanded={index === 0}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {expense.type === 'court' && <SportsTennis sx={{ mr: 1, fontSize: 20 }} />}
                    {expense.type === 'shuttlecock' && <SportsTennis sx={{ mr: 1, fontSize: 20 }} />}
                    {expense.type === 'other' && <Fastfood sx={{ mr: 1, fontSize: 20 }} />}
                    <Typography>{expense.name}</Typography>
                  </Box>
                  <Typography fontWeight="bold" color="primary.main">
                    {formatCurrency(expense.amount)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Loại:</strong> {expense.type === 'court' ? 'Tiền sân' : expense.type === 'shuttlecock' ? 'Tiền cầu' : 'Chi phí bổ sung'}
                  </Typography>
                  {expense.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Mô tả:</strong> {expense.description}
                    </Typography>
                  )}
                  
                  {/* Hiển thị cách chia tiền */}
                  {expense.type === 'court' || expense.type === 'shuttlecock' ? (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        Chia đều cho {presentMembers.length} thành viên có mặt 
                        = <strong>{formatCurrency(expense.amount / presentMembers.length)}/người</strong>
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {expense.memberIds && expense.memberIds.length > 0 ? (
                          <>
                            Chia cho {expense.memberIds.length} người được chọn 
                            = <strong>{formatCurrency(expense.amount / expense.memberIds.length)}/người</strong>
                          </>
                        ) : (
                          <>
                            Chia đều cho {presentMembers.length} thành viên có mặt 
                            = <strong>{formatCurrency(expense.amount / presentMembers.length)}/người</strong>
                          </>
                        )}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 2,
            p: 2,
            backgroundColor: 'action.hover',
            borderRadius: 1,
          }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Tổng chi phí:
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {formatCurrency(session.totalCost)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* PHẦN 2: DANH SÁCH THANH TOÁN THÀNH VIÊN */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
              <People sx={{ mr: 1, fontSize: 20 }} />
              Danh sách thanh toán thành viên
            </Typography>
            {session.status === 'completed' && (
              <Chip 
                label={`${paidCount}/${presentMembers.length} đã thanh toán`}
                color={paidCount === presentMembers.length ? 'success' : 'warning'}
                size="small"
              />
            )}
          </Box>

          {presentMembers.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                Chưa có thành viên nào có mặt. Vui lòng điểm danh trước.
              </Typography>
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell><strong>Thành viên</strong></TableCell>
                      <TableCell align="right" width={120}>
                        <Tooltip title="Tiền sân + Tiền cầu (chia đều)">
                          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                            <AccountBalance fontSize="small" sx={{ mr: 0.5 }} />
                            <strong>Sân + Cầu</strong>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      
                      {/* CÁC CỘT CHI PHÍ BỔ SUNG - ĐỘNG */}
                      {additionalExpenses.map(expense => (
                        <TableCell key={expense.id} align="right" width={120}>
                          <Tooltip title={expense.description || `Chi phí: ${expense.name}`}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                              <Fastfood fontSize="small" sx={{ mr: 0.5 }} />
                              <strong>{expense.name}</strong>
                            </Box>
                          </Tooltip>
                        </TableCell>
                      ))}
                      
                      <TableCell align="right" width={120}>
                        <strong>Tổng cộng</strong>
                      </TableCell>
                      
                      {/* CỘT CHECKBOX THANH TOÁN */}
                      {session.status === 'completed' && (
                        <TableCell align="center" width={130}>
                          <strong>Đã thanh toán</strong>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {memberPayments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        {/* Cột thành viên */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                              {payment.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {payment.name}
                              </Typography>
                              {payment.isCustom && (
                                <Chip label="Tùy chỉnh" size="small" variant="outlined" sx={{ height: 18 }} />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        
                        {/* Cột Sân + Cầu */}
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(payment.baseCost)}
                          </Typography>
                        </TableCell>
                        
                        {/* CÁC CỘT CHI PHÍ BỔ SUNG - HIỂN THỊ GIÁ TRỊ HOẶC "-" */}
                        {additionalExpenses.map(expense => {
                          const amount = payment.additionalCostsMap.get(expense.name);
                          return (
                            <TableCell key={expense.id} align="right">
                              {amount ? (
                                <Typography variant="body2" color="warning.main" fontWeight="medium">
                                  {formatCurrency(amount)}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.disabled">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                        
                        {/* Cột Tổng cộng */}
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="primary.main" fontSize="1rem">
                            {formatCurrency(payment.total)}
                          </Typography>
                        </TableCell>
                        
                        {/* Cột Checkbox Thanh toán */}
                        {session.status === 'completed' && (
                          <TableCell align="center">
                            <Tooltip title={payment.isPaid ? "Click để đánh dấu chưa thanh toán" : "Click để đánh dấu đã thanh toán"}>
                              <Checkbox
                                checked={payment.isPaid}
                                onChange={(e) => onPaymentStatusChange(payment.id, e.target.checked)}
                                disabled={isUpdating}
                                color="success"
                                size="small"
                              />
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}

                    {/* Dòng tổng cộng */}
                    <TableRow sx={{ backgroundColor: 'primary.light' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          TỔNG ({presentMembers.length} người)
                        </Typography>
                      </TableCell>
                      
                      {/* Tổng Sân + Cầu */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(totalBaseCost)}
                        </Typography>
                      </TableCell>
                      
                      {/* Tổng từng cột chi phí bổ sung */}
                      {additionalExpenses.map(expense => {
                        const total = additionalColumnTotals.get(expense.name) || 0;
                        return (
                          <TableCell key={expense.id} align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(total)}
                            </Typography>
                          </TableCell>
                        );
                      })}
                      
                      {/* Tổng cộng tất cả */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="primary.main" fontSize="1rem">
                          {formatCurrency(grandTotal)}
                        </Typography>
                      </TableCell>
                      
                      {/* Thống kê thanh toán */}
                      {session.status === 'completed' && (
                        <TableCell align="center">
                          <Box>
                            <Typography variant="caption" color="success.main" fontWeight="bold" display="block">
                              ✓ {formatCurrency(paidAmount)}
                            </Typography>
                            <Typography variant="caption" color="error.main" fontWeight="bold" display="block">
                              ✗ {formatCurrency(unpaidAmount)}
                            </Typography>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Ghi chú */}
              <Alert severity="info" icon={false}>
                <Typography variant="caption" color="text.secondary">
                  <strong>📌 Ghi chú:</strong><br/>
                  • <strong>Sân + Cầu:</strong> Chia đều cho {presentMembers.length} người có mặt<br/>
                  • <strong>Chi phí bổ sung:</strong> Chỉ tính cho người được chọn trong khoản chi đó. Hiển thị "-" nếu không tham gia<br/>
                  {session.status === 'completed' && (
                    <>• <strong>Đã thanh toán:</strong> Tích checkbox để đánh dấu đã thanh toán</>
                  )}
                </Typography>
              </Alert>
            </>
          )}
        </Box>

        {/* Kiểm tra tổng có khớp không */}
        {Math.abs(grandTotal - session.totalCost) > 1 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              ⚠️ <strong>Lưu ý:</strong> Tổng chi tiết ({formatCurrency(grandTotal)}) 
              khác với tổng chi phí ({formatCurrency(session.totalCost)}). 
              Có thể có chi phí bổ sung chưa được phân bổ đầy đủ.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseDetail;