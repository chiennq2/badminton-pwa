import React, { useState } from 'react';
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
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, Visibility, Remove } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useGroups, useCreateGroup, useMembers } from '../hooks';
import { Group, Member } from '../types';
import { formatDate } from '../utils';

const Groups: React.FC = () => {
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: members } = useMembers();
  const createGroupMutation = useCreateGroup();

  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

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
        };

        if (editingGroup) {
          // Update logic would go here
          showSnackbar('Cập nhật nhóm thành công!', 'success');
        } else {
          await createGroupMutation.mutateAsync(groupData);
          showSnackbar('Tạo nhóm mới thành công!', 'success');
        }
        handleClose();
        resetForm();
      } catch (error) {
        showSnackbar('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
      }
    },
  });

  const handleOpen = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      formik.setValues({
        name: group.name,
        description: group.description || '',
      });
      // Load group members
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

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tên nhóm',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'description',
      headerName: 'Mô tả',
      flex: 1.5,
      minWidth: 250,
    },
    {
      field: 'memberIds',
      headerName: 'Số thành viên',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value.length}
          color="primary"
          size="small"
        />
      ),
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
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="Xem"
          onClick={() => handleOpen(params.row)}
        />,
        <GridActionsCellItem
          icon={<Edit />}
          label="Sửa"
          onClick={() => handleOpen(params.row)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Xóa"
          onClick={() => {
            // Delete logic would go here
          }}
        />,
      ],
    },
  ];

  if (groupsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Quản lý nhóm
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          size="large"
        >
          Tạo nhóm mới
        </Button>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={groups || []}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
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
          }}
        />
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleOpen()}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <Add />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {editingGroup ? 'Cập nhật thông tin nhóm' : 'Tạo nhóm mới'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              label="Tên nhóm *"
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
                getOptionLabel={(option) => `${option.name} (${option.skillLevel})`}
                onChange={(_, value) => {
                  if (value) {
                    addMember(value);
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Thêm thành viên" size="small" />
                )}
                sx={{ mb: 2 }}
              />

              {selectedMembers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Chưa có thành viên nào trong nhóm
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {selectedMembers.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemText
                        primary={member.name}
                        secondary={member.skillLevel}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => removeMember(member)}
                          size="small"
                        >
                          <Remove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <CircularProgress size={20} />
              ) : editingGroup ? (
                'Cập nhật'
              ) : (
                'Tạo mới'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Groups;