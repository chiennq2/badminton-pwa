import { Session, SessionExpense, Settlement } from '../types';
import { toPng } from 'html-to-image';

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Format date
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Format date time
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Format time
export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};

// Calculate session duration in hours
export const calculateSessionDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

// Calculate total session cost
export const calculateSessionCost = (
  expenses: SessionExpense[],
  courtPricePerHour: number,
  duration: number
): number => {
  const courtCost = courtPricePerHour * duration;
  const otherCosts = expenses.reduce((total, expense) => total + expense.amount, 0);
  return courtCost + otherCosts;
};

// Calculate cost per person
export const calculateCostPerPerson = (totalCost: number, participantCount: number): number => {
  return participantCount > 0 ? totalCost / participantCount : 0;
};

// Generate settlements
export const generateSettlements = (
  session: Session,
  members: { id: string; name: string }[]
): Settlement[] => {
  const presentMembers = session.members.filter(m => m.isPresent);
  const costPerPerson = calculateCostPerPerson(session.totalCost, presentMembers.length);
  
  return presentMembers.map(sessionMember => {
    const member = members.find(m => m.id === sessionMember.memberId);
    return {
      memberId: sessionMember.memberId,
      memberName: member?.name || 'Unknown',
      amount: costPerPerson,
      isPaid: false,
    };
  });
};

// Export session image
export const exportSessionImage = async (elementId: string, filename: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  try {
    const dataUrl = await toPng(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting image:', error);
    throw error;
  }
};

// Export to CSV
export const exportToCsv = (data: any[], filename: string): void => {
  const csvContent = convertArrayToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const convertArrayToCsv = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      
      // Handle dates
      if (value instanceof Date) {
        return formatDateTime(value);
      }
      
      // Handle strings with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value.toString();
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[(]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Session status helpers
export const getSessionStatusColor = (status: Session['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case 'scheduled':
      return 'primary';
    case 'ongoing':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

export const getSessionStatusText = (status: Session['status']): string => {
  switch (status) {
    case 'scheduled':
      return 'Đã lên lịch';
    case 'ongoing':
      return 'Đang diễn ra';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Không xác định';
  }
};

// Date helpers
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isFuture = (date: Date): boolean => {
  const now = new Date();
  return date > now;
};

export const isPast = (date: Date): boolean => {
  const now = new Date();
  return date < now;
};

// Local storage helpers (fallback for offline)
export const getLocalStorageItem = (key: string, defaultValue: any = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const setLocalStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

// Generate random ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
