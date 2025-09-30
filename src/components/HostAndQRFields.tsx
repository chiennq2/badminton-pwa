import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  Avatar,
  Chip,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import {
  PersonAdd,
  QrCode2,
  CloudUpload,
  Delete,
} from '@mui/icons-material';

interface HostAndQRFieldsProps {
  // Host
  hostName: string;
  hostIsCustom: boolean;
  hostMemberId?: string;
  onHostChange: (host: { name: string; isCustom: boolean; memberId?: string }) => void;
  
  // QR
  paymentQR?: string;
  onQRChange: (qrBase64: string | undefined) => void;
  
  // Data
  members: { id: string; name: string; email?: string }[];
  currentUserName?: string; // Tên user đang đăng nhập
}

const HostAndQRFields: React.FC<HostAndQRFieldsProps> = ({
  hostName,
  hostIsCustom,
  hostMemberId,
  onHostChange,
  paymentQR,
  onQRChange,
  members,
  currentUserName,
}) => {
  const [customHostInput, setCustomHostInput] = useState('');

  // Handle host selection from members list
  const handleHostSelect = (member: { id: string; name: string } | null) => {
    if (member) {
      onHostChange({
        name: member.name,
        isCustom: false,
        memberId: member.id,
      });
    } else {
      // Reset to current user if nothing selected
      onHostChange({
        name: currentUserName || '',
        isCustom: false,
        memberId: undefined,
      });
    }
  };

  // Handle custom host input
  const handleCustomHostAdd = () => {
    if (customHostInput.trim()) {
      onHostChange({
        name: customHostInput.trim(),
        isCustom: true,
        memberId: undefined,
      });
      setCustomHostInput('');
    }
  };

  // Handle QR image upload
  const handleQRUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ tải lên file ảnh!');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước file không được vượt quá 5MB!');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        onQRChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear QR
  const handleQRClear = () => {
    onQRChange(undefined);
  };

  // Get selected member for Autocomplete
  const selectedMember = hostMemberId 
    ? members.find(m => m.id === hostMemberId) 
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* HOST */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonAdd sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Người tổ chức (Host)
            </Typography>
          </Box>

          {/* Current Host Display */}
          {hostName && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                  {hostName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2">
                  <strong>Host hiện tại:</strong> {hostName}
                  {hostIsCustom && <Chip label="Tùy chỉnh" size="small" sx={{ ml: 1 }} />}
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Select from members */}
          <Autocomplete
            options={members}
            getOptionLabel={(option) => option.name}
            value={selectedMember}
            onChange={(_, newValue) => handleHostSelect(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chọn từ danh sách thành viên"
                placeholder="Tìm kiếm thành viên..."
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar sx={{ mr: 1, width: 24, height: 24 }}>
                  {option.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2">{option.name}</Typography>
              </Box>
            )}
            sx={{ mb: 2 }}
          />

          {/* Custom host input */}
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Hoặc nhập tên host tùy chỉnh:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Nhập tên người tổ chức..."
              value={customHostInput}
              onChange={(e) => setCustomHostInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomHostAdd();
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleCustomHostAdd}
              disabled={!customHostInput.trim()}
            >
              Thêm
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 Nếu không chọn, mặc định là <strong>{currentUserName || 'bạn'}</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* PAYMENT QR */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QrCode2 sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              QR Code thanh toán
            </Typography>
          </Box>

          {paymentQR ? (
            // Display uploaded QR
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                p: 2,
                border: '2px dashed',
                borderColor: 'success.main',
                borderRadius: 2,
                backgroundColor: 'success.lighter',
                position: 'relative',
              }}>
                <img 
                  src={paymentQR} 
                  alt="QR Code" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '200px',
                    objectFit: 'contain',
                  }} 
                />
                <IconButton
                  onClick={handleQRClear}
                  color="error"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: 'error.lighter',
                    },
                  }}
                >
                  <Delete />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                Click icon 🗑️ để xóa và tải lên QR khác
              </Typography>
            </Box>
          ) : (
            // Upload button
            <Box>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="qr-upload-input"
                type="file"
                onChange={handleQRUpload}
              />
              <label htmlFor="qr-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Tải lên QR Code thanh toán
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 Tải lên ảnh QR để thành viên dễ dàng thanh toán (tùy chọn)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hỗ trợ: JPG, PNG, GIF. Tối đa 5MB
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HostAndQRFields;