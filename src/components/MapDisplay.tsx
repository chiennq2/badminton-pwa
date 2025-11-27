import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import { MyLocation, OpenInNew } from "@mui/icons-material";

interface MapDisplayProps {
  address: string;
  height?: string | number;
  zoom?: number;
  showControls?: boolean;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  address,
  height = 400,
  zoom = 15,
  showControls = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Geocode address to coordinates using OpenStreetMap Nominatim API
  const geocodeAddress = async (addr: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Clean and format address for better results
      const formattedAddress = addr.trim();
      
      // Use Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          formattedAddress
        )}&limit=1&countrycodes=vn`,
        {
          headers: {
            "User-Agent": "CourtManagementApp/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Không thể tìm kiếm địa chỉ");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoordinates({ lat, lng });
        setError(null);
      } else {
        setError("Không tìm thấy địa chỉ trên bản đồ");
      }
    } catch (err: any) {
      console.error("Geocoding error:", err);
      setError("Có lỗi khi tải bản đồ. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!coordinates || !mapRef.current) return;

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      try {
        // Check if Leaflet is already loaded
        if (!(window as any).L) {
          // Load Leaflet CSS
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);

          // Load Leaflet JS
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const L = (window as any).L;

        // Remove existing map instance if it exists
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Clear the container
        if (mapRef.current) {
          mapRef.current.innerHTML = "";
        }

        // Wait a tick to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 0));

        // Create map
        const map = L.map(mapRef.current, {
          zoomControl: showControls,
          attributionControl: !isMobile,
        }).setView([coordinates.lat, coordinates.lng], zoom);

        // Store map instance
        mapInstanceRef.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Custom marker icon
        const customIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${theme.palette.error.main};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                color: white;
                font-size: 18px;
                margin-top: -2px;
                margin-left: -1px;
              ">📍</div>
            </div>
          `,
          className: "custom-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        // Add marker
        const marker = L.marker([coordinates.lat, coordinates.lng], {
          icon: customIcon,
        }).addTo(map);

        // Add popup with address
        marker.bindPopup(`
          <div style="padding: 8px; min-width: 200px;">
            <strong style="display: block; margin-bottom: 8px; color: ${theme.palette.primary.main};">
              📍 Vị trí sân
            </strong>
            <p style="margin: 0; font-size: 14px; line-height: 1.5;">
              ${address}
            </p>
          </div>
        `);

        // Open popup automatically on mobile
        if (isMobile) {
          marker.openPopup();
        }

        // Adjust map size after load
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (err) {
        console.error("Error loading map:", err);
        setError("Không thể tải bản đồ");
      }
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (err) {
          console.error("Error cleaning up map:", err);
        }
      }
    };
  }, [coordinates, address, zoom, showControls, isMobile, theme]);

  // Geocode when address changes
  useEffect(() => {
    if (address && address.trim()) {
      geocodeAddress(address);
    }
  }, [address]);

  // Open in Google Maps
  const openInGoogleMaps = () => {
    if (coordinates) {
      const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
      window.open(url, "_blank");
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`;
      window.open(url, "_blank");
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Không thể lấy vị trí hiện tại");
        }
      );
    } else {
      setError("Trình duyệt không hỗ trợ định vị");
    }
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

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {/* Map Container */}
      <Paper
        elevation={2}
        sx={{
          height,
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              zIndex: 1000,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Đang tải bản đồ...
            </Typography>
          </Box>
        )}

        {error && !isLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              p: 3,
            }}
          >
            <Alert severity="warning" sx={{ maxWidth: 400 }}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Map element */}
        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: "100%",
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        />

        {/* Controls Overlay */}
        {showControls && coordinates && !isLoading && !error && (
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

            <IconButton
              onClick={getCurrentLocation}
              size={isMobile ? "small" : "medium"}
              sx={{
                bgcolor: "background.paper",
                boxShadow: 2,
                "&:hover": {
                  bgcolor: "background.paper",
                  boxShadow: 4,
                },
              }}
              title="Vị trí của tôi"
            >
              <MyLocation fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
        )}
      </Paper>

      {/* Address Info */}
      {coordinates && !isLoading && !error && (
        <Box
          sx={{
            mt: 1,
            px: 1,
            py: 0.5,
            bgcolor: "action.hover",
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            Tọa độ: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MapDisplay;
