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
  Tabs,
  Tab,
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
  Map as MapIcon,
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
import MapDisplay from "../components/MapDisplay";
import GMapDisplay from "../components/GMapDislay";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`court-tabpanel-${index}`}
      aria-labelledby={`court-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

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
  const [tabValue, setTabValue] = useState(0);
  const [viewTabValue, setViewTabValue] = useState(0);
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
    setTabValue(0); // Reset to first tab
    setOpen(true);
    handleMenuClose();
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCourt(null);
    formik.resetForm();
    setTabValue(0);
  };

  const handleView = (court: Court) => {
    setViewingCourt(court);
    setViewDialogOpen(true);
    setViewTabValue(0); // Reset to first tab
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
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <LocationOn
            fontSize="small"
            sx={{ mr: 1, color: "text.secondary" }}
          />
          <Typography variant="body2" color="text.secondary">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "pricePerHour",
      headerName: "Giá/giờ",
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium" color="success.main">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: "isActive",
      headerName: "Trạng thái",
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Hoạt động" : "Ngừng"}
          color={params.value ? "success" : "error"}
          size="small"
          icon={params.value ? <VideogameAsset /> : <VideogameAssetOff />}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Thao tác",
      width: 100,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="Xem"
          onClick={() => handleView(params.row as Court)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<Edit />}
          label="Sửa"
          onClick={() => handleOpen(params.row as Court)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Xóa"
          onClick={() => handleDeleteClick(params.row as Court)}
          showInMenu={false}
        />,
      ],
    },
  ];

  // Mobile view
  const renderMobileView = () => (
    <List sx={{ width: "100%" }}>
      {filteredCourts.map((court) => (
        <React.Fragment key={court.id}>
          <ListItem
            alignItems="flex-start"
            sx={{
              bgcolor: "background.paper",
              mb: 1,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <SportsTennis />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Typography variant="subtitle1" fontWeight="medium">
                    {court.name}
                  </Typography>
                  <Chip
                    label={court.isActive ? "Hoạt động" : "Ngừng"}
                    color={court.isActive ? "success" : "error"}
                    size="small"
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    <LocationOn
                      sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }}
                    />
                    {court.location}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    color="success.main"
                  >
                    <AttachMoney
                      sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }}
                    />
                    {formatCurrency(court.pricePerHour)}/giờ
                  </Typography>
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
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            <SportsTennis sx={{ mr: 1, verticalAlign: "middle" }} />
            Quản lý Sân
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý thông tin các sân cầu lông
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilterDialogOpen(true)}
          >
            Lọc
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            Xuất CSV
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Tìm kiếm theo tên hoặc địa chỉ sân..."
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
                  <Close />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter Chips */}
      {(searchText || statusFilter !== "all") && (
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {searchText && (
            <Chip
              label={`Tìm kiếm: "${searchText}"`}
              onDelete={() => setSearchText("")}
              size="small"
            />
          )}
          {statusFilter !== "all" && (
            <Chip
              label={`Trạng thái: ${
                statusFilter === "active" ? "Hoạt động" : "Ngừng hoạt động"
              }`}
              onDelete={() => setStatusFilter("all")}
              size="small"
            />
          )}
          <Chip
            label="Xóa tất cả bộ lọc"
            onClick={handleClearFilters}
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {/* Data Grid or Mobile List */}
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : isMobile ? (
        renderMobileView()
      ) : (
        <Card sx={{ boxShadow: 3 }}>
          <DataGrid
            rows={filteredCourts}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            checkboxSelection
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            autoHeight
            sx={{
              "& .MuiDataGrid-row:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          />
        </Card>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
        onClick={() => handleOpen()}
      >
        <Add />
      </Fab>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedCourt && handleView(selectedCourt)}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          Xem chi tiết
        </MenuItem>
        <MenuItem onClick={() => selectedCourt && handleOpen(selectedCourt)}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Chỉnh sửa
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedCourt && handleDeleteClick(selectedCourt)}
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Xóa
        </MenuItem>
      </Menu>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Bộ lọc</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={statusFilter}
                label="Trạng thái"
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                }
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Ngừng hoạt động</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Đóng</Button>
          <Button onClick={handleClearFilters} variant="outlined">
            Xóa bộ lọc
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog with Tabs */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SportsTennis sx={{ mr: 1, color: "primary.main" }} />
              {editingCourt ? "Chỉnh sửa sân" : "Thêm sân mới"}
            </Box>
          </DialogTitle>
          
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Thông tin" icon={<Info />} iconPosition="start" />
              <Tab label="Bản đồ" icon={<MapIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          <DialogContent>
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="name"
                    label="Tên sân"
                    placeholder="Ví dụ: Sân A1, Sân VIP..."
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={formik.touched.name && formik.errors.name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SportsTennis />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="location"
                    label="Địa chỉ"
                    placeholder="Nhập địa chỉ đầy đủ của sân"
                    value={formik.values.location}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.location && Boolean(formik.errors.location)
                    }
                    helperText={formik.touched.location && formik.errors.location}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="pricePerHour"
                    label="Giá theo giờ"
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
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">VNĐ</InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      name="isActive"
                      value={String(formik.values.isActive)}
                      label="Trạng thái"
                      onChange={(e) =>
                        formik.setFieldValue(
                          "isActive",
                          e.target.value === "true"
                        )
                      }
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
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Bản đồ sẽ hiển thị vị trí dựa trên địa chỉ bạn nhập. 
                    {!formik.values.location && " Vui lòng nhập địa chỉ ở tab Thông tin."}
                  </Typography>
                </Alert>
              </Box>
              <GMapDisplay 
                address={formik.values.location}
                height={isMobile ? 300 : 400}
                zoom={16}
              />
            </TabPanel>
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

      {/* View Dialog with Tabs */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SportsTennis sx={{ mr: 1, color: "primary.main" }} />
            Chi tiết sân
          </Box>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
          <Tabs value={viewTabValue} onChange={(e, v) => setViewTabValue(v)}>
            <Tab label="Thông tin" icon={<Info />} iconPosition="start" />
            <Tab label="Bản đồ" icon={<MapIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <DialogContent>
          {viewingCourt && (
            <>
              <TabPanel value={viewTabValue} index={0}>
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
              </TabPanel>

              <TabPanel value={viewTabValue} index={1}>
                <GMapDisplay 
                  address={viewingCourt.location}
                  height={isMobile ? 300 : 400}
                  zoom={16}
                />
              </TabPanel>
            </>
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