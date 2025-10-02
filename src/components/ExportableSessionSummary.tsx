import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Event,
  LocationOn,
  AccessTime,
  Person,
  QrCode2,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { formatCurrency, formatDate, formatTime, calculateMemberSettlement, convertTimestampToDate } from '../utils';
import { Session } from '../types';

interface ExportableSessionSummaryProps {
  session: Session;
  members: { id: string; name: string }[];
  courtName?: string;
}

const ExportableSessionSummary: React.FC<ExportableSessionSummaryProps> = ({
  session,
  members,
  courtName,
}) => {
  // ✅ CHUYỂN ĐỔI DATE AN TOÀN TRƯỚC KHI RENDER
  const safeDate = convertTimestampToDate(session.date);
  const formattedDate = safeDate ? formatDate(safeDate) : 'Ngày không xác định';
  // ===== LOGIC MỚI: Lấy tất cả thành viên liên quan =====
  const presentMembers = session.members.filter(m => m.isPresent);
  
  // Lấy danh sách các khoản chi bổ sung
  const additionalExpenses = useMemo(() => {
    return session.expenses.filter(exp => exp.type === 'other');
  }, [session.expenses]);

  // Lấy tất cả memberIds từ chi phí bổ sung
  const membersWithAdditionalExpenses = useMemo(() => {
    const memberIds = new Set<string>();
    additionalExpenses.forEach(expense => {
      if (expense.memberIds && expense.memberIds.length > 0) {
        expense.memberIds.forEach(memberId => memberIds.add(memberId));
      }
    });
    return memberIds;
  }, [additionalExpenses]);
  
  // Kết hợp: thành viên có mặt + thành viên có chi phí bổ sung
  const allRelevantMemberIds = useMemo(() => {
    return new Set([
      ...presentMembers.map(m => m.memberId),
      ...Array.from(membersWithAdditionalExpenses)
    ]);
  }, [presentMembers, membersWithAdditionalExpenses]);

  // Lấy danh sách session members liên quan
  const relevantMembers = useMemo(() => {
    return session.members.filter(m => allRelevantMemberIds.has(m.memberId));
  }, [session.members, allRelevantMemberIds]);

  // Tính toán chi tiết cho từng thành viên
  const memberPayments = useMemo(() => {
    return relevantMembers.map(sessionMember => {
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
        isPresent: sessionMember.isPresent,
        baseCost: settlement.baseCost,
        additionalCostsMap,
        total: settlement.total,
        isPaid: session.settlements?.find(s => s.memberId === sessionMember.memberId)?.isPaid || false,
        replacementNote: sessionMember.replacementNote,
      };
    });
  }, [relevantMembers, session, members]);

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

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: 'white',
        p: 4,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '3px solid #2196f3' }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          {session.name}
        </Typography>
        <Typography variant="subtitle1" color="text.dark">
          Danh sách thanh toán
        </Typography>
      </Box>

      {/* Info Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        {/* Left Column */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <LocationOn sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Typography variant="body1" color="#000000">
              <strong>Sân:</strong> {courtName || 'Chưa xác định'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Event sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Typography variant="body1" color="#000000">
              <strong>Ngày:</strong> {formattedDate}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <AccessTime sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
            <Typography variant="body1" color="#000000">
              <strong>Giờ:</strong> {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </Typography>
          </Box>
        </Box> 

        {/* Right Column */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Person sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
            <Typography variant="body1" color="#000000">
              <strong>Host:</strong> {session.host?.name || 'Chưa xác định'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, color: '#000000' }}>
            <Typography variant="body1">
              <strong>Tổng chi phí:</strong> <span style={{ color: '#2196f3', fontWeight: 'bold' }}>{formatCurrency(session.totalCost)}</span>
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, color: '#000000' }}>
            <Typography variant="body1" color="#000000">
              <strong>Có mặt:</strong> {presentMembers.length} / {memberPayments.length} người
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Payment Table */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#000000' }}>
          Chi tiết thanh toán từng thành viên
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  Thành viên
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  Sân + Cầu
                </TableCell>
                
                {/* Các cột chi phí bổ sung */}
                {additionalExpenses.map(expense => (
                  <TableCell key={expense.id} align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                    {expense.name}
                  </TableCell>
                ))}
                
                <TableCell align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  Tổng cộng
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  Thanh toán
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell sx={{ border: '1px solid #ddd' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 28, height: 28, fontSize: '0.9rem', color: '#ffffffff' }}>
                        {payment.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium" color="#ffffffff">
                          {payment.name}
                        </Typography>
                        {/* Ghi chú thay thế */}
                        {payment.replacementNote && (
                          <Typography 
                            variant="caption" 
                            color="info.main"
                            sx={{ 
                              display: 'block', 
                              fontStyle: 'italic',
                              mt: 0.3,
                              fontSize: '0.7rem'
                            }}
                          >
                            🔄 {payment.replacementNote}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right" sx={{ border: '1px solid #ddd', color: '#30ff06ff' }}>
                    {formatCurrency(payment.baseCost)}
                  </TableCell>
                  
                  {/* Các cột chi phí bổ sung */}
                  {additionalExpenses.map(expense => {
                    const amount = payment.additionalCostsMap.get(expense.name);
                    return (
                      <TableCell 
                        key={expense.id} 
                        align="right" 
                        sx={{ border: '1px solid #ddd', color: '#30ff06ff' }}
                      >
                        {amount ? formatCurrency(amount) : '-'}
                      </TableCell>
                    );
                  })}
                  
                  <TableCell align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#2196f3' }}>
                    {formatCurrency(payment.total)}
                  </TableCell>
                  
                  <TableCell align="center" sx={{ border: '1px solid #ddd' }}>
                    {payment.isPaid ? (
                      <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                    ) : (
                      <Cancel sx={{ color: '#f44336', fontSize: 20 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Dòng tổng */}
              <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                <TableCell sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  TỔNG CỘNG ({memberPayments.length} người)
                </TableCell>
                
                <TableCell align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                  {formatCurrency(totalBaseCost)}
                </TableCell>
                
                {additionalExpenses.map(expense => {
                  const total = additionalColumnTotals.get(expense.name) || 0;
                  return (
                    <TableCell key={expense.id} align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#000000' }}>
                      {formatCurrency(total)}
                    </TableCell>
                  );
                })}
                
                <TableCell align="right" sx={{ fontWeight: 'bold', border: '1px solid #ddd', color: '#2196f3', fontSize: '1.1rem' }}>
                  {formatCurrency(grandTotal)}
                </TableCell>
                
                <TableCell align="center" sx={{ border: '1px solid #ddd' }}>
                  <Typography variant="caption" fontWeight="bold" color="info.main">
                    {memberPayments.filter(m => m.isPaid).length}/{memberPayments.length}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Ghi chú quan trọng */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
        <Typography variant="body2" color="#000000">
          💡 <strong>Ghi chú:</strong> Danh sách bao gồm cả thành viên vắng mặt nhưng có chi phí bổ sung cần thanh toán.
          Tiền sân + cầu chỉ được tính cho thành viên có mặt.
        </Typography>
      </Box>

      {/* QR Code Section */}
      {session.qrImage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QrCode2 sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6" fontWeight="bold" color="#000000">
              Quét mã QR để thanh toán
            </Typography>
          </Box>
          <Box
            sx={{
              border: '3px solid #4caf50',
              borderRadius: 2,
              p: 2,
              backgroundColor: '#f1f8f4',
            }}
          >
            <img
              src={session.qrImage}
              alt="QR Code"
              style={{
                width: '250px',
                height: '250px',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
            Chuyển khoản cho: <strong>{session.host?.name || 'Người tổ chức'}</strong>
          </Typography>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          📝 Sân + Cầu chia đều cho người có mặt. Chi phí bổ sung chỉ tính cho người tham gia.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Được tạo bởi: {session.host?.name || 'Hệ thống'} • {formatDate(new Date())}
        </Typography>
      </Box>
    </Box>
  );
};

export default ExportableSessionSummary;