import { Session, SessionExpense, Settlement } from '../types';
import { toPng } from 'html-to-image';
import { formatDateOnly } from './dateUtils';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const convertFirestoreTimestamp = (data: any): any => {
  if (!data) return data;

  // Nếu là Timestamp object của Firestore
  if (data && typeof data === 'object' && 'toDate' in data && typeof data.toDate === 'function') {
    return data.toDate();
  }

  // Nếu là object có seconds (Firestore Timestamp format)
  if (data && typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
    return new Date(data.seconds * 1000);
  }

  // Nếu là Date object
  if (data instanceof Date) {
    return data;
  }

  // Nếu là object, convert recursively
  if (typeof data === 'object' && !Array.isArray(data)) {
    const converted: any = {};
    Object.keys(data).forEach(key => {
      converted[key] = convertFirestoreTimestamp(data[key]);
    });
    return converted;
  }

  // Nếu là array
  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreTimestamp(item));
  }

  // Trả về như cũ nếu không phải các type trên
  return data;
};

export const formatDate = (date: any): string => {
  return formatDateOnly(date);
};

// ===== FORMAT DATETIME - AN TOÀN HỠN =====
export const formatDateTime = (date: any): string => {
  if (!date) return 'N/A';

  try {
    let dateObj: Date;

    // Xử lý Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    else if (date instanceof Date) {
      dateObj = date;
    }
    else if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    }
    else {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid datetime:', date);
      return 'Thời gian không hợp lệ';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Lỗi định dạng thời gian';
  }
};

// ===== CONVERT FIRESTORE TIMESTAMP TO DATE OBJECT =====
export const convertTimestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;

  try {
    // Firestore Timestamp với toDate()
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
      return timestamp.toDate();
    }

    // Object có seconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }

    // Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // String hoặc number
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

// ===== SAFE DATE FOR DATEPICKER =====
// Trả về Date object an toàn cho DatePicker, tránh lỗi "Invalid Date"
export const getSafeDateForPicker = (date: any): Date | null => {
  const convertedDate = convertTimestampToDate(date);

  // Nếu không có date hoặc không hợp lệ, trả về ngày hiện tại
  if (!convertedDate || isNaN(convertedDate.getTime())) {
    console.warn('Invalid date for picker, using current date:', date);
    return new Date(); // Fallback to today
  }

  return convertedDate;
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

// Calculate cost per person for base costs (court + shuttlecock)
export const calculateBaseCostPerPerson = (
  courtCost: number,
  shuttlecockCost: number,
  presentMemberCount: number
): number => {
  return presentMemberCount > 0 ? (courtCost + shuttlecockCost) / presentMemberCount : 0;
};

// Generate detailed settlements with new logic
// utils/index.ts - Logic chia tiền chi tiết
// export const generateDetailedSettlements = (
//   session: Session,
//   members: { id: string; name: string }[]
// ): Settlement[] => {
//   // Lấy danh sách thành viên có mặt (đã điểm danh)
//   const presentMembers = session.members.filter(m => m.isPresent);

//   if (presentMembers.length === 0) {
//     return [];
//   }

//   // Phân loại chi phí
//   const courtExpense = session.expenses.find(exp => exp.type === 'court');
//   const shuttlecockExpense = session.expenses.find(exp => exp.type === 'shuttlecock');
//   const additionalExpenses = session.expenses.filter(exp => exp.type === 'other');

//   const courtCost = courtExpense?.amount || 0;
//   const shuttlecockCost = shuttlecockExpense?.amount || 0;

//   // Chi phí cơ bản/người (tiền sân + tiền cầu chia đều cho thành viên có mặt)
//   const baseCostPerPerson = (courtCost + shuttlecockCost) / presentMembers.length;

//   // Tính toán settlement cho từng thành viên
//   const settlements: Settlement[] = [];

//   presentMembers.forEach(sessionMember => {
//     const member = members.find(m => m.id === sessionMember.memberId);
//     let totalAmount = baseCostPerPerson;

//     // Cộng chi phí bổ sung cho thành viên này
//     additionalExpenses.forEach(expense => {
//       // Kiểm tra xem thành viên này có trong danh sách chia tiền của expense không
//       if (expense.memberIds && expense.memberIds.includes(sessionMember.memberId)) {
//         // Chia cho số người được chỉ định trong expense
//         totalAmount += expense.amount / expense.memberIds.length;
//       } else if (!expense.memberIds || expense.memberIds.length === 0) {
//         // Nếu không chỉ định ai thì chia cho tất cả thành viên có mặt
//         totalAmount += expense.amount / presentMembers.length;
//       }
//     });

//     settlements.push({
//       memberId: sessionMember.memberId,
//       memberName: member?.name || sessionMember.memberName || 'Unknown',
//       amount: Math.round(totalAmount),
//       isPaid: false,
//     });
//   });

//   return settlements;
// };

export const generateDetailedSettlements = (
  session: Session,
  members: { id: string; name: string }[]
): Settlement[] => {
  // Lấy danh sách thành viên có mặt (đã điểm danh)
  const presentMembers = session.members.filter(m => m.isPresent);

  // Phân loại chi phí
  const courtExpense = session.expenses.find(exp => exp.type === 'court');
  const shuttlecockExpense = session.expenses.find(exp => exp.type === 'shuttlecock');
  const additionalExpenses = session.expenses.filter(exp => exp.type === 'other');

  const courtCost = courtExpense?.amount || 0;
  const shuttlecockCost = shuttlecockExpense?.amount || 0;

  // Chi phí cơ bản/người (tiền sân + tiền cầu chia đều cho thành viên có mặt)
  const baseCostPerPerson = presentMembers.length > 0
    ? (courtCost + shuttlecockCost) / presentMembers.length
    : 0;

  // ===== LOGIC MỚI: Lấy tất cả memberIds từ chi phí bổ sung =====
  const membersWithAdditionalExpenses = new Set<string>();
  additionalExpenses.forEach(expense => {
    if (expense.memberIds && expense.memberIds.length > 0) {
      expense.memberIds.forEach(memberId => membersWithAdditionalExpenses.add(memberId));
    }
  });

  // Kết hợp: thành viên có mặt + thành viên có chi phí bổ sung
  const allRelevantMemberIds = new Set([
    ...presentMembers.map(m => m.memberId),
    ...Array.from(membersWithAdditionalExpenses)
  ]);

  // Tính toán settlement cho từng thành viên
  const settlements: Settlement[] = [];

  allRelevantMemberIds.forEach(memberId => {
    const sessionMember = session.members.find(m => m.memberId === memberId);
    const member = members.find(m => m.id === memberId);
    const isPresent = sessionMember?.isPresent || false;

    // Chi phí cơ bản (chỉ tính cho người có mặt)
    let totalAmount = isPresent ? baseCostPerPerson : 0;

    // Cộng chi phí bổ sung cho thành viên này
    additionalExpenses.forEach(expense => {
      // Kiểm tra xem thành viên này có trong danh sách chia tiền của expense không
      if (expense.memberIds && expense.memberIds.includes(memberId)) {
        // Chia cho số người được chỉ định trong expense
        totalAmount += expense.amount / expense.memberIds.length;
      } else if (!expense.memberIds || expense.memberIds.length === 0) {
        // Nếu không chỉ định ai thì chia cho tất cả thành viên có mặt
        if (isPresent) {
          totalAmount += expense.amount / presentMembers.length;
        }
      }
    });

    // Chỉ tạo settlement nếu có số tiền cần thanh toán
    if (totalAmount > 0) {
      settlements.push({
        memberId: memberId,
        memberName: sessionMember?.memberName || member?.name || 'Unknown',
        amount: Math.round(totalAmount),
        isPaid: false,
      });
    }
  });

  return settlements;
};


export const getCurrentUserLogin = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return {
      ...userSnap.data(), // ✅ chứa qrCode nếu có
      memberId: currentUser.uid,
    };
  }

  // fallback nếu chưa có trong Firestore
  return {
    memberId: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName || "",
    qrCode: "",
  };
};

/**
 * Tạo tên lịch đánh tự động theo format: "Thứ X, DD/MM/YYYY, HH:mm-HH:mm"
 * @param date - Ngày đánh
 * @param startTime - Giờ bắt đầu (format: "HH:mm")
 * @param endTime - Giờ kết thúc (format: "HH:mm")
 * @returns Tên lịch đánh đã format
 * @example
 * generateSessionName(new Date('2025-10-02'), '19:30', '20:30')
 * // Returns: "Thứ 5, 02/10/2025, 19:30-20:30"
 */
export const generateSessionName = (
  date: Date | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string => {
  // Xử lý trường hợp không có đủ thông tin
  if (!date || !startTime || !endTime) {
    return 'Lịch đánh mới';
  }

  try {
    // Đảm bảo date là Date object hợp lệ
    const validDate = date instanceof Date ? date : new Date(date);

    if (isNaN(validDate.getTime())) {
      return 'Lịch đánh mới';
    }

    // Lấy thứ trong tuần (0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
    const dayOfWeek = validDate.getDay();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayFullNames = [
      'Chủ nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7'
    ];

    // Format ngày: DD/MM/YYYY
    const day = String(validDate.getDate()).padStart(2, '0');
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const year = validDate.getFullYear();

    // Format thời gian
    const formattedStartTime = startTime || '00:00';
    const formattedEndTime = endTime || '00:00';

    // Tạo tên: "Thứ X, DD/MM/YYYY, HH:mm-HH:mm"
    return `${dayFullNames[dayOfWeek]}, ${day}/${month}/${year}, ${formattedStartTime}-${formattedEndTime}`;
  } catch (error) {
    console.error('Error generating session name:', error);
    return 'Lịch đánh mới';
  }
};

/**
 * Kiểm tra xem tên lịch đánh có phải là auto-generated không
 * @param name - Tên lịch đánh cần kiểm tra
 * @returns true nếu là auto-generated name
 */
export const isAutoGeneratedSessionName = (name: string): boolean => {
  // Pattern: "Thứ X, DD/MM/YYYY, HH:mm-HH:mm"
  const pattern = /^(Chủ nhật|Thứ [2-7]), \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}-\d{2}:\d{2}$/;
  return pattern.test(name);
};

export const calculateMemberSettlement = (
  session: Session,
  memberId: string,
  members: { id: string; name: string }[]
): {
  baseCost: number;
  additionalCosts: { name: string; amount: number; sharedWith: number }[];
  total: number
} => {
  const member = session.members.find(m => m.memberId === memberId);
  const isPresent = member?.isPresent || false;

  const presentMembers = session.members.filter(m => m.isPresent);
  const courtExpense = session.expenses.find(exp => exp.type === 'court');
  const shuttlecockExpense = session.expenses.find(exp => exp.type === 'shuttlecock');
  const additionalExpenses = session.expenses.filter(exp => exp.type === 'other');

  const courtCost = courtExpense?.amount || 0;
  const shuttlecockCost = shuttlecockExpense?.amount || 0;

  // Chi phí cơ bản (chỉ cho người có mặt)
  const baseCost = isPresent && presentMembers.length > 0
    ? (courtCost + shuttlecockCost) / presentMembers.length
    : 0;

  const additionalCosts: { name: string; amount: number; sharedWith: number }[] = [];
  let additionalTotal = 0;

  additionalExpenses.forEach(expense => {
    if (expense.memberIds && expense.memberIds.includes(memberId)) {
      const memberShare = expense.amount / expense.memberIds.length;
      additionalCosts.push({
        name: expense.name,
        amount: memberShare,
        sharedWith: expense.memberIds.length,
      });
      additionalTotal += memberShare;
    } else if (!expense.memberIds || expense.memberIds.length === 0) {
      // Chia cho tất cả thành viên có mặt
      if (isPresent && presentMembers.length > 0) {
        const memberShare = expense.amount / presentMembers.length;
        additionalCosts.push({
          name: expense.name,
          amount: memberShare,
          sharedWith: presentMembers.length,
        });
        additionalTotal += memberShare;
      }
    }
  });

  return {
    baseCost: Math.round(baseCost),
    additionalCosts,
    total: Math.round(baseCost + additionalTotal),
  };
};

// Generate settlements (legacy function for compatibility)
export const generateSettlements = (
  session: Session,
  members: { id: string; name: string }[]
): Settlement[] => {
  return generateDetailedSettlements(session, members);
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
export function isToday(date: Date | string | number): boolean {
  // Convert to Date object if it isn't already
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if it's a valid date
  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
}

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