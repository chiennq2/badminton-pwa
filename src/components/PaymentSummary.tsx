import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  Divider,
  Avatar,
  Collapse,
  IconButton,
} from '@mui/material';
import { Receipt, AccountBalance, SportsTennis, Fastfood, ExpandMore, ExpandLess } from '@mui/icons-material';
import { formatCurrency, calculateMemberSettlement } from '../utils';
import { Session } from '../types';

interface PaymentSummaryProps {
  session: Session;
  members: { id: string; name: string }[];
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({ session, members }) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // Lấy danh sách thành viên có mặt
  const presentMembers = session.members.filter(m => m.isPresent);
  const additionalExpenses = session.expenses.filter(exp => exp.type === 'other');
  // Lấy tất cả memberIds từ chi phí bổ sung
  const membersWithAdditionalExpenses = new Set<string>();
  additionalExpenses.forEach(expense => {
    if (expense.memberIds && expense.memberIds.length > 0) {
      expense.memberIds.forEach(memberId => membersWithAdditionalExpenses.add(memberId));
    }
  });
  // Kết hợp: thành viên có mặt + thành viên có chi phí bổ sung
  const allRelevantMemberIds = new Set([
    ...presentMembers.map(m => m.memberId),
    ...Array.from(membersWithAdditionalExpenses)
  ]);

  // Lấy danh sách session members liên quan
  const relevantMembers = session.members.filter(m => 
    allRelevantMemberIds.has(m.memberId)
  );
  
  if (relevantMembers.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Receipt sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Tổng hợp chi tiết thanh toán từng thành viên
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            Chưa có thành viên nào cần thanh toán
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const toggleRow = (memberId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedRows(newExpanded);
  };

  // Tính toán chi tiết cho từng thành viên
  const memberPayments = relevantMembers.map(sessionMember => {
    const member = members.find(m => m.id === sessionMember.memberId);
    const settlement = calculateMemberSettlement(session, sessionMember.memberId, members);
    
    return {
      id: sessionMember.memberId,
      name: sessionMember.memberName || member?.name || 'Unknown',
      isCustom: sessionMember.isCustom || !member,
      isPresent: sessionMember.isPresent,
      baseCost: settlement.baseCost, // Tiền sân + cầu
      additionalCosts: settlement.additionalCosts, // Các khoản bổ sung
      total: settlement.total, // Tổng cộng
      isPaid: session.settlements?.find(s => s.memberId === sessionMember.memberId)?.isPaid || false,
      replacementNote: sessionMember.replacementNote || '',
    };
  });

  // Tính tổng cho toàn bộ lịch
  const totalBaseCost = memberPayments.reduce((sum, m) => sum + m.baseCost, 0);
  const totalAdditional = memberPayments.reduce(
    (sum, m) => sum + m.additionalCosts.reduce((s, c) => s + c.amount, 0), 
    0
  );
  const grandTotal = memberPayments.reduce((sum, m) => sum + m.total, 0);

  // Lấy thông tin chi phí từ session
  const courtExpense = session.expenses.find(exp => exp.type === 'court');
  const shuttlecockExpense = session.expenses.find(exp => exp.type === 'shuttlecock');
  const courtCost = courtExpense?.amount || 0;
  const shuttlecockCost = shuttlecockExpense?.amount || 0;
  const baseCostTotal = courtCost + shuttlecockCost;


  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Receipt sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Tổng hợp chi tiết thanh toán từng thành viên
            </Typography>
          </Box>
          <Chip 
            label={`${presentMembers.length} người có mặt`} 
            color="success" 
            variant="outlined"
          />
        </Box>

        {/* Thông tin tổng quan */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'info.lighter', borderRadius: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>📊 Cách tính:</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • <strong>Tiền sân + cầu:</strong> {formatCurrency(baseCostTotal)} chia đều cho {presentMembers.length} người 
            = {formatCurrency(baseCostTotal / presentMembers.length)}/người
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • <strong>Chi phí bổ sung:</strong> Chỉ tính cho những người được chọn trong khoản chi đó
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • <strong>Tổng cộng:</strong> Tiền sân cầu + Chi phí bổ sung (nếu có)
          </Typography>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell width={40}></TableCell>
                <TableCell><strong>Thành viên</strong></TableCell>
                <TableCell align="right" width={150}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <AccountBalance fontSize="small" sx={{ mr: 0.5 }} />
                    <strong>Sân + Cầu</strong>
                  </Box>
                </TableCell>
                <TableCell align="right" width={150}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Fastfood fontSize="small" sx={{ mr: 0.5 }} />
                    <strong>Bổ sung</strong>
                  </Box>
                </TableCell>
                <TableCell align="right" width={150}>
                  <strong>Tổng cộng</strong>
                </TableCell>
                <TableCell align="center" width={150}>
                  <strong>Trạng thái</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberPayments.map((payment) => (
                <React.Fragment key={payment.id}>
                  <TableRow hover sx={{ 
                    '& > *': { borderBottom: payment.additionalCosts.length > 0 && expandedRows.has(payment.id) ? 'none !important' : undefined }
                  }}>
                    <TableCell>
                      {payment.additionalCosts.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(payment.id)}
                        >
                          {expandedRows.has(payment.id) ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </TableCell>
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
                            <Chip label="Tùy chỉnh" size="small" variant="outlined" sx={{ mt: 0.5, height: 18 }} />
                          )}
                        {/* ✅ THÊM PHẦN NÀY */}
                        {payment.replacementNote && (
                          <Typography 
                            variant="caption" 
                            color="info.main"
                            sx={{ 
                              ml: 5, 
                              display: 'block', 
                              fontStyle: 'italic',
                              mt: 0.5 
                            }}
                          >
                            🔄 {payment.replacementNote}
                          </Typography>
                        )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(payment.baseCost)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (chia đều)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {payment.additionalCosts.length > 0 ? (
                        <Box>
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {formatCurrency(
                              payment.additionalCosts.reduce((sum, c) => sum + c.amount, 0)
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({payment.additionalCosts.length} khoản)
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="primary.main" fontSize="1rem">
                        {formatCurrency(payment.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={payment.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        color={payment.isPaid ? 'success' : 'warning'}
                        size="small"
                        variant={payment.isPaid ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                  </TableRow>
                  
                  {/* Chi tiết các khoản bổ sung - Mở rộng */}
                  {payment.additionalCosts.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, backgroundColor: 'action.hover' }}>
                        <Collapse in={expandedRows.has(payment.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, pl: 7 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" gutterBottom display="block">
                              📋 Chi tiết các khoản bổ sung:
                            </Typography>
                            {payment.additionalCosts.map((cost, idx) => (
                              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pl: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                  • <strong>{cost.name}</strong> (chia {cost.sharedWith} người)
                                </Typography>
                                <Typography variant="caption" color="warning.main" fontWeight="medium">
                                  {formatCurrency(cost.amount)}
                                </Typography>
                              </Box>
                            ))}
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                              <Typography variant="caption" fontWeight="bold">
                                Tổng bổ sung cho {payment.name}:
                              </Typography>
                              <Typography variant="caption" fontWeight="bold" color="warning.main">
                                {formatCurrency(payment.additionalCosts.reduce((sum, c) => sum + c.amount, 0))}
                              </Typography>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}

              {/* Dòng tổng cộng */}
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell colSpan={2}>
                  <Typography variant="body2" fontWeight="bold">
                    TỔNG CỘNG ({presentMembers.length} người)
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(totalBaseCost)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(totalAdditional)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold" color="primary.main" fontSize="1rem">
                    {formatCurrency(grandTotal)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary">
                    {memberPayments.filter(m => m.isPaid).length}/{presentMembers.length}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Kiểm tra tổng có khớp không */}
        {Math.abs(grandTotal - session.totalCost) > 1 && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.lighter', borderRadius: 1 }}>
            <Typography variant="caption" color="warning.dark">
              ⚠️ <strong>Lưu ý:</strong> Tổng chi tiết ({formatCurrency(grandTotal)}) 
              khác với tổng chi phí lịch đánh ({formatCurrency(session.totalCost)}). 
              Có thể có chi phí bổ sung chưa được phân bổ.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSummary;