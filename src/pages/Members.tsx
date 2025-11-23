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
  FormControlLabel,
  Checkbox,
  Avatar,
  Card,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Menu,
  useMediaQuery,
  useTheme,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import { Add, Edit, Delete, Visibility, MoreVert, ExpandMore } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from '../hooks';
import { Member } from '../types';
import { formatDate, transformUrl, validatePhone } from '../utils';

const skillLevels = ['Pot 5', 'Pot 4', 'Pot 3', 'Pot 2', 'Pot 1'];

const Members: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: members, isLoading } = useMembers();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Bộ lọc mobile
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterSkillList, setFilterSkillList] = useState<string[]>([]);

  const filteredMembers = members?.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (m.phone || '').includes(searchTerm);
    const matchStatus = filterStatus === 'active' ? m.isActive : filterStatus === 'inactive' ? !m.isActive : true;
    const matchGender = filterGender === 'male' ? !m.isWoman : filterGender === 'female' ? m.isWoman : true;
    const matchSkill = filterSkillList.length > 0 ? filterSkillList.includes(m.skillLevel) : true;
    return matchSearch && matchStatus && matchGender && matchSkill;
  });

  const validationSchema = Yup.object({
    name: Yup.string().required('Tên là bắt buộc'),
    skillLevel: Yup.string().required('Trình độ là bắt buộc'),
    joinDate: Yup.date().required('Ngày tham gia là bắt buộc'),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      skillLevel: 'Pot 5',
      joinDate: new Date(),
      birthDay: null,
      isWoman: false,
      avatar: '',
      isActive: true,
      notes: '',
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
        const updatedValues = {
          ...values,
          birthDay: values.birthDay ? new Date(values.birthDay) : null,
          isWoman: values.isWoman ? true : false,
          avatar: values.avatar,
          skillLevel: values.skillLevel as
            | "Pot 5"
            | "Pot 4"
            | "Pot 3"
            | "Pot 2"
            | "Pot 1",
        };
      try {
        if (editingMember)
          await updateMemberMutation.mutateAsync({ id: editingMember.id, data: updatedValues });
        else await createMemberMutation.mutateAsync(updatedValues);
        showSnackbar(editingMember ? 'Cập nhật thành viên thành công!' : 'Tạo thành viên mới thành công!', 'success');
        handleClose();
        resetForm();
      } catch {
        showSnackbar('Có lỗi xảy ra. Vui lòng thử lại!', 'error');
      }
    },
  });

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, m: Member) => {
    setMenuAnchorEl(e.currentTarget);
    setSelectedMember(m);
  };
  const handleMenuClose = () => setMenuAnchorEl(null);
  const handleOpen = (m?: Member) => {
    if (m) formik.setValues({ ...formik.values, ...m });
    else formik.resetForm();
    setEditingMember(m || null);
    setOpen(true);
    handleMenuClose();
  };
  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
    formik.resetForm();
  };
  const handleDeleteClick = (m: Member) => {
    setMemberToDelete(m);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };
  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteMemberMutation.mutateAsync(memberToDelete.id);
      showSnackbar('Xóa thành viên thành công!', 'success');
    } catch {
      showSnackbar('Lỗi khi xóa thành viên!', 'error');
    }
    setDeleteConfirmOpen(false);
  };
  const showSnackbar = (msg: string, sev: 'success' | 'error') => setSnackbar({ open: true, message: msg, severity: sev });

  const getSkillLevelColor = (s: string) =>
    s === 'Pot 1' ? 'warning' : s === 'Pot 2' ? 'success' : s === 'Pot 3' ? 'secondary' : s === 'Pot 4' ? 'primary' : 'default';

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tên',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={transformUrl(params.row.avatar)} sx={{ width: 30, height: 30 }}>
            {params.value?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 150 },
    { field: 'phone', headerName: 'SĐT', width: 120 },
    {
      field: 'skillLevel',
      headerName: 'Trình độ',
      width: 120,
      renderCell: (p) => <Chip label={p.value} color={getSkillLevelColor(p.value)} size="small" />,
    },
    {
      field: 'isActive',
      headerName: 'Trạng thái',
      width: 130,
      renderCell: (p) => (
        <Chip label={p.value ? 'Hoạt động' : 'Ngừng'} color={p.value ? 'success' : 'default'} size="small" />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Thao tác',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem icon={<Edit />} label="Sửa" onClick={() => handleOpen(params.row)} />,
        <GridActionsCellItem icon={<Delete />} label="Xóa" onClick={() => handleDeleteClick(params.row)} showInMenu />,
      ],
    },
  ];

  if (isLoading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={60} />
      </Box>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Quản lý thành viên</Typography>
        {!isMobile && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} size="large">
            Thêm thành viên
          </Button>
        )}
      </Box>

      {isMobile ? (
        <>
          {/* Bộ lọc mobile */}
          <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField placeholder="Tìm kiếm tên, email, số ĐT..." size="small" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select value={filterStatus} label="Trạng thái" size="small" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="inactive">Ngừng</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Giới tính</InputLabel>
                <Select value={filterGender} label="Giới tính" size="small" onChange={(e) => setFilterGender(e.target.value)}>
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="male">Nam</MenuItem>
                  <MenuItem value="female">Nữ</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Accordion sx={{ mt: 1, borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2" fontWeight="medium">Bộ lọc nâng cao</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <InputLabel>Trình độ</InputLabel>
                  <Select
                    multiple
                    value={filterSkillList}
                    onChange={(e) => setFilterSkillList(e.target.value as string[])}
                    label="Trình độ"
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {skillLevels.map((lvl) => (
                      <MenuItem key={lvl} value={lvl}>
                        <Checkbox checked={filterSkillList.indexOf(lvl) > -1} />
                        <Typography>{lvl}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Danh sách mobile */}
          <Box sx={{ flex: 1, overflow: 'auto', maxHeight: '65vh', px: 1 }}>

          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {filteredMembers?.map((m) => (
              <Card key={m.id} sx={{ mb: 1.5, mx: 1, p: 1, borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={transformUrl(m.avatar)} sx={{ bgcolor: 'primary.main' }}>
                      {m.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body1" fontWeight="medium">{m.name}</Typography>
                      <Chip label={m.skillLevel} color={getSkillLevelColor(m.skillLevel)} size="small" sx={{ height: 20 }} />
                    </Box>}
                    secondary={<>
                      {m.email && <Typography variant="caption" display="block">{m.email}</Typography>}
                      {m.phone && <Typography variant="caption" display="block">{m.phone}</Typography>}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip label={m.isActive ? 'Hoạt động' : 'Ngừng'} color={m.isActive ? 'success' : 'default'} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                        <Typography variant="caption" color="text.secondary">{formatDate(m.joinDate)}</Typography>
                      </Box>
                    </>}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={(e) => handleMenuOpen(e, m)}><MoreVert /></IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Card>
            ))}
          </List>
          </Box>
          <Fab color="primary" aria-label="add" onClick={() => handleOpen()} sx={{ position: 'fixed', bottom: 24, right: 24 }}>
            <Add />
          </Fab>
        </>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={members || []}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
            }}
          />
        </Box>
      )}

      {/* Menu mobile */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedMember && handleOpen(selectedMember)}>
          <Visibility sx={{ mr: 2 }} fontSize="small" />Xem chi tiết
        </MenuItem>
        <MenuItem onClick={() => selectedMember && handleOpen(selectedMember)}>
          <Edit sx={{ mr: 2 }} fontSize="small" />Sửa
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => selectedMember && handleDeleteClick(selectedMember)} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 2 }} fontSize="small" color="error" />Xóa
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>{editingMember ? 'Cập nhật thông tin thành viên' : 'Thêm thành viên mới'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField name="name" label="Tên thành viên *" fullWidth {...formik.getFieldProps('name')} />
              <TextField name="email" label="Email" fullWidth {...formik.getFieldProps('email')} />
              <TextField name="phone" label="Số điện thoại" fullWidth {...formik.getFieldProps('phone')} />
              <DatePicker label="Ngày sinh" value={formik.values.birthDay ? dayjs(formik.values.birthDay) : null}
                onChange={(v) => formik.setFieldValue('birthDay', v?.toDate())}
                slotProps={{ textField: { fullWidth: true } }} />
              <FormControlLabel control={<Checkbox checked={formik.values.isWoman}
                onChange={(e) => formik.setFieldValue('isWoman', e.target.checked)} />} label="Nữ" />
              <TextField name="avatar" label="Avatar (URL)" fullWidth {...formik.getFieldProps('avatar')} />
              <FormControl fullWidth><InputLabel>Trình độ *</InputLabel>
                <Select name="skillLevel" value={formik.values.skillLevel}
                  onChange={formik.handleChange}>{skillLevels.map((lvl) => <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>)}</Select>
              </FormControl>
              <DatePicker label="Ngày tham gia *" value={dayjs(formik.values.joinDate)}
                onChange={(v) => formik.setFieldValue('joinDate', v?.toDate())}
                slotProps={{ textField: { fullWidth: true } }} />
              <FormControl fullWidth><InputLabel>Trạng thái</InputLabel>
                <Select value={formik.values.isActive ? 'true' : 'false'}
                  onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')}>
                  <MenuItem value="true">Hoạt động</MenuItem>
                  <MenuItem value="false">Ngừng</MenuItem>
                </Select>
              </FormControl>
              <TextField name="notes" label="Ghi chú" multiline rows={3} fullWidth {...formik.getFieldProps('notes')} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
            <Button onClick={handleClose} fullWidth={isMobile}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={createMemberMutation.isPending || updateMemberMutation.isPending} fullWidth={isMobile}>
              {createMemberMutation.isPending || updateMemberMutation.isPending ? <CircularProgress size={20} /> : editingMember ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Xác nhận xóa thành viên</DialogTitle>
        <DialogContent><Typography>Bạn có chắc muốn xóa "{memberToDelete?.name}"?</Typography></DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} fullWidth={isMobile}>Hủy</Button>
          <Button onClick={handleDelete} color="error" variant="contained" fullWidth={isMobile}>
            {deleteMemberMutation.isPending ? <CircularProgress size={20} /> : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Members;
