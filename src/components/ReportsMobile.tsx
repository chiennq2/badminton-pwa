import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Collapse,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  ExpandMore,
  FilterList,
  Assessment,
  Analytics,
  Stadium,
  MonetizationOn,
  People,
  Percent,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useSessions, useMembers, useCourts } from "../hooks";
import { useAuth } from "../contexts/AuthContext";
import dayjs from "dayjs";
import { formatCurrency, formatDate } from "../utils";

const ReportsMobile: React.FC = () => {
  // ✅ TẤT CẢ HOOKS PHẢI Ở ĐẦU COMPONENT
  const { currentUser } = useAuth();
  const { data: sessions, isLoading } = useSessions();
  const { data: members } = useMembers();
  const { data: courts } = useCourts();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: dayjs().subtract(30, "day").toDate(),
    endDate: new Date(),
    courtId: "",
  });

  // ✅ Lọc sessions - luôn gọi useMemo
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      const d = new Date(s.date);
      return (
        d >= filters.startDate &&
        d <= filters.endDate &&
        (!filters.courtId || s.courtId === filters.courtId)
      );
    });
  }, [sessions, filters]);

  // ✅ Thống kê cơ bản - luôn gọi useMemo
  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalRevenue = filteredSessions.reduce(
      (sum, s) => sum + (s.totalCost || 0),
      0
    );
    const avgPerSession = totalSessions ? totalRevenue / totalSessions : 0;

    // Court usage counts
    const courtUsageMap: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      courtUsageMap[s.courtId] = (courtUsageMap[s.courtId] || 0) + 1;
    });
    const courtUsageList = Object.entries(courtUsageMap).map(
      ([courtId, count]) => {
        const court = courts?.find((c) => c.id === courtId);
        return { courtId, name: court?.name || "Không rõ", count };
      }
    ).sort((a,b) => b.count - a.count);

    // Monthly revenue
    const monthlyRevenue: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      const key = dayjs(s.date).format("MM/YYYY");
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (s.totalCost || 0);
    });
    const revenueList = Object.entries(monthlyRevenue)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => {
        const aDate = dayjs(a.month, "MM/YYYY").toDate();
        const bDate = dayjs(b.month, "MM/YYYY").toDate();
        return aDate.getTime() - bDate.getTime();
      });

    // Top 5 active members (count only present members)
    const memberCount: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      (s.members || [])
        .filter((m: any) => m.isPresent)
        .forEach((m: any) => {
          memberCount[m.memberId] = (memberCount[m.memberId] || 0) + 1;
        });
    });
    const topMembers = Object.entries(memberCount)
      .map(([memberId, count]) => {
        const mem = members?.find((m) => m.id === memberId);
        return {
          memberId,
          memberName: mem?.name || "Không rõ",
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions,
      totalRevenue,
      avgPerSession,
      courtUsageList,
      revenueList,
      topMembers,
    };
  }, [filteredSessions, courts, members]);

  // ✅ SAU KHI GỌI TẤT CẢ HOOKS, MỚI KIỂM TRA LOADING/EMPTY
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Đang tải báo cáo...
        </Typography>
      </Box>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Báo cáo & Thống kê
        </Typography>
        <Alert severity="info">
          Chưa có lịch đánh nào trong hệ thống. Hãy tạo lịch đầu tiên!
        </Alert>
      </Box>
    );
  }

  const COLORS = ["#4caf50", "#ff9800", "#2196f3", "#9c27b0", "#f44336"];

  // Helper for avatar initials
  const initials = (name?: string) =>
    (name || "")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <Box sx={{ px: 2, pb: 8 }}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
          Báo cáo & Thống kê
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tổng hợp hoạt động & chi phí của các lịch đánh
        </Typography>
      </motion.div>

      {/* Bộ lọc */}
      <Card sx={{ mb: 2, borderRadius: 3, boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FilterList sx={{ mr: 1, color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Bộ lọc
              </Typography>
            </Box>
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <ExpandMore
                sx={{
                  transform: showFilters ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "0.3s",
                }}
              />
            </IconButton>
          </Box>

          <Collapse in={showFilters}>
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Từ ngày"
                type="date"
                size="small"
                value={dayjs(filters.startDate).format("YYYY-MM-DD")}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, startDate: new Date(e.target.value) }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Đến ngày"
                type="date"
                size="small"
                value={dayjs(filters.endDate).format("YYYY-MM-DD")}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, endDate: new Date(e.target.value) }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Sân</InputLabel>
                <Select
                  value={filters.courtId}
                  onChange={(e) => setFilters((f) => ({ ...f, courtId: e.target.value }))}
                  label="Sân"
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {courts?.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Thống kê tổng quan */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              {
                label: "Tổng số lịch",
                value: stats.totalSessions,
                icon: <Assessment color="primary" />,
              },
              {
                label: "Tổng chi phí",
                value: formatCurrency(stats.totalRevenue),
                icon: <MonetizationOn color="success" />,
              },
              {
                label: "Trung bình/lịch",
                value: formatCurrency(stats.avgPerSession),
                icon: <Analytics color="info" />,
              },
              {
                label: "Sân được sử dụng",
                value: stats.courtUsageList.length,
                icon: <Stadium color="warning" />,
              },
            ].map((item) => (
              <Card key={item.label} sx={{ borderRadius: 3, boxShadow: 3 }}>
                <CardContent sx={{ display: "flex", alignItems: "center" }}>
                  {item.icon}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {item.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </motion.div>
      </AnimatePresence>

      {/* Biểu đồ chi phí + Pie Thống kê sử dụng sân */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card sx={{ mt: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chi phí theo tháng
            </Typography>
            {stats.revenueList.length > 0 ? (
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueList}>
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                    <ReTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total" fill="#4caf50" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" align="center" color="text.secondary">
                Không có dữ liệu
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mt: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tỷ lệ & Thống kê sử dụng sân
            </Typography>

            {stats.courtUsageList.length > 0 ? (
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexDirection: "column" }}>
                <Box sx={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.courtUsageList.map(c => ({ name: c.name, value: c.count }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {stats.courtUsageList.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                {/* Detailed list */}
                <Box sx={{ width: "100%" }}>
                  {stats.courtUsageList.map((c, idx) => {
                    const total = stats.courtUsageList.reduce((s, it) => s + it.count, 0);
                    const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                    return (
                      <Box key={c.courtId} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
                        <Box>
                          <Typography variant="body2">{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.count} lượt • {pct}%
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">{c.count}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" align="center" color="text.secondary">
                Không có dữ liệu
              </Typography>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* TOP 5 thành viên tích cực */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card sx={{ mt: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Top 5 thành viên tích cực</Typography>
              <Typography variant="caption" color="text.secondary">
                (Theo số lần có mặt)
              </Typography>
            </Box>

            {stats.topMembers.length > 0 ? (
              <List dense>
                {stats.topMembers.map((m, idx) => (
                  <React.Fragment key={m.memberId}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: (theme) => theme.palette.primary.main }}>
                          {initials(m.memberName)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: "600" }}>
                            {idx + 1}. {m.memberName}
                          </Typography>
                        }
                        secondary={<Typography variant="caption" color="text.secondary">{m.count} lần</Typography>}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {m.count}
                      </Typography>
                    </ListItem>
                    {idx < stats.topMembers.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Không có thành viên nào có mặt trong khoảng thời gian lọc
              </Typography>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default ReportsMobile;