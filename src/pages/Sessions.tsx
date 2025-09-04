import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  DialogContent,
  Dialog,
  DialogTitle,
  DialogActions,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Add, Edit, Delete, Visibility, PlayArrow, Stop } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSessions, useDeleteSession, useUpdateSession } from '../hooks';
import { Session } from '../types';
import { formatCurrency, formatDate, formatTime, getSessionStatusText, getSessionStatusColor } from '../utils';
import SessionForm from '../components/SessionForm';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSessions();
  const deleteSessionMutation = useDeleteSession();
  const updateSessionMutation = useUpdateSession();

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    
    try {
      await deleteSessionMutation.mutateAsync(sessionToDelete.id);
      showSnackbar('Xóa lịch thành công!', 'success');
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi xóa lịch!', 'error');
    }
  };

  const handleStatusChange = async (sessionId: string, newStatus: Session['status']) => {
    try {
      await updateSessionMutation.mutateAsync({
        id: sessionId,
        data: { status: newStatus },
      });
      showSnackbar('Cập nhật trạng thái thành công!', 'success');
    } catch (error) {
      showSnackbar('Có lỗi xảy ra khi cập nhật trạng thái!', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tên lịch',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'date',
      headerName: 'Ngày',
      width: 120,
      renderCell: (params) => formatDate(new Date(params.value)),
    },
    {
      field: 'startTime',
      headerName: 'Giờ bắt đầu',
      width: 100,
      renderCell: (params) => formatTime(params.value),
    },
    {
      field: 'endTime',
      headerName: 'Giờ kết thúc',
      width: 100,
      renderCell: (params) => formatTime(params.value),
    },
    {
      field: 'currentParticipants',
      headerName: 'Số người',
      width: 100,
      renderCell: (params) => `${params.value}/${params.row.maxParticipants}`,
    },
    {
      field: 'totalCost',
      headerName: 'Tổng chi phí',
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={getSessionStatusText(params.value)}
          color={getSessionStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Thao tác',
      width: 180,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<Visibility />}
            label="Xem chi tiết"
            onClick={() => navigate(`/sessions/${params.id}`)}
          />,
        ];

        // Add status change actions based on current status
        if (params.row.status === 'scheduled') {
          actions.push(
            <GridActionsCellItem
              icon={<PlayArrow />}
              label="Bắt đầu"
              onClick={() => handleStatusChange(params.id as string, 'ongoing')}
            />
          );
        }

        if (params.row.status === 'ongoing') {
          actions.push(
            <GridActionsCellItem
              icon={<Stop />}
              label="Kết thúc"
              onClick={() => handleStatusChange(params.id as string, 'completed')}
            />
          );
        }

        if (params.row.status !== 'completed') {
          actions.push(
            <GridActionsCellItem
              icon={<Delete />}
              label="Xóa"
              onClick={() => {
                setSessionToDelete(params.row);
                setDeleteConfirmOpen(true);
              }}
            />
          );
        }

        return actions;
      },
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
          Quản lý lịch đánh
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateFormOpen(true)}
          size="large"
        >
          Tạo lịch mới
        </Button>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={sessions || []}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              csvOptions: {
                fileName: `danh-sach-lich-${new Date().toISOString().split('T')[0]}`,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }],
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
        onClick={() => setCreateFormOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <Add />
      </Fab>

      {/* Session Creation Form */}
      <SessionForm
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onSuccess={() => {
          setCreateFormOpen(false);
          showSnackbar('Tạo lịch thành công!', 'success');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa lịch</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa lịch "{sessionToDelete?.name}"? 
            Hành động này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteSessionMutation.isPending}
          >
            {deleteSessionMutation.isPending ? <CircularProgress size={20} /> : 'Xóa'}
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

export default Sessions;