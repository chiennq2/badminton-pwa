import React, { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { KeyboardArrowDown as ArrowIcon } from '@mui/icons-material';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number; // 0-1
  isRefreshing: boolean;
}

const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isPulling,
  pullProgress,
  isRefreshing,
}) => {
  const isReleaseToRefresh = pullProgress >= 1;

  // Tính toán height động
  const indicatorHeight = useMemo(() => {
    if (isRefreshing) return 70;
    return Math.max(0, pullProgress * 120);
  }, [pullProgress, isRefreshing]);

  // Background color chuyển từ blue sang red khi đạt threshold
  const bgColor = useMemo(() => {
    if (isRefreshing) return '#1976d2';
    if (isReleaseToRefresh) return '#d32f2f';
    return '#1976d2';
  }, [isReleaseToRefresh, isRefreshing]);

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          height: `${indicatorHeight}px`,
          backgroundColor: bgColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          overflow: 'hidden',
          boxShadow: indicatorHeight > 20 ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          transition: !isPulling && !isRefreshing ? 'all 0.3s ease-out' : 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            paddingBottom: 2,
            minHeight: '100%',
          }}
        >
          {isRefreshing ? (
            <>
              <CircularProgress
                size={32}
                sx={{
                  color: 'white',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Đang cập nhật...
              </Typography>
            </>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transition: 'background-color 0.3s ease',
                  ...(isReleaseToRefresh && {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }),
                }}
              >
                <ArrowIcon
                  sx={{
                    fontSize: 32,
                    color: 'white',
                    transform: `rotate(${Math.min(pullProgress * 180, 180)}deg) scaleY(${Math.min(
                      pullProgress,
                      1
                    )})`,
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out',
                    opacity: pullProgress,
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'opacity 0.3s ease',
                  opacity: pullProgress,
                }}
              >
                {isReleaseToRefresh ? '🎯 Thả để cập nhật' : '👇 Kéo để cập nhật'}
              </Typography>

              {/* Progress indicator */}
              <Box
                sx={{
                  width: 4,
                  height: Math.max(4, pullProgress * 24),
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderRadius: 2,
                  transition: isPulling ? 'none' : 'height 0.3s ease-out',
                  marginTop: 0.5,
                }}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Spacer để tránh content bị che */}
      {(isPulling || isRefreshing) && (
        <Box sx={{ height: `${indicatorHeight}px` }} />
      )}
    </>
  );
};

export default PullToRefreshIndicator;