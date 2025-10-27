import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
} from '@mui/material';
import { 
  Save, 
  Settings as SettingsIcon, 
  RestartAlt,
  Group as GroupIcon,
  Person,
  AutoFixHigh,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SessionsMigrationPanel from '../components/SessionsMigrationPanel';
import { getOrCreateSettings, resetSettings, updateSettings, useGroups, useMembers } from '../hooks';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUserLogin } from '../utils';

const appVersion = __APP_VERSION__;
const buildDate = new Date(__BUILD_DATE__).toLocaleString('vi-VN');

const skillLevels = ['Pot 5', 'Pot 4', 'Pot 3', 'Pot 2', 'Pot 1'];

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  // ✅ States cho Group Migration
  const [groupMigrationOpen, setGroupMigrationOpen] = useState(false);
  const [groupMigrationProgress, setGroupMigrationProgress] = useState(0);
  const [groupMigrationStatus, setGroupMigrationStatus] = useState('');
  const [isMigratingGroups, setIsMigratingGroups] = useState(false);

  // ✅ States cho Skill Level Reset
  const [skillResetOpen, setSkillResetOpen] = useState(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('');
  const [skillResetProgress, setSkillResetProgress] = useState(0);
  const [skillResetStatus, setSkillResetStatus] = useState('');
  const [isResettingSkills, setIsResettingSkills] = useState(false);

  const { data: groups } = useGroups();
  const { data: members } = useMembers();

  const validationSchema = Yup.object({
    defaultSessionDuration: Yup.number()
      .min(30, 'Thời lượng tối thiểu 30 phút')
      .max(480, 'Thời lượng tối đa 8 giờ')
      .required('Thời lượng mặc định là bắt buộc'),
    defaultMaxParticipants: Yup.number()
      .min(2, 'Tối thiểu 2 người')
      .max(60, 'Tối đa 60 người')
      .required('Số người tối đa là bắt buộc'),
    defaultShuttlecockCost: Yup.number()
      .min(0, 'Giá phải >= 0')
      .required('Giá cầu mặc định là bắt buộc'),
    isFixedBadmintonCost: Yup.boolean(),
    fixedBadmintonCost: Yup.number()
      .min(0, 'Giá phải >= 0')
      .when('isFixedBadmintonCost', {
        is: true,
        then: (schema) => schema.required('Giá cầu cố định là bắt buộc khi bật'),
      }),
    currency: Yup.string().required('Đơn vị tiền tệ là bắt buộc'),
    timezone: Yup.string().required('Múi giờ là bắt buộc'),
  });

  const formik = useFormik({
    initialValues: {
      defaultSessionDuration: 120,
      defaultMaxParticipants: 16,
      defaultShuttlecockCost: 25000,
      isFixedBadmintonCost: false,
      fixedBadmintonCost: 15000,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await updateSettings({
          ...values,
          isFixedBadmintonCost: Boolean(values.isFixedBadmintonCost),
          fixedBadmintonCost: values.isFixedBadmintonCost ? values.fixedBadmintonCost : null,
        });
        showSnackbar('Lưu cài đặt thành công!', 'success');
      } catch (error) {
        console.error('Save settings error:', error);
        showSnackbar('Có lỗi xảy ra khi lưu cài đặt!', 'error');
      } finally {
        setLoading(false);
      }
    },
  });

  // Load settings khi component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setInitialLoading(true);
    try {
      const settings = await getOrCreateSettings();
      formik.setValues({
        defaultSessionDuration: settings.defaultSessionDuration,
        defaultMaxParticipants: settings.defaultMaxParticipants,
        defaultShuttlecockCost: settings.defaultShuttlecockCost,
        isFixedBadmintonCost: Boolean(settings.isFixedBadmintonCost),
        fixedBadmintonCost: settings.fixedBadmintonCost || 15000,
        currency: settings.currency,
        timezone: settings.timezone,
      });
    } catch (error) {
      console.error('Load settings error:', error);
      showSnackbar('Không thể tải cài đặt từ máy chủ', 'error');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục cài đặt mặc định?')) {
      return;
    }

    setLoading(true);
    try {
      await resetSettings();
      await loadSettings();
      showSnackbar('Đã khôi phục cài đặt mặc định!', 'success');
    } catch (error) {
      console.error('Reset settings error:', error);
      showSnackbar('Có lỗi xảy ra khi reset cài đặt!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // ✅ Function: Migrate Groups (thêm createdBy)
  const handleMigrateGroups = async () => {
    if (!window.confirm('Bạn có chắc muốn migrate tất cả nhóm? Hành động này sẽ thêm field createdBy cho các nhóm chưa có.')) {
      return;
    }

    setIsMigratingGroups(true);
    setGroupMigrationProgress(0);
    setGroupMigrationStatus('Đang kiểm tra dữ liệu...');
    setGroupMigrationOpen(true);

    try {
      const currentUser = await getCurrentUserLogin();
      if (!currentUser) {
        throw new Error('Không tìm thấy thông tin user hiện tại');
      }

      const groupsRef = collection(db, 'groups');
      const snapshot = await getDocs(groupsRef);
      
      const groupsToMigrate = snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.createdBy; // Chỉ migrate nhóm chưa có createdBy
      });

      if (groupsToMigrate.length === 0) {
        setGroupMigrationStatus('✅ Tất cả nhóm đã có thông tin người tạo!');
        showSnackbar('Không có nhóm nào cần migrate', 'success');
        setTimeout(() => setGroupMigrationOpen(false), 2000);
        return;
      }

      setGroupMigrationStatus(`Đang migrate ${groupsToMigrate.length} nhóm...`);

      // Sử dụng batch để update nhiều documents
      const batchSize = 500; // Firestore batch limit
      let processed = 0;

      for (let i = 0; i < groupsToMigrate.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = groupsToMigrate.slice(i, i + batchSize);

        batchDocs.forEach(docSnap => {
          const groupRef = doc(db, 'groups', docSnap.id);
          batch.update(groupRef, {
            createdBy: currentUser.memberId,
            createdByName: currentUser.displayName || 'Admin',
            updatedAt: new Date(),
          });
        });

        await batch.commit();
        processed += batchDocs.length;
        
        const progress = Math.round((processed / groupsToMigrate.length) * 100);
        setGroupMigrationProgress(progress);
        setGroupMigrationStatus(`Đã migrate ${processed}/${groupsToMigrate.length} nhóm...`);
      }

      setGroupMigrationStatus(`✅ Hoàn thành! Đã migrate ${groupsToMigrate.length} nhóm.`);
      showSnackbar(`Đã migrate thành công ${groupsToMigrate.length} nhóm!`, 'success');
      
      setTimeout(() => {
        setGroupMigrationOpen(false);
        // Reload page để cập nhật dữ liệu
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Group migration error:', error);
      setGroupMigrationStatus(`❌ Lỗi: ${error.message}`);
      showSnackbar(`Lỗi khi migrate nhóm: ${error.message}`, 'error');
    } finally {
      setIsMigratingGroups(false);
    }
  };

  // ✅ Function: Reset Skill Levels
  const handleResetSkillLevels = async () => {
    if (!selectedSkillLevel) {
      showSnackbar('Vui lòng chọn Skill Level', 'error');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn đặt tất cả thành viên về "${selectedSkillLevel}"? Hành động này không thể hoàn tác!`)) {
      return;
    }

    setIsResettingSkills(true);
    setSkillResetProgress(0);
    setSkillResetStatus('Đang cập nhật skill levels...');

    try {
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);
      
      if (snapshot.empty) {
        showSnackbar('Không có thành viên nào để cập nhật', 'error');
        setIsResettingSkills(false);
        return;
      }

      const totalMembers = snapshot.docs.length;
      setSkillResetStatus(`Đang cập nhật ${totalMembers} thành viên...`);

      // Batch update
      const batchSize = 500;
      let processed = 0;

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach(docSnap => {
          const memberRef = doc(db, 'members', docSnap.id);
          batch.update(memberRef, {
            skillLevel: selectedSkillLevel,
            updatedAt: new Date(),
          });
        });

        await batch.commit();
        processed += batchDocs.length;
        
        const progress = Math.round((processed / totalMembers) * 100);
        setSkillResetProgress(progress);
        setSkillResetStatus(`Đã cập nhật ${processed}/${totalMembers} thành viên...`);
      }

      setSkillResetStatus(`✅ Hoàn thành! Đã đặt ${totalMembers} thành viên về ${selectedSkillLevel}.`);
      showSnackbar(`Đã cập nhật thành công ${totalMembers} thành viên!`, 'success');
      
      setTimeout(() => {
        setSkillResetOpen(false);
        setSelectedSkillLevel('');
        // Reload page để cập nhật dữ liệu
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Skill reset error:', error);
      setSkillResetStatus(`❌ Lỗi: ${error.message}`);
      showSnackbar(`Lỗi khi reset skill levels: ${error.message}`, 'error');
    } finally {
      setIsResettingSkills(false);
    }
  };

  if (initialLoading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={500} height={24} />
        </Box>
        <Card>
          <CardContent>
            <Skeleton variant="rectangular" height={400} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Cài đặt hệ thống
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Cấu hình các thông số mặc định cho hệ thống Quản Lý Lịch Đánh Cầu
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SessionsMigrationPanel />
      </Box>

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Session Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Cài đặt hệ thống
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultSessionDuration"
                      label="Thời lượng mặc định (phút)"
                      type="number"
                      value={formik.values.defaultSessionDuration}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.defaultSessionDuration &&
                        Boolean(formik.errors.defaultSessionDuration)
                      }
                      helperText={
                        formik.touched.defaultSessionDuration &&
                        formik.errors.defaultSessionDuration
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultMaxParticipants"
                      label="Số người tối đa mặc định"
                      type="number"
                      value={formik.values.defaultMaxParticipants}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.defaultMaxParticipants &&
                        Boolean(formik.errors.defaultMaxParticipants)
                      }
                      helperText={
                        formik.touched.defaultMaxParticipants &&
                        formik.errors.defaultMaxParticipants
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="defaultShuttlecockCost"
                      label="Giá cầu mặc định (VNĐ)"
                      type="number"
                      value={formik.values.defaultShuttlecockCost}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={
                        formik.touched.defaultShuttlecockCost &&
                        Boolean(formik.errors.defaultShuttlecockCost)
                      }
                      helperText={
                        formik.touched.defaultShuttlecockCost &&
                        formik.errors.defaultShuttlecockCost
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Đơn vị tiền tệ</InputLabel>
                      <Select
                        name="currency"
                        value={formik.values.currency}
                        onChange={formik.handleChange}
                        label="Đơn vị tiền tệ"
                      >
                        <MenuItem value="VND">Việt Nam Đồng (VNĐ)</MenuItem>
                        <MenuItem value="USD">US Dollar (USD)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Múi giờ</InputLabel>
                      <Select
                        name="timezone"
                        value={formik.values.timezone}
                        onChange={formik.handleChange}
                        label="Múi giờ"
                      >
                        <MenuItem value="Asia/Ho_Chi_Minh">
                          Việt Nam (GMT+7)
                        </MenuItem>
                        <MenuItem value="Asia/Bangkok">
                          Thailand (GMT+7)
                        </MenuItem>
                        <MenuItem value="Asia/Singapore">
                          Singapore (GMT+8)
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values.isFixedBadmintonCost}
                          onChange={(e) => {
                            formik.setFieldValue(
                              "isFixedBadmintonCost",
                              e.target.checked
                            );
                            if (e.target.checked) {
                              formik.setFieldTouched(
                                "fixedBadmintonCost",
                                true
                              );
                            }
                          }}
                          name="isFixedBadmintonCost"
                        />
                      }
                      label="Cố định giá cầu cho nữ"
                    />
                  </Grid>

                  {formik.values.isFixedBadmintonCost && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="fixedBadmintonCost"
                        label="Giá cầu cố định cho nữ (VNĐ)"
                        type="number"
                        value={formik.values.fixedBadmintonCost}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.fixedBadmintonCost &&
                          Boolean(formik.errors.fixedBadmintonCost)
                        }
                        helperText={
                          formik.touched.fixedBadmintonCost &&
                          formik.errors.fixedBadmintonCost
                        }
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Thông tin hệ thống
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phiên bản ứng dụng
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      v{appVersion}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Cập nhật cuối
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {buildDate}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Chế độ offline
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="500"
                      color="success.main"
                    >
                      Đã bật
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      PWA Support
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="500"
                      color="success.main"
                    >
                      Có hỗ trợ
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: 'wrap' }}
            >
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAlt />}
                onClick={handleReset}
                disabled={loading}
                size="large"
              >
                Khôi phục mặc định
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                size="large"
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Lưu cài đặt"
                )}
              </Button>
            </Box>
          </Grid>

          {/* ✅ Migration Tools */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  🛠️ Công cụ Migration & Quản lý
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Các công cụ hỗ trợ migration dữ liệu và quản lý hàng loạt
                </Typography>

                <Grid container spacing={2}>
                  {/* Groups Migration */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Migration Nhóm
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Thêm thông tin người tạo (createdBy) cho các nhóm cũ
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={<GroupIcon />}
                          onClick={handleMigrateGroups}
                          disabled={isMigratingGroups}
                          fullWidth
                        >
                          Migrate Groups
                        </Button>
                        {groups && (
                          <Chip 
                            label={`${groups.length} nhóm`} 
                            size="small" 
                            color="info"
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Skill Level Reset */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: 'warning.main' }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Reset Skill Levels
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Đặt lại Pot cho tất cả thành viên về cùng một mức
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<AutoFixHigh />}
                          onClick={() => setSkillResetOpen(true)}
                          disabled={isResettingSkills}
                          fullWidth
                        >
                          Reset Pot
                        </Button>
                        {members && (
                          <Chip 
                            label={`${members.length} TV`} 
                            size="small" 
                            color="warning"
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ⚠️ <strong>Lưu ý:</strong> Các thao tác migration và reset sẽ ảnh hưởng đến toàn bộ dữ liệu. 
                    Hãy chắc chắn bạn hiểu rõ trước khi thực hiện.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>

      {/* ✅ Group Migration Dialog */}
      <Dialog 
        open={groupMigrationOpen} 
        onClose={() => !isMigratingGroups && setGroupMigrationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
            Migration Nhóm
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              {groupMigrationStatus}
            </Typography>
            {isMigratingGroups && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={groupMigrationProgress} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {groupMigrationProgress}% hoàn thành
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setGroupMigrationOpen(false)}
            disabled={isMigratingGroups}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Skill Level Reset Dialog */}
      <Dialog 
        open={skillResetOpen} 
        onClose={() => !isResettingSkills && setSkillResetOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoFixHigh sx={{ mr: 1, color: 'warning.main' }} />
            Reset Skill Levels
          </Box>
        </DialogTitle>
        <DialogContent>
          {!isResettingSkills ? (
            <>
              <Alert severity="warning" sx={{ mb: 3, mt: 2 }}>
                <Typography variant="body2">
                  <strong>⚠️ Cảnh báo:</strong> Hành động này sẽ đặt lại Pot của <strong>TẤT CẢ</strong> thành viên về cùng một mức. 
                  Không thể hoàn tác!
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chọn Skill Level</InputLabel>
                <Select
                  value={selectedSkillLevel}
                  onChange={(e) => setSelectedSkillLevel(e.target.value)}
                  label="Chọn Skill Level"
                >
                  {skillLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {members && (
                <Alert severity="info">
                  <Typography variant="body2">
                    Sẽ cập nhật <strong>{members.length} thành viên</strong> về Pot đã chọn
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" gutterBottom>
                {skillResetStatus}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={skillResetProgress} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {skillResetProgress}% hoàn thành
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setSkillResetOpen(false);
              setSelectedSkillLevel('');
            }}
            disabled={isResettingSkills}
          >
            Hủy
          </Button>
          {!isResettingSkills && (
            <Button
              onClick={handleResetSkillLevels}
              variant="contained"
              color="warning"
              disabled={!selectedSkillLevel}
              startIcon={<AutoFixHigh />}
            >
              Xác nhận Reset
            </Button>
          )}
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
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;