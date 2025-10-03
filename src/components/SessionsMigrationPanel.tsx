/**
 * Component để thêm vào trang Settings hoặc AdminUsers
 * Cho phép admin chạy migration sessions dễ dàng
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { 
  SyncAlt, 
  CheckCircle, 
  Warning,
  Info 
} from '@mui/icons-material';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface MigrationResult {
  total: number;
  updated: number;
  alreadyHasCreatedBy: number;
  withoutCreatedBy: number;
}

const SessionsMigrationPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<MigrationResult | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Kiểm tra trạng thái
  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage(null);
    
    try {
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const withCreatedBy = sessions.filter((s: any) => s.createdBy);
      const withoutCreatedBy = sessions.filter((s: any) => !s.createdBy);
      
      setStatus({
        total: sessions.length,
        updated: 0,
        alreadyHasCreatedBy: withCreatedBy.length,
        withoutCreatedBy: withoutCreatedBy.length,
      });
      
      setMessage({
        text: `Đã kiểm tra: ${sessions.length} sessions, ${withoutCreatedBy.length} sessions cần migration`,
        type: 'info'
      });
    } catch (error: any) {
      console.error('Error checking status:', error);
      setMessage({
        text: `Lỗi khi kiểm tra: ${error.message}`,
        type: 'error'
      });
    } finally {
      setChecking(false);
    }
  };

  // Thực hiện migration
  const handleMigration = async () => {
    if (!currentUser) {
      setMessage({
        text: 'Không tìm thấy thông tin user',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    setConfirmOpen(false);
    
    try {
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      let updated = 0;
      let alreadyHasCreatedBy = 0;
      
      for (const sessionDoc of sessionsSnapshot.docs) {
        const data = sessionDoc.data();
        
        // Chỉ update nếu chưa có createdBy
        if (!data.createdBy) {
          await updateDoc(doc(db, 'sessions', sessionDoc.id), {
            createdBy: currentUser.id // Set về current admin user
          });
          updated++;
        } else {
          alreadyHasCreatedBy++;
        }
      }
      
      setResult({
        total: sessionsSnapshot.docs.length,
        updated,
        alreadyHasCreatedBy,
        withoutCreatedBy: 0,
      });
      
      setMessage({
        text: `✅ Migration thành công! Đã cập nhật ${updated} sessions`,
        type: 'success'
      });
      
      // Refresh status
      handleCheckStatus();
    } catch (error: any) {
      console.error('Error migrating:', error);
      setMessage({
        text: `❌ Lỗi khi migration: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra quyền admin
  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SyncAlt sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Migration Sessions (createdBy)
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Tính năng này sẽ tự động set field <code>createdBy</code> cho các sessions cũ 
            chưa có thông tin người tạo. Tất cả sessions sẽ được gán về tài khoản admin hiện tại.
          </Typography>
        </Alert>

        {/* Status Display */}
        {status && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Trạng thái hiện tại:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary={`Tổng số sessions: ${status.total}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle fontSize="small" color="success" />
                      Đã có createdBy: {status.alreadyHasCreatedBy}
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning fontSize="small" color="warning" />
                      Chưa có createdBy: {status.withoutCreatedBy}
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </Box>
        )}

        {/* Result Display */}
        {result && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ✅ Đã cập nhật thành công {result.updated} sessions
            </Typography>
          </Alert>
        )}

        {/* Message Display */}
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCheckStatus}
            disabled={checking || loading}
            startIcon={checking ? <CircularProgress size={20} /> : <Info />}
          >
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={() => setConfirmOpen(true)}
            disabled={loading || !status || status.withoutCreatedBy === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncAlt />}
          >
            {loading ? 'Đang migration...' : 'Chạy Migration'}
          </Button>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Xác nhận Migration</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Thao tác này sẽ cập nhật <strong>{status?.withoutCreatedBy || 0} sessions</strong> 
              và gán chúng về tài khoản admin hiện tại.
            </Alert>
            <Typography variant="body2">
              Bạn có chắc chắn muốn tiếp tục?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button 
              variant="contained" 
              color="warning" 
              onClick={handleMigration}
            >
              Xác nhận
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SessionsMigrationPanel;