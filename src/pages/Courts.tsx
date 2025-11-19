import React, { useState, useMemo } from "react";
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
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Fab,
  Card,
  CardContent,
  Grid,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  useMediaQuery,
  useTheme,
  Divider,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridActionsCellItem,
  GridRowParams,
} from "@mui/x-data-grid";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  SportsTennis,
  LocationOn,
  AttachMoney,
  Info,
  FileDownload,
  MoreVert,
  Search,
  FilterList,
  Close,
  SportsEsports,
  PriceChange,
  VideogameAssetOff,
  VideogameAsset,
} from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  useCourts,
  useCreateCourt,
  useUpdateCourt,
  useDeleteCourt,
} from "../hooks";
import { Court } from "../types";
import { formatCurrency, exportToCsv, formatDate } from "../utils";

const Courts: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: courts, isLoading } = useCourts();
  const createCourtMutation = useCreateCourt();
  const updateCourtMutation = useUpdateCourt();
  const deleteCourtMutation = useDeleteCourt();

  const [open, setOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCourt, setViewingCourt] = useState<Court | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(2, "Tên sân phải có ít nhất 2 ký tự")
      .required("Tên sân là bắt buộc"),
    location: Yup.string()
      .min(5, "Địa chỉ phải có ít nhất 5 ký tự")
      .required("Địa chỉ là bắt buộc"),
    pricePerHour: Yup.number()
      .positive("Giá phải lớn hơn 0")
      .min(10000, "Giá tối thiểu 10,000 VNĐ")
      .max(1000000, "Giá tối đa 1,000,000 VNĐ")
      .required("Giá theo giờ là bắt buộc"),
    description: Yup.string().max(500, "Mô tả không được quá 500 ký tự"),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      location: "",
      pricePerHour: 100000,
      description: "",
      isActive: true,
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        if (editingCourt) {
          await updateCourtMutation.mutateAsync({
            id: editingCourt.id,
            data: {
              ...values,
              updatedAt: new Date(),
            },
          });
          showSnackbar("Cập nhật sân thành công!", "success");
        } else {
          await createCourtMutation.mutateAsync(values);
          showSnackbar("Tạo sân mới thành công!", "success");
        }
        handleClose();
        resetForm();
      } catch (error: any) {
        showSnackbar(
          `Có lỗi xảy ra: ${error.message || "Vui lòng thử lại!"}`,
          "error"
        );
      }
    },
  });

  // Filtered courts
  const filteredCourts = useMemo(() => {
    if (!courts) return [];

    return courts.filter((court) => {
      const matchesSearch =
        court.name.toLowerCase().includes(searchText.toLowerCase()) ||
        court.location.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && court.isActive) ||
        (statusFilter === "inactive" && !court.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [courts, searchText, statusFilter]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    court: Court
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedCourt(court);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedCourt(null);
  };

  const handleOpen = (court?: Court) => {
    if (court) {
      setEditingCourt(court);
      formik.setValues({
        name: court.name,
        location: court.location,
        pricePerHour: court.pricePerHour,
        description: court.description || "",
        isActive: court.isActive,
      });
    } else {
      setEditingCourt(null);
      formik.resetForm();
    }
    setOpen(true);
    handleMenuClose();
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCourt(null);
    formik.resetForm();
  };

  const handleView = (court: Court) => {
    setViewingCourt(court);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!courtToDelete) return;

    try {
      await deleteCourtMutation.mutateAsync(courtToDelete.id);
      showSnackbar("Xóa sân thành công!", "success");
      setDeleteConfirmOpen(false);
      setCourtToDelete(null);
    } catch (error: any) {
      showSnackbar(`Có lỗi xảy ra khi xóa sân: ${error.message}`, "error");
    }
  };

  const handleDeleteClick = (court: Court) => {
    setCourtToDelete(court);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExport = () => {
    if (!courts) return;
    const exportData = courts.map((court) => ({
      "Tên sân": court.name,
      "Địa chỉ": court.location,
      "Giá/giờ (VNĐ)": court.pricePerHour,
      "Mô tả": court.description || "",
      "Trạng thái": court.isActive ? "Hoạt động" : "Ngừng hoạt động",
      "Ngày tạo": formatDate(court.createdAt),
      "Cập nhật cuối": formatDate(court.updatedAt),
    }));
    exportToCsv(
      exportData,
      `danh-sach-san-${new Date().toISOString().split("T")[0]}.csv`
    );
    showSnackbar("Xuất file CSV thành công!", "success");
  };

  const handleClearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setFilterDialogOpen(false);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Tên sân",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar
            sx={{ mr: 2, bgcolor: "primary.main", width: 32, height: 32 }}
          >
            <SportsTennis fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "location",
      headerName: "Địa chỉ",
      flex: 1.5,
      minWidth: 250,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <LocationOn
            fontSize="small"
            sx={{ mr: 1, color: "text.secondary" }}
          />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "pricePerHour",
      headerName: "Giá/Giờ",
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <AttachMoney
            fontSize="small"
            sx={{ mr: 0.5, color: "success.main" }}
          />
          <Typography variant="body2" fontWeight="medium" color="success.main">
            {formatCurrency(params.value)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "isActive",
      headerName: "Trạng thái",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Hoạt động" : "Ngừng"}
          color={params.value ? "success" : "error"}
          size="small"
          variant={params.value ? "filled" : "outlined"}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Thao tác",
      width: 160,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Xem chi tiết">
              <Visibility />
            </Tooltip>
          }
          label="Xem"
          onClick={() => handleView(params.row as Court)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Chỉnh sửa">
              <Edit />
            </Tooltip>
          }
          label="Sửa"
          onClick={() => handleOpen(params.row as Court)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Xóa sân">
              <Delete />
            </Tooltip>
          }
          label="Xóa"
          onClick={() => handleDeleteClick(params.row as Court)}
          showInMenu
        />,
      ],
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Đang tải danh sách sân...
        </Typography>
      </Box>
    );
  }

  const activeCourts = courts?.filter((court) => court.isActive) || [];
  const inactiveCourts = courts?.filter((court) => !court.isActive) || [];

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
          >
            Quản lý sân cầu lông
          </Typography>
          {!isMobile && (
            <Typography variant="body1" color="text.secondary">
              Quản lý thông tin các sân cầu lông, giá cả và trạng thái hoạt động
            </Typography>
          )}
        </Box>
        {!isMobile && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            size="large"
          >
            Thêm sân mới
          </Button>
        )}
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1, // khoảng cách giữa icon và text
                  mb: 1,
                }}
              >
                <SportsTennis
                  sx={{
                    fontSize: { xs: 30, sm: 40 },
                    color: "primary.main",
                    mb: 1,
                  }}
                />
                <Typography variant="h4" fontWeight="bold">
                  {courts?.length || 0}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Tổng số sân
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1, // khoảng cách giữa icon và text
                  mb: 1,
                }}
              >
                <VideogameAsset
                  sx={{
                    fontSize: { xs: 30, sm: 40 },
                    color: "primary.main",
                    mb: 1,
                  }}
                />
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {activeCourts.length}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Hoạt động
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1, // khoảng cách giữa icon và text
                  mb: 1,
                }}
              >
                <VideogameAssetOff
                  sx={{
                    fontSize: { xs: 30, sm: 40 },
                    color: "primary.main",
                    mb: 1,
                  }}
                />
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {inactiveCourts.length}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Ngừng
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center", p: { xs: 2, sm: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1, // khoảng cách giữa icon và text
                  mb: 1,
                }}
              >
                <PriceChange
                  sx={{
                    fontSize: { xs: 30, sm: 40 },
                    color: "primary.main",
                    mb: 1,
                  }}
                />
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {activeCourts.length > 0
                    ? formatCurrency(
                        activeCourts.reduce(
                          (sum, court) => sum + court.pricePerHour,
                          0
                        ) / activeCourts.length
                      )
                    : formatCurrency(0)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Giá TB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Mobile Search and Filter */}
      {isMobile && (
        <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm kiếm sân..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchText && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchText("")}>
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <IconButton
            color="primary"
            onClick={() => setFilterDialogOpen(true)}
            sx={{ border: 1, borderColor: "divider" }}
          >
            <FilterList />
          </IconButton>
        </Box>
      )}

      {/* Mobile List View */}
      {isMobile ? (
        <Box>
          {filteredCourts.length === 0 ? (
            <Alert severity="info">Không tìm thấy sân nào</Alert>
          ) : (
            <List sx={{ bgcolor: "background.paper", borderRadius: 2 }}>
              {filteredCourts.map((court) => (
                <Card key={court.id} sx={{ mb: 1 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: court.isActive ? "primary.main" : "grey.400",
                        }}
                      >
                        <SportsTennis />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography variant="body2" fontWeight="medium">
                            {court.name}
                          </Typography>
                          <Chip
                            label={court.isActive ? "Hoạt động" : "Ngừng"}
                            color={court.isActive ? "success" : "default"}
                            size="small"
                            sx={{ height: 20 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            <LocationOn
                              sx={{
                                fontSize: 12,
                                mr: 0.5,
                                verticalAlign: "middle",
                              }}
                            />
                            {court.location}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                            }}
                          >
                            <Chip
                              label={formatCurrency(court.pricePerHour)}
                              color="success"
                              size="small"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatDate(court.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, court)}
                      >
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Card>
              ))}
            </List>
          )}
        </Box>
      ) : (
        /* Desktop DataGrid */
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Danh sách sân ({filteredCourts.length})
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

            <Box sx={{ height: 600, width: "100%" }}>
              <DataGrid
                rows={filteredCourts}
                columns={columns}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: {
                      debounceMs: 500,
                      placeholder: "Tìm kiếm sân...",
                    },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  "& .MuiDataGrid-cell": {
                    borderColor: "divider",
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "action.hover",
                    fontWeight: 600,
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* FAB (Mobile) */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add court"
          onClick={() => handleOpen()}
          sx={{ position: "fixed", bottom: 24, right: 24 }}
        >
          <Add />
        </Fab>
      )}

      {/* Mobile Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedCourt && handleView(selectedCourt)}>
          <Visibility sx={{ mr: 2 }} fontSize="small" />
          Xem chi tiết
        </MenuItem>
        <MenuItem onClick={() => selectedCourt && handleOpen(selectedCourt)}>
          <Edit sx={{ mr: 2 }} fontSize="small" />
          Sửa
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedCourt && handleDeleteClick(selectedCourt)}
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 2 }} fontSize="small" color="error" />
          Xóa
        </MenuItem>
      </Menu>

      {/* Mobile Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Bộ lọc</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              Trạng thái
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(e, newValue) => newValue && setStatusFilter(newValue)}
              fullWidth
              size="small"
            >
              <ToggleButton value="all">Tất cả</ToggleButton>
              <ToggleButton value="active">Hoạt động</ToggleButton>
              <ToggleButton value="inactive">Ngừng</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: "column", gap: 1 }}>
          <Button onClick={handleClearFilters} fullWidth>
            Xóa bộ lọc
          </Button>
          <Button
            onClick={() => setFilterDialogOpen(false)}
            variant="contained"
            fullWidth
          >
            Áp dụng
          </Button>
        </DialogActions>
      </Dialog>

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
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SportsTennis sx={{ mr: 1, color: "primary.main" }} />
              {editingCourt ? "Cập nhật thông tin sân" : "Thêm sân mới"}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Tên sân *"
                  placeholder="VD: Sân cầu lông ABC"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  InputProps={{
                    startAdornment: (
                      <SportsTennis sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="location"
                  label="Địa chỉ *"
                  placeholder="VD: 123 Đường ABC, Quận XYZ"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.location && Boolean(formik.errors.location)
                  }
                  helperText={formik.touched.location && formik.errors.location}
                  InputProps={{
                    startAdornment: (
                      <LocationOn sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="pricePerHour"
                  label="Giá theo giờ (VNĐ) *"
                  type="number"
                  value={formik.values.pricePerHour}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.pricePerHour &&
                    Boolean(formik.errors.pricePerHour)
                  }
                  helperText={
                    formik.touched.pricePerHour && formik.errors.pricePerHour
                  }
                  InputProps={{
                    startAdornment: (
                      <AttachMoney sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái *</InputLabel>
                  <Select
                    name="isActive"
                    value={formik.values.isActive ? "true" : "false"}
                    onChange={(event) => {
                      formik.setFieldValue(
                        "isActive",
                        event.target.value === "true"
                      );
                    }}
                    label="Trạng thái *"
                  >
                    <MenuItem value="true">Hoạt động</MenuItem>
                    <MenuItem value="false">Ngừng hoạt động</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Mô tả"
                  placeholder="Mô tả về sân, tiện ích..."
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={
                    formik.touched.description &&
                    Boolean(formik.errors.description)
                  }
                  helperText={
                    formik.touched.description && formik.errors.description
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions
            sx={{ p: 2, flexDirection: { xs: "column", sm: "row" }, gap: 1 }}
          >
            <Button onClick={handleClose} fullWidth={isMobile}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                createCourtMutation.isPending || updateCourtMutation.isPending
              }
              fullWidth={isMobile}
            >
              {createCourtMutation.isPending ||
              updateCourtMutation.isPending ? (
                <CircularProgress size={20} />
              ) : editingCourt ? (
                "Cập nhật"
              ) : (
                "Tạo mới"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SportsTennis sx={{ mr: 1, color: "primary.main" }} />
            Chi tiết sân
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingCourt && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {viewingCourt.name}
                  </Typography>
                  <Chip
                    label={viewingCourt.isActive ? "Hoạt động" : "Ngừng"}
                    color={viewingCourt.isActive ? "success" : "error"}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    <LocationOn
                      sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }}
                    />
                    Địa chỉ:
                  </Typography>
                  <Typography variant="body1">
                    {viewingCourt.location}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    <AttachMoney
                      sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }}
                    />
                    Giá:
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    color="success.main"
                  >
                    {formatCurrency(viewingCourt.pricePerHour)}/giờ
                  </Typography>
                </Grid>

                {viewingCourt.description && (
                  <Grid item xs={12}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      <Info
                        sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }}
                      />
                      Mô tả:
                    </Typography>
                    <Typography variant="body1">
                      {viewingCourt.description}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Ngày tạo:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(viewingCourt.createdAt)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Cập nhật:
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(viewingCourt.updatedAt)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{ p: 2, flexDirection: { xs: "column", sm: "row" }, gap: 1 }}
        >
          <Button onClick={() => setViewDialogOpen(false)} fullWidth={isMobile}>
            Đóng
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setViewDialogOpen(false);
              if (viewingCourt) {
                handleOpen(viewingCourt);
              }
            }}
            startIcon={<Edit />}
            fullWidth={isMobile}
          >
            Chỉnh sửa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Delete sx={{ mr: 1 }} />
            Xác nhận xóa sân
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hành động này không thể hoàn tác!
          </Alert>
          <Typography variant="body1">
            Bạn có chắc chắn muốn xóa sân{" "}
            <strong>"{courtToDelete?.name}"</strong>?
          </Typography>
          {courtToDelete && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "action.hover",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <strong>Địa chỉ:</strong> {courtToDelete.location}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Giá:</strong>{" "}
                {formatCurrency(courtToDelete.pricePerHour)}/giờ
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{ p: 2, flexDirection: { xs: "column", sm: "row" }, gap: 1 }}
        >
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            fullWidth={isMobile}
          >
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteCourtMutation.isPending}
            fullWidth={isMobile}
            startIcon={
              deleteCourtMutation.isPending ? (
                <CircularProgress size={16} />
              ) : (
                <Delete />
              )
            }
          >
            {deleteCourtMutation.isPending ? "Đang xóa..." : "Xóa sân"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Courts;
