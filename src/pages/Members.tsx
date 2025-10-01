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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks';
import { Member } from '../types';
import { formatDate, validateEmail, validatePhone } from '../utils';

const skillLevels = [
  'Mới bắt đầu',
  'Trung bình', 
  'Khá',
  'Giỏi',
  'Chuyên nghiệp'
];

const Members: React.FC = () => {
  const { data: members, isLoading } = useMembers();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .required('Tên là bắt buộc'),
    email: Yup.string()
      .email('Email không hợp lệ')
      .optional(),
    phone: Yup.string()
      .optional()
      .test('phone', 'Số điện thoại không hợp lệ', (value) => {
        if (!value) return true;
        return validatePhone(value);
      }),
    skillLevel: Yup.mixed().oneOf(['Mới bắt đầu', 'Trung bình', 'Khá', 'Giỏi', 'Chuyên nghiệp']).required('Trình độ là bắt buộc'),
    joinDate: Yup.date().required('Ngày tham gia là bắt buộc'),
    notes: Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      skillLevel: 'Mới bắt đầu',
      joinDate: new Date(),
      isActive: true,
      notes: '',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const updatedValues = {
          ...values,
          skillLevel: values.skillLevel as 'Mới bắt đầu' | 'Trung bình' | 'Khá' | 'Giỏi' | 'Chuyên nghiệp',
        };
        if (editingMember) {
          await updateMemberMutation.mutateAsync({
            id: editingMember.id,
            data: updatedValues,
          });
          showSnackbar('Cập nhật thành viên thành công!', 'success');
        } else {
          await createMemberMutation.mutateAsync(updatedValues);
          showSnackbar('Tạo thành viên mới thành công!', 'success');
        }
        handleClose();
        resetForm();
      } catch (error) {
        showSnackbar('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
      }
    },
  });

  const handleOpen = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      formik.setValues({
        name: member.name,
        email: member.email || '',
        phone: member.phone || '',
        skillLevel: member.skillLevel,
        joinDate: member.joinDate,
        isActive: member.isActive,
        notes: member.notes || '',
      });
    } else {
      setEditingMember(null);
      formik.resetForm();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    
    try {
      await deleteMemberMutation.mutateAsync(memberToDelete.id);
      showSnackbar('Xóa thành viên thành công!', 'success');
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi xóa thành viên!', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getSkillLevelColor = (skillLevel: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (skillLevel) {
      case 'Mới bắt đầu':
        return 'default';
      case 'Trung bình':
        return 'primary';
      case 'Khá':
        return 'secondary';
      case 'Giỏi':
        return 'success';
      case 'Chuyên nghiệp':
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tên',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'phone',
      headerName: 'Số điện thoại',
      width: 130,
    },
    {
      field: 'skillLevel',
      headerName: 'Trình độ',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getSkillLevelColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'joinDate',
      headerName: 'Ngày tham gia',
      width: 130,
      renderCell: (params) => formatDate(new Date(params.value)),
    },
    {
      field: 'isActive',
      headerName: 'Trạng thái',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Hoạt động' : 'Ngừng'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
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
            setMemberToDelete(params.row);
            setDeleteConfirmOpen(true);
          }}
        />,
      ],
    },
  ];

  if (isLoading) {
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
          Quản lý thành viên
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          size="large"
        >
          Thêm thành viên
        </Button>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={members || []}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              csvOptions: {
                fileName: `danh-sach-thanh-vien-${new Date().toISOString().split('T')[0]}`,
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
            {editingMember ? 'Cập nhật thông tin thành viên' : 'Thêm thành viên mới'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              label="Tên thành viên *"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />

            <TextField
              fullWidth
              margin="normal"
              name="email"
              label="Email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />

            <TextField
              fullWidth
              margin="normal"
              name="phone"
              label="Số điện thoại"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Trình độ *</InputLabel>
              <Select
                name="skillLevel"
                value={formik.values.skillLevel}
                onChange={formik.handleChange}
                label="Trình độ *"
                error={formik.touched.skillLevel && Boolean(formik.errors.skillLevel)}
              >
                {skillLevels.map(level => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Ngày tham gia *"
              value={dayjs(formik.values.joinDate)}
              onChange={(newValue) => {
                formik.setFieldValue('joinDate', newValue?.toDate());
              }}
                              dayOfWeekFormatter={(day) => {  // ✅ THÊM
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  return dayNames[day];
                }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  error: formik.touched.joinDate && Boolean(formik.errors.joinDate),
                  helperText: formik.touched.joinDate && typeof formik.errors.joinDate === 'string' ? formik.errors.joinDate : '',
                },
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="isActive"
                value={formik.values.isActive ? "true" : "false"}
                onChange={(event) => {
                  formik.setFieldValue('isActive', event.target.value === 'true');
                }}
                label="Trạng thái"
              >
                <MenuItem value="true">Hoạt động</MenuItem>
                <MenuItem value="false">Ngừng hoạt động</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              name="notes"
              label="Ghi chú"
              multiline
              rows={3}
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.notes && Boolean(formik.errors.notes)}
              helperText={formik.touched.notes && formik.errors.notes}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
            >
              {createMemberMutation.isPending || updateMemberMutation.isPending ? (
                <CircularProgress size={20} />
              ) : editingMember ? (
                'Cập nhật'
              ) : (
                'Tạo mới'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa thành viên</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa thành viên "{memberToDelete?.name}"? 
            Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMemberMutation.isPending}
          >
            {deleteMemberMutation.isPending ? <CircularProgress size={20} /> : 'Xóa'}
          </Button>
        </DialogActions>
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

export default Members;