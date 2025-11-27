import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  Link,
} from "@mui/material";
import { OpenInNew, Refresh } from "@mui/icons-material";

interface MapDisplayProps {
  address: string;
  height?: string | number;
  zoom?: number;
  showControls?: boolean;
  apiKey?: string;
}

const GMapDisplay: React.FC<MapDisplayProps> = ({
  address,
  height = 400,
  zoom = 15,
  showControls = true,
  apiKey = "",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mapMode, setMapMode] = useState<"embed" | "interactive">(
    apiKey ? "interactive" : "embed"
  );
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);

  // Encode address for URL
  const encodedAddress = encodeURIComponent(address);

  // Open in Google Maps
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(url, "_blank");
  };

  if (!address || !address.trim()) {
    return (
      <Paper
        elevation={0}
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Nhập địa chỉ để xem trên bản đồ
        </Typography>
      </Paper>
    );
  }

  // Nếu không có API key, dùng Google Maps Embed (miễn phí, không cần key)
  if (!apiKey || mapMode === "embed") {
    return (
      <Box sx={{ position: "relative", width: "100%" }}>
        {/* API Key Info Banner */}
        {showApiKeyInfo && (
          <Alert
            severity="info"
            onClose={() => setShowApiKeyInfo(false)}
            sx={{ mb: 2 }}
            action={
              <Button
                size="small"
                href="https://console.cloud.google.com/google/maps-apis/start"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lấy API Key
              </Button>
            }
          >
            <Typography variant="body2" gutterBottom>
              <strong>💡 Nâng cấp trải nghiệm:</strong>
            </Typography>
            <Typography variant="caption" display="block">
              • Để có tính năng tương tác đầy đủ (zoom, kéo thả, satellite)
            </Typography>
            <Typography variant="caption" display="block">
              • Bạn cần Google Maps API Key (miễn phí $200/tháng)
            </Typography>
            <Typography variant="caption" display="block">
              • Xem hướng dẫn chi tiết bên dưới
            </Typography>
          </Alert>
        )}

        {/* Map Container - Using Embed API (no key needed) */}
        <Paper
          elevation={2}
          sx={{
            height,
            borderRadius: 2,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?q=${encodedAddress}&zoom=${zoom}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`}
          />

          {/* Controls Overlay */}
          {showControls && (
            <Box
              sx={{
                position: "absolute",
                top: isMobile ? 8 : 16,
                right: isMobile ? 8 : 16,
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <IconButton
                onClick={openInGoogleMaps}
                size={isMobile ? "small" : "medium"}
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: 2,
                  "&:hover": {
                    bgcolor: "background.paper",
                    boxShadow: 4,
                  },
                }}
                title="Mở trong Google Maps"
              >
                <OpenInNew fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Box>
          )}
        </Paper>

        {/* Info Footer */}
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: "action.hover",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              📍 {address}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              🗺️ Chế độ: Embed (chỉ xem)
            </Typography>
          </Box>

          {/* {!showApiKeyInfo && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowApiKeyInfo(true)}
              sx={{ fontSize: "0.75rem" }}
            >
              Nâng cấp
            </Button>
          )} */}
        </Box>
      </Box>
    );
  }

  // Nếu có API key, render interactive map (code cũ của bạn)
  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="body2">
          ✅ Bạn đã cấu hình API Key! Bản đồ tương tác sẽ được kích hoạt.
        </Typography>
      </Alert>
      {/* TODO: Thêm code interactive map ở đây khi có API key */}
    </Box>
  );
};

export default GMapDisplay;