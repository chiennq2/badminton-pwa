import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Avatar,
  Tooltip,
  Paper,
  DialogContentText,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  useMediaQuery,
  useTheme,
  TextField,
  Divider,
  ListItemIcon,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import {
  Edit,
  Delete,
  Block,
  CheckCircle,
  AdminPanelSettings,
  Person,
  SupervisorAccount,
  Security,
  Email,
  AccessTime,
  MoreVert,
  FileDownload,
  PersonOff,
  NotificationsActive,
} from '@mui/icons-material';
import { useUsers, useUpdateUser, useDeleteUser } from '../hooks';
import { User } from '../types';
import { formatDate, exportToCsv } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const AdminUsers: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: users, isLoading } = useUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const { currentUser } = useAuth();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [toggleActiveDialogOpen, setToggleActiveDialogOpen] = useState(false);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Notification state
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) {
      showSnackbar('Vui lòng nhập nội dung thông báo!', 'error');
      return;
    }

    setSendingNotify(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration?.active) {
          registration.active.postMessage({
            type: 'LOCAL_NOTIFICATION',
            title: notifyTitle || 'Thông báo từ quản trị viên',
            body: notifyMessage,
          });
          showSnackbar('Thông báo đã được gửi tới tất cả thiết bị đang mở!', 'success');
        } else {
          showSnackbar('Không tìm thấy Service Worker đang hoạt động.', 'error');
        }
      } else {
        showSnackbar('Trình duyệt không hỗ trợ Service Worker.', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showSnackbar('Gửi thông báo thất bại!', 'error');
    } finally {
      setSendingNotify(false);
      setNotifyDialogOpen(false);
      setNotifyMessage('');
      setNotifyTitle('');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedUser(null);
  };

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleToggleActiveClick = (user: User) => {
    setTogglingUser(user);
    setToggleActiveDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      await deleteUserMutation.mutateAsync(deletingUser.id);
      showSnackbar('Xóa người dùng thành công!', 'success');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error: any) {
      showSnackbar(`Có lỗi xảy ra: ${error.message}`, 'error');
    }
  };

  const handleToggleActive = async () => {
    if (!togglingUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: togglingUser.id,
        data: {
          isActive: !togglingUser.isActive,
          updatedAt: new Date(),
        },
      });
      showSnackbar(
        `${togglingUser.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'} người dùng thành công!`,
        'success'
      );
      setToggleActiveDialogOpen(false);
      setTogglingUser(null);
    } catch (error: any) {
      showSnackbar(`Có lỗi xảy ra: ${error.message}`, 'error');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        data: {
          role: newRole,
          updatedAt: new Date(),
        },
      });
      showSnackbar(
        `Cập nhật quyền ${newRole === 'admin' ? 'quản trị viên' : 'người dùng'} thành công!`,
        'success'
      );
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      showSnackbar(`Có lỗi xảy ra khi cập nhật quyền: ${error.message}`, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExport = () => {
    if (!users) return;
    const exportData = users.map((user) => ({
      'Tên hiển thị': user.displayName,
      Email: user.email,
      Quyền: user.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
      'Trạng thái': user.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt',
      'Ngày tạo': formatDate(user.createdAt),
      'Cập nhật cuối': formatDate(user.updatedAt),
    }));
    exportToCsv(exportData, `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}.csv`);
    showSnackbar('Xuất file CSV thành công!', 'success');
  };

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    return role === 'admin' ? 'error' : 'primary';
  };

  const getRoleText = (role: string): string => {
    return role === 'admin' ? 'Quản trị viên' : 'Người dùng';
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <AdminPanelSettings /> : <Person />;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Đang tải danh sách người dùng...
        </Typography>
      </Box>
    );
  }

  const adminUsers = users?.filter((u) => u.role === 'admin') || [];
  const regularUsers = users?.filter((u) => u.role === 'user') || [];
  const activeUsers = users?.filter((u) => u.isActive) || [];
  const inactiveUsers = users?.filter((u) => !u.isActive) || [];

  // Desktop columns
  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Người dùng',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={params.row.photoURL}
            sx={{
              mr: 2,
              width: 40,
              height: 40,
              bgcolor: params.row.role === 'admin' ? 'error.main' : 'primary.main',
              opacity: params.row.isActive ? 1 : 0.5,
            }}
          >
            {params.row.displayName?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.value || 'Không có tên'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Quyền',
      width: 160,
      renderCell: (params) => (
        <Chip
          label={getRoleText(params.value)}
          color={getRoleColor(params.value)}
          size="small"
          icon={getRoleIcon(params.value)}
          variant={params.value === 'admin' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Trạng thái',
      width: 160,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
          color={params.value ? 'success' : 'default'}
          size="small"
          icon={params.value ? <CheckCircle /> : <Block />}
          variant={params.value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Ngày tạo',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate(new Date(params.value))}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Thao tác',
      width: 150,
      getActions: (params: GridRowParams) => {
        const user = params.row as User;
        const isCurrentUser = user.id === currentUser?.id;

        return [
          <GridActionsCellItem
            icon={
              <Tooltip title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                {user.isActive ? <Block /> : <CheckCircle />}
              </Tooltip>
            }
            label={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
            onClick={() => handleToggleActiveClick(user)}
            disabled={isCurrentUser}
          />,
          <GridActionsCellItem
            icon={
              <Tooltip title="Sửa quyền">
                <Edit />
              </Tooltip>
            }
            label="Sửa quyền"
            onClick={() => handleEditRole(user)}
            disabled={isCurrentUser}
            showInMenu
          />,
          <GridActionsCellItem
            icon={
              <Tooltip title="Xóa">
                <Delete />
              </Tooltip>
            }
            label="Xóa"
            onClick={() => handleDeleteClick(user)}
            disabled={isCurrentUser}
            showInMenu
          />,
        ];
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Quản lý người dùng
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quản lý quyền và thông tin của các người dùng trong hệ thống
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
              <SupervisorAccount sx={{ fontSize: { xs: 30, sm: 40 }, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {users?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tổng người dùng
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
              <AdminPanelSettings sx={{ fontSize: { xs: 30, sm: 40 }, color: 'error.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {adminUsers.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quản trị viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
              <CheckCircle sx={{ fontSize: { xs: 30, sm: 40 }, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {activeUsers.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đã kích hoạt
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
              <PersonOff sx={{ fontSize: { xs: 30, sm: 40 }, color: 'warning.main', mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="warning.main">
                {inactiveUsers.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chưa kích hoạt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions Bar */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExport}
          fullWidth={isMobile}
          size={isMobile ? 'medium' : 'large'}
        >
          Xuất CSV
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={<NotificationsActive />}
          onClick={() => setNotifyDialogOpen(true)}
          fullWidth={isMobile}
          size={isMobile ? 'medium' : 'large'}
        >
          Gửi thông báo
        </Button>
      </Box>

      {/* Mobile List View */}
      {isMobile ? (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {users?.map((user) => {
            const isCurrentUser = user.id === currentUser?.id;
            return (
              <Card key={user.id} sx={{ mb: 1 }}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar
                      src={user.photoURL}
                      sx={{
                        bgcolor: user.role === 'admin' ? 'error.main' : 'primary.main',
                        opacity: user.isActive ? 1 : 0.5,
                      }}
                    >
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {user.displayName || 'Không có tên'}
                        </Typography>
                        <Chip
                          label={getRoleText(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                          sx={{ height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {user.email}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={user.isActive ? 'Hoạt động' : 'Ngừng'}
                            color={user.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(user.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, user)}
                      disabled={isCurrentUser}
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Card>
            );
          })}
        </List>
      ) : (
        /* Desktop DataGrid */
        <Card>
          <DataGrid
            rows={users || []}
            columns={columns}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            sx={{
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              },
            }}
          />
        </Card>
      )}

      {/* Mobile Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedUser && handleViewUser(selectedUser)}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Xem chi tiết
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleEditRole(selectedUser)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Sửa quyền
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleToggleActiveClick(selectedUser)}>
          <ListItemIcon>
            {selectedUser?.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
          </ListItemIcon>
          {selectedUser?.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => selectedUser && handleDeleteClick(selectedUser)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          Xóa
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1, color: 'error.main' }} />
            Xác nhận xóa
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa người dùng <strong>{deletingUser?.displayName}</strong> ({deletingUser?.email})?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác!
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} fullWidth={isMobile}>
            Hủy
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteUserMutation.isPending}
            startIcon={deleteUserMutation.isPending ? <CircularProgress size={20} /> : <Delete />}
            fullWidth={isMobile}
          >
            {deleteUserMutation.isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Active Dialog */}
      <Dialog open={toggleActiveDialogOpen} onClose={() => setToggleActiveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {togglingUser?.isActive ? (
              <Block sx={{ mr: 1, color: 'warning.main' }} />
            ) : (
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
            )}
            {togglingUser?.isActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {togglingUser && (
            <Box>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src={togglingUser.photoURL}
                    sx={{
                      mr: 2,
                      bgcolor: togglingUser.role === 'admin' ? 'error.main' : 'primary.main',
                    }}
                  >
                    {togglingUser.displayName?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {togglingUser.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {togglingUser.email}
                    </Typography>
                  </Box>
                  <Chip label={getRoleText(togglingUser.role)} color={getRoleColor(togglingUser.role)} size="small" />
                </Box>
              </Paper>

              {togglingUser.isActive ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Vô hiệu hóa tài khoản này?</strong>
                  </Typography>
                  <Typography variant="body2">Người dùng sẽ:</Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Không thể đăng nhập vào hệ thống</li>
                    <li>Bị đăng xuất ngay lập tức nếu đang online</li>
                    <li>Không thể truy cập bất kỳ chức năng nào</li>
                  </ul>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Kích hoạt tài khoản này?</strong>
                  </Typography>
                  <Typography variant="body2">Người dùng sẽ có thể:</Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Đăng nhập vào hệ thống</li>
                    <li>Truy cập các chức năng theo quyền của mình</li>
                    <li>Sử dụng ứng dụng bình thường</li>
                  </ul>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setToggleActiveDialogOpen(false)} size="large" fullWidth={isMobile}>
            Hủy
          </Button>
          <Button
            onClick={handleToggleActive}
            variant="contained"
            color={togglingUser?.isActive ? 'warning' : 'success'}
            disabled={updateUserMutation.isPending}
            size="large"
            fullWidth={isMobile}
            startIcon={
              updateUserMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : togglingUser?.isActive ? (
                <Block />
              ) : (
                <CheckCircle />
              )
            }
          >
            {updateUserMutation.isPending ? 'Đang xử lý...' : togglingUser?.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Security sx={{ mr: 1, color: 'primary.main' }} />
            Cập nhật quyền người dùng
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingUser && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Thay đổi quyền cho người dùng <strong>{editingUser.displayName}</strong>
              </Alert>

              <FormControl fullWidth>
                <InputLabel>Quyền</InputLabel>
                <Select value={newRole} label="Quyền" onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}>
                  <MenuItem value="user">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Người dùng
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Chỉ có thể xem và tạo lịch đánh
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                  <MenuItem value="admin">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AdminPanelSettings sx={{ mr: 1, color: 'error.main' }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Quản trị viên
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Quản lý toàn bộ hệ thống
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {newRole === 'admin' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Lưu ý:</strong> Quyền quản trị viên cho phép người dùng quản lý tất cả dữ liệu và người dùng khác.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} size="large" fullWidth={isMobile}>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={updateUserMutation.isPending}
            size="large"
            color={newRole === 'admin' ? 'error' : 'primary'}
            fullWidth={isMobile}
          >
            {updateUserMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Cập nhật'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notifyDialogOpen} onClose={() => setNotifyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsActive sx={{ mr: 1, color: 'primary.main' }} />
            Gửi thông báo đến tất cả thiết bị
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Tiêu đề (tùy chọn)" fullWidth value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            <TextField
              label="Nội dung thông báo"
              fullWidth
              required
              multiline
              minRows={3}
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
            />
            <Alert severity="info">Tất cả thiết bị đang mở ứng dụng PWA sẽ hiển thị thông báo này ngay lập tức.</Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setNotifyDialogOpen(false)} fullWidth={isMobile}>
            Hủy
          </Button>
          <Button
            onClick={handleSendNotification}
            variant="contained"
            disabled={sendingNotify}
            startIcon={sendingNotify ? <CircularProgress size={20} /> : <NotificationsActive />}
            fullWidth={isMobile}
          >
            {sendingNotify ? 'Đang gửi...' : 'Gửi thông báo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsers;