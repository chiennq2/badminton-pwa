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
} from '@mui/icons-material';
import { useUsers, useUpdateUser, useDeleteUser } from '../hooks';
import { User } from '../types';
import { formatDate, exportToCsv } from '../utils';
import { useAuth } from '../contexts/AuthContext';

const AdminUsers: React.FC = () => {
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
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleActiveClick = (user: User) => {
    setTogglingUser(user);
    setToggleActiveDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;

    try {
      await deleteUserMutation.mutateAsync(deletingUser.id);
      showSnackbar('Xóa người dùng thành công!', 'success');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
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
      console.error('Error toggling user active status:', error);
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
      console.error('Error updating user role:', error);
      showSnackbar(`Có lỗi xảy ra khi cập nhật quyền: ${error.message}`, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExport = () => {
    if (!users) return;
    const exportData = users.map(user => ({
      'Tên hiển thị': user.displayName,
      'Email': user.email,
      'Quyền': user.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
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

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        py: 8 
      }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Đang tải danh sách người dùng...
        </Typography>
      </Box>
    );
  }

  const adminUsers = users?.filter(u => u.role === 'admin') || [];
  const regularUsers = users?.filter(u => u.role === 'user') || [];
  const activeUsers = users?.filter(u => u.isActive) || [];
  const inactiveUsers = users?.filter(u => !u.isActive) || [];

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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SupervisorAccount sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {users?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng người dùng
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AdminPanelSettings sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {adminUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quản trị viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {activeUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã kích hoạt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonOff sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {inactiveUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chưa kích hoạt
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions Bar */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExport}
        >
          Xuất CSV
        </Button>
      </Box>

      {/* Users Table */}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1, color: 'error.main' }} />
            Xác nhận xóa người dùng
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
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteUserMutation.isPending}
            startIcon={deleteUserMutation.isPending ? <CircularProgress size={20} /> : <Delete />}
          >
            {deleteUserMutation.isPending ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Active Confirmation Dialog */}
      <Dialog
        open={toggleActiveDialogOpen}
        onClose={() => setToggleActiveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
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
                  <Chip
                    label={getRoleText(togglingUser.role)}
                    color={getRoleColor(togglingUser.role)}
                    size="small"
                  />
                </Box>
              </Paper>

              {togglingUser.isActive ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Vô hiệu hóa tài khoản này?</strong>
                  </Typography>
                  <Typography variant="body2">
                    Người dùng sẽ:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Không thể đăng nhập vào hệ thống</li>
                    <li>Bị đăng xuất ngay lập tức nếu đang online</li>
                    <li>Không thể truy cập bất kỳ chức năng nào</li>
                  </ul>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Bạn có thể kích hoạt lại tài khoản bất cứ lúc nào.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Kích hoạt tài khoản này?</strong>
                  </Typography>
                  <Typography variant="body2">
                    Người dùng sẽ có thể:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Đăng nhập vào hệ thống</li>
                    <li>Truy cập các chức năng theo quyền của mình</li>
                    <li>Sử dụng ứng dụng bình thường</li>
                  </ul>
                </Alert>
              )}

              {togglingUser.role === 'admin' && togglingUser.isActive && (
                <Alert severity="error">
                  <Typography variant="body2">
                    <strong>Lưu ý:</strong> Đây là tài khoản quản trị viên. Vô hiệu hóa có thể ảnh hưởng đến quản lý hệ thống!
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setToggleActiveDialogOpen(false)}
            size="large"
          >
            Hủy
          </Button>
          <Button
            onClick={handleToggleActive}
            variant="contained"
            color={togglingUser?.isActive ? 'warning' : 'success'}
            disabled={updateUserMutation.isPending}
            size="large"
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
            {updateUserMutation.isPending 
              ? 'Đang xử lý...' 
              : togglingUser?.isActive 
                ? 'Vô hiệu hóa' 
                : 'Kích hoạt'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Thông tin người dùng
        </DialogTitle>
        <DialogContent>
          {viewingUser && (
            <Box sx={{ pt: 2 }}>
              <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
                <Avatar 
                  src={viewingUser.photoURL}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: viewingUser.role === 'admin' ? 'error.main' : 'primary.main',
                  }}
                >
                  {viewingUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {viewingUser.displayName || 'Không có tên'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Chip
                    label={getRoleText(viewingUser.role)}
                    color={getRoleColor(viewingUser.role)}
                    icon={getRoleIcon(viewingUser.role)}
                    variant={viewingUser.role === 'admin' ? 'filled' : 'outlined'}
                  />
                  <Chip
                    label={viewingUser.isActive ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                    color={viewingUser.isActive ? 'success' : 'default'}
                    icon={viewingUser.isActive ? <CheckCircle /> : <Block />}
                  />
                </Box>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Email:</Typography>
                  </Box>
                  <Typography variant="body1">{viewingUser.email}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Security sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">Quyền hạn:</Typography>
                  </Box>
                  <Typography variant="body1">
                    {getRoleText(viewingUser.role)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Ngày tạo tài khoản:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(viewingUser.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cập nhật cuối:
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(viewingUser.updatedAt)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Đóng</Button>
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
                <Select
                  value={newRole}
                  label="Quyền"
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                >
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
                    <strong>Lưu ý:</strong> Quyền quản trị viên cho phép người dùng:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Quản lý tất cả sân, thành viên, nhóm</li>
                    <li>Xem và chỉnh sửa tất cả lịch đánh</li>
                    <li>Quản lý quyền người dùng khác</li>
                    <li>Truy cập báo cáo và cài đặt hệ thống</li>
                  </ul>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} size="large">
            Hủy
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={updateUserMutation.isPending}
            size="large"
            color={newRole === 'admin' ? 'error' : 'primary'}
            sx={{ minWidth: 120 }}
          >
            {updateUserMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Cập nhật'
            )}
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
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminUsers;