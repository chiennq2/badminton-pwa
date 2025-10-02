/**
 * Chuyển Date thành string "YYYY-MM-DD" để lưu vào Firebase
 */
export const dateToString = (date: Date | any): string => {
    // Xử lý các trường hợp input
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (date && typeof date === 'object' && 'toDate' in date) {
      dateObj = date.toDate();
    } else if (date && typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else {
      dateObj = new Date(date);
    }
    
    // Validate
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
    
    // Format: YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };
  
  /**
   * Chuyển string "YYYY-MM-DD" thành Date object (giờ = 00:00:00)
   */
  export const stringToDate = (dateString: string): Date => {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }
    
    // Parse "YYYY-MM-DD"
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const day = parseInt(parts[2]);
      
      const date = new Date(year, month, day, 0, 0, 0, 0);
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Fallback: parse trực tiếp
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      // Set giờ về 00:00:00
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
    
    return new Date();
  };
  
  /**
   * Format date để hiển thị (chỉ ngày tháng năm)
   */
  export const formatDateOnly = (input: any): string => {
    let dateString: string;
    
    // Nếu input đã là string "YYYY-MM-DD"
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      dateString = input;
    } else {
      // Convert sang string
      dateString = dateToString(input);
    }
    
    // Parse và format
    const date = stringToDate(dateString);
    
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };