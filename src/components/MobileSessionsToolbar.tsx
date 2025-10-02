import React from 'react';
import {
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { useResponsive } from '../hooks/useResponsive';

interface MobileSessionsToolbarProps {
  csvFileName?: string;
}

const MobileSessionsToolbar: React.FC<MobileSessionsToolbarProps> = ({
  csvFileName = `danh-sach-lich-${new Date().toISOString().split('T')[0]}`,
}) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    // ✅ MOBILE: Layout tối ưu - chỉ search và export
    return (
      <GridToolbarContainer
        sx={{
          p: 1,
          gap: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        {/* Search Box - chiếm phần lớn không gian */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <GridToolbarQuickFilter
            placeholder="Tìm kiếm..."
            debounceMs={500}
            sx={{
              width: '100%',
              '& .MuiInput-root': {
                fontSize: '0.875rem',
                '&:before': {
                  borderBottomColor: 'divider',
                },
              },
              '& .MuiInputBase-input': {
                padding: '6px 0',
              },
            }}
          />
        </Box>

        {/* Export Button - Icon only */}
        <GridToolbarExport
          csvOptions={{
            fileName: csvFileName,
          }}
          printOptions={{
            disableToolbarButton: true, // Ẩn print button
          }}
          slotProps={{
            button: {
              size: 'small',
              sx: {
                minWidth: 'auto',
                padding: '6px',
                '& .MuiButton-startIcon': {
                  margin: 0,
                },
                // Ẩn text, chỉ hiện icon
                '& .MuiButton-startIcon ~ *': {
                  display: 'none',
                },
              },
            },
          }}
        />
      </GridToolbarContainer>
    );
  }

  // ✅ DESKTOP: Full toolbar với tất cả tính năng
  return (
    <GridToolbarContainer
      sx={{
        p: 2,
        gap: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left side - Search */}
      <Box sx={{ flex: 1, maxWidth: '400px' }}>
        <GridToolbarQuickFilter
          placeholder="Tìm kiếm..."
          debounceMs={500}
          sx={{
            width: '100%',
          }}
        />
      </Box>

      {/* Right side - Action buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport
          csvOptions={{
            fileName: csvFileName,
          }}
        />
      </Box>
    </GridToolbarContainer>
  );
};

export default MobileSessionsToolbar;