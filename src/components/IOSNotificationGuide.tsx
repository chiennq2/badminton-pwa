// components/IOSNotificationGuide.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  PhoneIphone,
  OpenInBrowser,
  NotificationsActive,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';

interface Props {
  open: boolean;
  onClose: () => void;
  iosVersion: number | null;
  isStandalone: boolean;
}

const IOSNotificationGuide: React.FC<Props> = ({ 
  open, 
  onClose, 
  iosVersion,
  isStandalone 
}) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã copy link!');
  };

  const canSupport = iosVersion && iosVersion >= 16;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PhoneIphone sx={{ mr: 1, color: 'primary.main' }} />
          Hướng dẫn nhận thông báo trên iOS
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* iOS Version Check */}
        <Alert 
          severity={canSupport ? 'info' : 'warning'} 
          sx={{ mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIphone />
            <Typography variant="body2">
              iOS version của bạn: <strong>{iosVersion || 'Unknown'}</strong>
            </Typography>
            <Chip
              label={canSupport ? 'Hỗ trợ' : 'Không hỗ trợ'}
              color={canSupport ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Alert>

        {!canSupport && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>iOS {iosVersion} chưa hỗ trợ Web Push Notifications</strong>
            </Typography>
            <Typography variant="body2">
              Vui lòng cập nhật iOS lên phiên bản 16.4 trở lên để có thể nhận thông báo đẩy.
            </Typography>
          </Alert>
        )}

        {canSupport && isStandalone && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Bạn đang sử dụng chế độ PWA (Add to Home Screen)</strong>
            </Typography>
            <Typography variant="body2">
              iOS không hỗ trợ thông báo đẩy trong chế độ này. Vui lòng làm theo hướng dẫn bên dưới.
            </Typography>
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Step-by-step guide */}
        {canSupport && (
          <Stepper orientation="vertical">
            <Step active>
              <StepLabel>
                <Typography variant="subtitle1" fontWeight="medium">
                  Mở ứng dụng trong Safari
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Thông báo đẩy chỉ hoạt động khi bạn sử dụng Safari browser, 
                    không phải chế độ PWA.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInBrowser />}
                    onClick={handleCopyLink}
                  >
                    Copy link ứng dụng
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Sau khi copy, hãy mở Safari và dán link vào thanh địa chỉ
                  </Typography>
                </Box>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography variant="subtitle1" fontWeight="medium">
                  Đăng nhập và cho phép thông báo
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Khi Safari yêu cầu quyền gửi thông báo, hãy nhấn <strong>"Cho phép"</strong>
                  </Typography>
                  <Alert severity="info" icon={<Info />}>
                    <Typography variant="caption">
                      Lưu ý: Popup yêu cầu quyền có thể xuất hiện ngay lập tức hoặc 
                      sau khi bạn tương tác với trang một lần
                    </Typography>
                  </Alert>
                </Box>
              </StepContent>
            </Step>

            <Step active>
              <StepLabel>
                <Typography variant="subtitle1" fontWeight="medium">
                  Giữ Safari chạy trong background
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Để nhận thông báo, Safari cần:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Được mở (có thể ở background)"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Không bị force close hoàn toàn"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Có kết nối internet"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        )}

        {/* Additional tips */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsActive sx={{ mr: 1, fontSize: 20 }} />
            Lưu ý quan trọng
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="• Không thể nhận thông báo khi đã đóng hoàn toàn Safari"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Chế độ Low Power Mode có thể ảnh hưởng đến thông báo"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Hãy kiểm tra cài đặt Thông báo trong Settings > Safari"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        {/* Alternative: Use native app */}
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Giải pháp tốt hơn:</strong>
          </Typography>
          <Typography variant="body2">
            Để có trải nghiệm thông báo tốt nhất trên iOS, bạn nên sử dụng 
            ứng dụng native iOS (nếu có) thay vì web app.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Đã hiểu
        </Button>
        <Button 
          variant="contained" 
          onClick={handleCopyLink}
          startIcon={<OpenInBrowser />}
        >
          Copy link & Mở Safari
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IOSNotificationGuide;