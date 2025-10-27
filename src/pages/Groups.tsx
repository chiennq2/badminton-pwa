import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  Tooltip,
  Grid,
  Paper,
  Avatar,
  Badge,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { 
  Add, 
  Edit, 
  Delete, 
  Visibility, 
  Remove, 
  Groups as GroupsIcon,
  Person,
  ExpandMore,
  ExpandLess,
  FilterList,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useMembers } from '../hooks';
import { Group, Member } from '../types';
import { formatDate, getCurrentUserLogin } from '../utils';

const Groups: React.FC = () => {
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: members } = useMembers();
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [filterMyGroups, setFilterMyGroups] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  // ✅ Load current user
  React.useEffect(() => {
    (async () => {
      const user = await getCurrentUserLogin();
      setCurrentUser(user);
    })();
  }, []);

  // ✅ Lọc nhóm theo quyền
  const filteredGroups = useMemo(() => {
    if (!groups || !currentUser) return [];
    
    if (filterMyGroups) {
      return groups.filter(g => g.createdBy === currentUser.memberId);
    }
    
    return groups;
  }, [groups, currentUser, filterMyGroups]);

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(2, 'Tên nhóm phải có ít nhất 2 ký tự')
      .required('Tên nhóm là bắt buộc'),
    description: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const groupData = {
          ...values,
          memberIds: selectedMembers.map(m => m.id),
          createdBy: editingGroup?.createdBy || currentUser?.memberId || '',
          createdByName: editingGroup?.createdByName || currentUser?.displayName || '',
        };

        if (editingGroup) {
          await updateGroupMutation.mutateAsync({
            id: editingGroup.id,
            data: groupData,
          });
          showSnackbar('Cập nhật nhóm thành công!', 'success');
        } else {
          await createGroupMutation.mutateAsync(groupData);
          showSnackbar('Tạo nhóm mới thành công!', 'success');
        }
        handleClose();
        resetForm();
      } catch (error: any) {
        console.error('Error saving group:', error);
        showSnackbar(`Có lỗi xảy ra: ${error.message || 'Vui lòng thử lại!'}`, 'error');
      }
    },
  });

  // ✅ Check quyền chỉnh sửa/xóa
  const canEditGroup = (group: Group) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || group.createdBy === currentUser.memberId;
  };

  const handleOpen = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      formik.setValues({
        name: group.name,
        description: group.description || '',
      });
      const groupMembers = members?.filter(member => 
        group.memberIds.includes(member.id)
      ) || [];
      setSelectedMembers(groupMembers);
    } else {
      setEditingGroup(null);
      formik.resetForm();
      setSelectedMembers([]);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingGroup(null);
    setSelectedMembers([]);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    
    try {
      await deleteGroupMutation.mutateAsync(groupToDelete.id);
      showSnackbar('Xóa nhóm thành công!', 'success');
      setDeleteConfirmOpen(false);
      setGroupToDelete(null);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      showSnackbar(`Có lỗi xảy ra khi xóa nhóm: ${error.message}`, 'error');
    }
  };

  const addMember = (member: Member) => {
    if (!selectedMembers.some(m => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const removeMember = (member: Member) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExpandCard = (groupId: string) => {
    setExpandedCard(expandedCard === groupId ? null : groupId);
  };

  if (groupsLoading) {
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
          Đang tải danh sách nhóm...
        </Typography>
      </Box>
    );
  }

  // ✅ Mobile View - Card Layout
  const MobileGroupsList = () => (
    <Box>
      {filteredGroups?.map((group) => {
        const isExpanded = expandedCard === group.id;
        const groupMembers = members?.filter(m => group.memberIds.includes(m.id)) || [];
        const canEdit = canEditGroup(group);
        
        return (
          <Card key={group.id} sx={{ mb: 2 }}>
            <CardContent>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {group.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person fontSize="small" />
                    {group.createdByName || 'Không rõ'}
                  </Typography>
                </Box>
                
                <Badge badgeContent={group.memberIds.length} color="primary" max={99}>
                  <GroupsIcon color="action" />
                </Badge>
              </Box>

              {/* Description */}
              {group.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {group.description}
                </Typography>
              )}

              {/* Quick Info */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip 
                  label={`${group.memberIds.length} thành viên`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={formatDate(group.createdAt)} 
                  size="small" 
                  variant="outlined"
                />
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  size="small"
                  onClick={() => handleExpandCard(group.id)}
                  endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                >
                  {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                </Button>
                
                <Box>
                  {canEdit && (
                    <>
                      <IconButton size="small" onClick={() => handleOpen(group)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => {
                          setGroupToDelete(group);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>

              {/* Expanded Content */}
              <Collapse in={isExpanded}>
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Danh sách thành viên ({groupMembers.length})
                  </Typography>
                  
                  {groupMembers.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Chưa có thành viên nào
                    </Alert>
                  ) : (
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      {groupMembers.map((member) => (
                        <Grid item xs={6} key={member.id}>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 1, 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Avatar 
                              src={member.avatar} 
                              sx={{ width: 32, height: 32 }}
                            >
                              {member.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" noWrap>
                              {member.name}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
      
      {filteredGroups?.length === 0 && (
        <Alert severity="info">
          {filterMyGroups 
            ? 'Bạn chưa tạo nhóm nào' 
            : 'Chưa có nhóm nào được tạo'}
        </Alert>
      )}
    </Box>
  );

  // ✅ Desktop View - DataGrid
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tên nhóm',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.value}
            </Typography>
            {params.row.description && (
              <Typography variant="caption" color="text.secondary">
                {params.row.description}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: 'createdByName',
      headerName: 'Người tạo',
      width: 150,
      renderCell: (params) => (
        <Chip
          icon={<Person />}
          label={params.value || 'Không rõ'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'memberIds',
      headerName: 'Thành viên',
      width: 300,
      renderCell: (params) => {
        const memberNames = members?.filter(member => 
          params.value.includes(member.id)
        ).map(member => member.name) || [];
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`${params.value.length} thành viên`}
              color="primary"
              size="small"
              sx={{ mr: 1 }}
            />
            {memberNames.slice(0, 2).map((name, index) => (
              <Chip
                key={index}
                label={name}
                size="small"
                variant="outlined"
              />
            ))}
            {memberNames.length > 2 && (
              <Chip
                label={`+${memberNames.length - 2}`}
                size="small"
                variant="outlined"
                color="secondary"
              />
            )}
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Ngày tạo',
      width: 130,
      renderCell: (params) => formatDate(new Date(params.value)),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Thao tác',
      width: 150,
      getActions: (params: GridRowParams) => {
        const group = params.row as Group;
        const actions = [
          <GridActionsCellItem
            icon={<Tooltip title="Xem chi tiết"><Visibility /></Tooltip>}
            label="Xem"
            onClick={() => handleOpen(group)}
          />,
        ];

        // Chỉ hiển thị nút sửa/xóa nếu có quyền
        if (canEditGroup(group)) {
          actions.push(
            <GridActionsCellItem
              icon={<Tooltip title="Chỉnh sửa"><Edit /></Tooltip>}
              label="Sửa"
              onClick={() => handleOpen(group)}
            />,
            <GridActionsCellItem
              icon={<Tooltip title="Xóa nhóm"><Delete /></Tooltip>}
              label="Xóa"
              onClick={() => {
                setGroupToDelete(group);
                setDeleteConfirmOpen(true);
              }}
              showInMenu
            />
          );
        }

        return actions;
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 3 
      }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Quản lý nhóm
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tạo và quản lý các nhóm thành viên để dễ dàng tổ chức lịch đánh
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          size="large"
          fullWidth={isMobile}
          sx={{
            background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
            },
          }}
        >
          Tạo nhóm mới
        </Button>
      </Box>

      {/* Quick Stats & Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip 
          label={`Tổng: ${groups?.length || 0} nhóm`} 
          color="primary" 
          variant="outlined" 
        />
        <Chip 
          label={`Thành viên: ${members?.length || 0}`} 
          color="info" 
          variant="outlined" 
        />
        
        {currentUser && (
          <Button
            size="small"
            variant={filterMyGroups ? "contained" : "outlined"}
            startIcon={<FilterList />}
            onClick={() => setFilterMyGroups(!filterMyGroups)}
          >
            {filterMyGroups ? 'Nhóm của tôi' : 'Tất cả nhóm'}
          </Button>
        )}
      </Box>

      {/* Content - Mobile or Desktop */}
      {isMobile ? (
        <MobileGroupsList />
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={filteredGroups || []}
                columns={columns}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { 
                      debounceMs: 500,
                      placeholder: 'Tìm kiếm nhóm...',
                    },
                    csvOptions: {
                      fileName: `danh-sach-nhom-${new Date().toISOString().split('T')[0]}`,
                    },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                  sorting: {
                    sortModel: [{ field: 'name', sort: 'asc' }],
                  },
                }}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-cell': {
                    borderColor: 'divider',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'action.hover',
                    fontWeight: 600,
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                loading={createGroupMutation.isPending || updateGroupMutation.isPending || deleteGroupMutation.isPending}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button - Mobile Only */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add group"
          onClick={() => handleOpen()}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
            },
          }}
        >
          <Add />
        </Fab>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupsIcon sx={{ mr: 1, color: 'primary.main' }} />
              {editingGroup ? 'Cập nhật thông tin nhóm' : 'Tạo nhóm mới'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              label="Tên nhóm *"
              placeholder="VD: Nhóm A, Nhóm Chủ nhật..."
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />

            <TextField
              fullWidth
              margin="normal"
              name="description"
              label="Mô tả"
              placeholder="Mô tả về nhóm..."
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.description && Boolean(formik.errors.description)}
              helperText={formik.touched.description && formik.errors.description}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Thành viên nhóm ({selectedMembers.length})
              </Typography>
              
              <Autocomplete
                options={members?.filter(member => 
                  member.isActive && !selectedMembers.some(sm => sm.id === member.id)
                ) || []}
                getOptionLabel={(option) => `${option.name}`}
                onChange={(_, value) => {
                  if (value) {
                    addMember(value);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Thêm thành viên" size="small" />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Avatar 
                      src={option.avatar} 
                      sx={{ mr: 2, width: 32, height: 32 }}
                    >
                      {option.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </Box>
                )}
                sx={{ mb: 2 }}
              />

              <Card variant="outlined">
                <CardContent>
                  {selectedMembers.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có thành viên nào trong nhóm
                    </Typography>
                  ) : (
                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {selectedMembers.map((member) => (
                        <ListItem key={member.id}>
                          <Avatar 
                            src={member.avatar} 
                            sx={{ mr: 2, width: 32, height: 32 }}
                          >
                            {member.name.charAt(0)}
                          </Avatar>
                          <ListItemText
                            primary={member.name}
                            secondary={`${member.email || 'Không có email'}`}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Xóa khỏi nhóm">
                              <IconButton
                                edge="end"
                                onClick={() => removeMember(member)}
                                size="small"
                                color="error"
                              >
                                <Remove />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} size="large">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
              size="large"
              sx={{
                minWidth: 120,
                background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                },
              }}
            >
              {createGroupMutation.isPending || updateGroupMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : editingGroup ? (
                'Cập nhật'
              ) : (
                'Tạo mới'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1 }} />
            Xác nhận xóa nhóm
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hành động này không thể hoàn tác!
          </Alert>
          <Typography variant="body1">
            Bạn có chắc chắn muốn xóa nhóm <strong>"{groupToDelete?.name}"</strong>?
          </Typography>
          {groupToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Người tạo:</strong> {groupToDelete.createdByName || 'Không rõ'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Số thành viên:</strong> {groupToDelete.memberIds.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Mô tả:</strong> {groupToDelete.description || 'Không có mô tả'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Ngày tạo:</strong> {formatDate(groupToDelete.createdAt)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            size="large"
          >
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteGroupMutation.isPending}
            size="large"
            startIcon={deleteGroupMutation.isPending ? <CircularProgress size={16} /> : <Delete />}
          >
            {deleteGroupMutation.isPending ? 'Đang xóa...' : 'Xóa nhóm'}
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

export default Groups;