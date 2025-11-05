// components/NotificationStatusBanner.tsx
import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  PhoneIphone,
  BrowserNotSupported,
  Refresh,
  OpenInBrowser,
} from '@mui/icons-material';
import { notificationService, NotificationCapability } from '../services/notificationService';
import IOSNotificationGuide from './IOSNotificationGuide';

interface Props {
  userId: string;
}

const NotificationStatusBanner: React.FC<Props> = ({ userId }) => {
  const [capability, setCapability] = useState<NotificationCapability | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    checkCapability();
  }, []);

  const checkCapability = async () => {
    setLoading(true);
    try {
      const cap = await notificationService.checkNotificationCapability();
      setCapability(cap);
    } catch (error) {
      console.error('Error checking capability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const result = await notificationService.registerDevice(userId);
      if (result.success) {
        setShowBanner(false);
      }
      setCapability(result.capability);
    } catch (error) {
      console.error('Error registering:', error);
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenInSafari = () => {
    // Mở dialog hướng dẫn chi tiết
    setShowIOSGuide(true);
  };

  if (loading || !capability) {
    return null;
  }

  // Không hiển thị banner nếu đã được hỗ trợ và đã đăng ký
  if (capability.canReceive && notificationService.getPermissionStatus() === 'granted') {
    return null;
  }

  // Không hiển thị nếu user đã đóng banner
  if (!showBanner) {
    return null;
  }

  const { deviceInfo } = capability;

  // Xác định loại thông báo
  const isIOSPWA = deviceInfo.isIOS && deviceInfo.isStandalone;
  const isIOSSafariOld = deviceInfo.isIOS && deviceInfo.isSafari && 
                         deviceInfo.iosVersion && deviceInfo.iosVersion < 16;
  const isIOSSafariNew = deviceInfo.isIOS && deviceInfo.isSafari && 
                         deviceInfo.iosVersion && deviceInfo.iosVersion >= 16;

  return (
    <>
      <Collapse in={showBanner}>
        <Alert
          severity={capability.canReceive ? 'info' : 'warning'}
          sx={{ mb: 2 }}
          action={
            <IconButton
              size="small"
              onClick={() => setShowBanner(false)}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>
            {capability.canReceive ? 'Thông báo đẩy' : 'Giới hạn thông báo'}
          </AlertTitle>
          
          <Typography variant="body2" gutterBottom>
            {capability.reason}
          </Typography>

          {capability.suggestion && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {capability.suggestion}
            </Typography>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {isIOSPWA && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInBrowser />}
                onClick={handleOpenInSafari}
              >
                Mở trong Safari
              </Button>
            )}

            {capability.canReceive && (
              <Button
                size="small"
                variant="contained"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Đang đăng ký...' : 'Đăng ký ngay'}
              </Button>
            )}

            <Button
              size="small"
              variant="text"
              onClick={() => setShowDetailsDialog(true)}
            >
              Chi tiết
            </Button>

            {deviceInfo.isIOS && (
              <Button
                size="small"
                variant="text"
                color="info"
                onClick={() => setShowIOSGuide(true)}
              >
                Hướng dẫn iOS
              </Button>
            )}
          </Box>
        </Alert>
      </Collapse>

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Info sx={{ mr: 1, color: 'primary.main' }} />
            Thông tin thiết bị
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                {capability.canReceive ? (
                  <CheckCircle color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Trạng thái"
                secondary={
                  <Chip
                    label={capability.canReceive ? 'Hỗ trợ' : 'Không hỗ trợ'}
                    color={capability.canReceive ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                }
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <PhoneIphone />
              </ListItemIcon>
              <ListItemText
                primary="Thiết bị"
                secondary={
                  <>
                    {deviceInfo.isIOS && (
                      <Chip
                        label={`iOS ${deviceInfo.iosVersion || 'Unknown'}`}
                        size="small"
                        sx={{ mr: 1, mt: 0.5 }}
                      />
                    )}
                    {deviceInfo.isStandalone && (
                      <Chip
                        label="PWA Mode"
                        size="small"
                        color="primary"
                        sx={{ mr: 1, mt: 0.5 }}
                      />
                    )}
                    {deviceInfo.isSafari && (
                      <Chip
                        label="Safari"
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </>
                }
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <BrowserNotSupported />
              </ListItemIcon>
              <ListItemText
                primary="Push API"
                secondary={
                  <Chip
                    label={deviceInfo.isPushSupported ? 'Có hỗ trợ' : 'Không hỗ trợ'}
                    color={deviceInfo.isPushSupported ? 'success' : 'default'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                }
              />
            </ListItem>
          </List>

          {isIOSPWA && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Hướng dẫn cho iOS PWA</AlertTitle>
              <Typography variant="body2">
                iOS không hỗ trợ thông báo đẩy khi chạy ở chế độ PWA (Add to Home Screen).
                Để nhận thông báo:
              </Typography>
              <Box component="ol" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Mở ứng dụng trong Safari</li>
                <li>Đăng ký nhận thông báo</li>
                <li>Giữ Safari mở trong background</li>
              </Box>
            </Alert>
          )}

          {isIOSSafariOld && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <AlertTitle>Cập nhật iOS</AlertTitle>
              <Typography variant="body2">
                iOS {deviceInfo.iosVersion} chưa hỗ trợ Web Push Notifications.
                Vui lòng cập nhật lên iOS 16.4 trở lên để sử dụng tính năng này.
              </Typography>
            </Alert>
          )}

          {isIOSSafariNew && capability.canReceive && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>Safari hỗ trợ thông báo</AlertTitle>
              <Typography variant="body2">
                Thiết bị của bạn có thể nhận thông báo đẩy khi sử dụng Safari!
              </Typography>
            </Alert>
          )}

          {deviceInfo.isIOS && (
            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Info />}
                onClick={() => {
                  setShowDetailsDialog(false);
                  setShowIOSGuide(true);
                }}
              >
                Xem hướng dẫn chi tiết cho iOS
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>
            Đóng
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              setShowDetailsDialog(false);
              checkCapability();
            }}
          >
            Kiểm tra lại
          </Button>
        </DialogActions>
      </Dialog>

      {/* iOS Notification Guide */}
      <IOSNotificationGuide
        open={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
        iosVersion={deviceInfo.iosVersion}
        isStandalone={deviceInfo.isStandalone}
      />
    </>
  );
};

export default NotificationStatusBanner;