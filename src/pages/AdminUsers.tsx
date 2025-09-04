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
  IconButton,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { 
  Edit, 
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
} from '@mui/icons-material';
import { useUsers, useUpdateUser } from '../hooks';
import { User } from '../types';
import { formatDate, exportToCsv } from '../utils';

const AdminUsers: React.FC = () => {
  const { data: users, isLoading } = useUsers();
  const updateUserMutation = useUpdateUser();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
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
      'Ngày tạo': formatDate(user.createdAt),
      'Cập nhật cuối': formatDate(user.updatedAt),
    }));
    exportToCsv(exportData, `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}.csv`);
    showSnackbar('Xuất file CSV thành công!', 'success');
  };

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'user':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'user':
        return 'Người dùng';
      default:
        return 'Không xác định';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminPanelSettings />;
      case 'user':
        return <Person />;
      default:
        return <Person />;
    }
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
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Quyền',
      width: 160,
      renderCell: (params) => (
        <Tooltip title={`Quyền: ${getRoleText(params.value)}`}>
          <Chip
            label={getRoleText(params.value)}
            color={getRoleColor(params.value)}
            size="small"
            icon={getRoleIcon(params.value)}
            variant={params.value === 'admin' ? 'filled' : 'outlined'}
          />
        </Tooltip>
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
      field: 'updatedAt',
      headerName: 'Cập nhật cuối',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(new Date(params.value))}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Thao tác',
      width: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Xem chi tiết">
              <MoreVert />
            </Tooltip>
          }
          label="Xem chi tiết"
          onClick={() => handleViewUser(params.row as User)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Sửa quyền">
              <Edit />
            </Tooltip>
          }
          label="Sửa quyền"
          onClick={() => handleEditRole(params.row as User)}
          showInMenu
        />,
      ],
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
              <Person sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {regularUsers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Người dùng
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {((adminUsers.length / (users?.length || 1)) * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tỷ lệ admin
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quản trị viên gần đây
              </Typography>
              <List dense>
                {adminUsers.slice(0, 3).map((admin) => (
                  <ListItem key={admin.id} divider>
                    <ListItemAvatar>
                      <Badge
                        badgeContent={<AdminPanelSettings fontSize="small" />}
                        color="error"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar src={admin.photoURL} sx={{ width: 32, height: 32 }}>
                          {admin.displayName?.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={admin.displayName}
                      secondary={admin.email}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleViewUser(admin)} size="small">
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Người dùng mới nhất
              </Typography>
              <List dense>
                {users?.slice(-3).reverse().map((user) => (
                  <ListItem key={user.id} divider>
                    <ListItemAvatar>
                      <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }}>
                        {user.displayName?.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.displayName}
                      secondary={`${user.email} • ${formatDate(user.createdAt)}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={getRoleText(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Grid */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Danh sách người dùng ({users?.length || 0})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExport}
              size="small"
            >
              Xuất CSV
            </Button>
          </Box>
          
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={users || []}
              columns={columns}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { 
                    debounceMs: 500,
                    placeholder: 'Tìm kiếm người dùng...',
                  },
                  csvOptions: {
                    fileName: `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}`,
                  },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
                sorting: {
                  sortModel: [{ field: 'createdAt', sort: 'desc' }],
                },
              }}
              checkboxSelection
              disableRowSelectionOnClick
              getRowClassName={(params) => 
                params.row.role === 'admin' ? 'admin-row' : ''
              }
              sx={{
                '& .MuiDataGrid-cell': {
                  borderColor: 'divider',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'action.hover',
                  fontWeight: 600,
                },
                '& .admin-row': {
                  backgroundColor: 'rgba(244, 67, 54, 0.04)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              loading={updateUserMutation.isPending}
            />
          </Box>
        </CardContent>
      </Card>

      {/* View User Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1, color: 'primary.main' }} />
            Chi tiết người dùng
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingUser && (
            <Box sx={{ pt: 1 }}>
              <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
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
                <Chip
                  label={getRoleText(viewingUser.role)}
                  color={getRoleColor(viewingUser.role)}
                  icon={getRoleIcon(viewingUser.role)}
                  variant={viewingUser.role === 'admin' ? 'filled' : 'outlined'}
                />
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
                    {viewingUser.role === 'admin' && ' - Có thể quản lý toàn bộ hệ thống'}
                    {viewingUser.role === 'user' && ' - Chỉ có thể xem và tạo lịch đánh'}
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
          <Button
            variant="contained"
            onClick={() => {
              setViewDialogOpen(false);
              if (viewingUser) {
                handleEditRole(viewingUser);
              }
            }}
            startIcon={<Edit />}
          >
            Chỉnh sửa quyền
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

              <Paper sx={{ p: 2, mb: 3, backgroundColor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar src={editingUser.photoURL} sx={{ mr: 2 }}>
                    {editingUser.displayName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {editingUser.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {editingUser.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quyền hiện tại: {getRoleText(editingUser.role)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
              
              <FormControl fullWidth>
                <InputLabel>Quyền mới *</InputLabel>
                <Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  label="Quyền mới *"
                >
                  <MenuItem value="user">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Người dùng
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Có thể xem và tạo lịch đánh
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