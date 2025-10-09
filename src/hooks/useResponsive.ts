import { useTheme, useMediaQuery, Breakpoint } from '@mui/material';
import { getLocalStorageItem } from '../utils';

export const useResponsive = () => {
  const theme = useTheme();
  
  return {
    isMobile: useMediaQuery(theme.breakpoints.down('sm')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: useMediaQuery(theme.breakpoints.up('md')),
    isSmallScreen: useMediaQuery(theme.breakpoints.down('md')),
  };
};

export const checkDarkModeTheme = () => {
  return {
    isDarkMode: getLocalStorageItem('isDarkMode', true),
  }
}