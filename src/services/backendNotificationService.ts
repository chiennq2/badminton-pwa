// services/backendNotificationService.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const API_URL = import.meta.env.VITE_BACKEND_NOTI_URL || 'http://localhost:3001';

export class BackendNotificationService {
  private messaging: any;

  constructor() {
    if ('serviceWorker' in navigator) {
      const app = getApp();
      this.messaging = getMessaging(app);
    }
  }

  // Lấy Firebase ID Token cho xác thực
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    return await user.getIdToken();
  }

  // Đăng ký nhận thông báo
  async registerDevice(userId: string): Promise<string | null> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      const token = await getToken(this.messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        const tokensQuery = query(
          collection(db, 'deviceTokens'),
          where('token', '==', token)
        );
        const existingTokens = await getDocs(tokensQuery);

        if (existingTokens.empty) {
          await addDoc(collection(db, 'deviceTokens'), {
            userId,
            token,
            createdAt: new Date(),
            updatedAt: new Date(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          });
          console.log('Device token saved:', token);
        } else {
          console.log('Device token already exists');
        }
        
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting device token:', error);
      return null;
    }
  }

  // Lắng nghe thông báo khi app đang mở
  onMessageReceived(callback: (payload: any) => void) {
    if (this.messaging) {
      onMessage(this.messaging, (payload) => {
        console.log('Message received:', payload);
        callback(payload);
      });
    }
  }

  // ===== API CALLS =====

  /**
   * Gửi thông báo đến tất cả thiết bị NGAY LẬP TỨC
   */
  async sendNotificationToAll(
    title: string, 
    body: string
  ): Promise<{
    success: boolean;
    message?: string;
    successCount: number;
    failureCount: number;
    totalDevices: number;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_URL}/api/notifications/send-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
      console.log('✅ Notification sent:', result);
      
      return {
        success: result.success,
        message: result.message,
        successCount: result.successCount || 0,
        failureCount: result.failureCount || 0,
        totalDevices: result.totalDevices || 0,
      };
    } catch (error: any) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Gửi thông báo đến user cụ thể
   */
  async sendNotificationToUser(
    userId: string, 
    title: string, 
    body: string
  ): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    totalDevices: number;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_URL}/api/notifications/send-to-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, title, body }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Lên lịch thông báo
   */
  async scheduleNotification(
    title: string,
    body: string,
    scheduledTime: Date,
    recurring?: any
  ): Promise<{
    success: boolean;
    notificationId: string;
    message?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_URL}/api/notifications/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          title, 
          body, 
          scheduledTime: scheduledTime.toISOString(), 
          recurring 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule notification');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách thông báo đã lên lịch
   */
  async getScheduledNotifications(status?: string): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      
      const url = status 
        ? `${API_URL}/api/notifications/scheduled?status=${status}`
        : `${API_URL}/api/notifications/scheduled`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get scheduled notifications');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Hủy thông báo đã lên lịch
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/scheduled/${notificationId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel notification');
      }
    } catch (error: any) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  }

  /**
   * Xóa thông báo đã lên lịch
   */
  async deleteScheduledNotification(notificationId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/scheduled/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete notification');
      }
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử thông báo
   */
  async getNotificationHistory(limit?: number): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      
      const url = limit
        ? `${API_URL}/api/notifications/history?limit=${limit}`
        : `${API_URL}/api/notifications/history`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get notification history');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  /**
   * Xóa lịch sử thông báo
   */
  async deleteNotificationHistory(notificationId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/history/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete notification history');
      }
    } catch (error: any) {
      console.error('Error deleting notification history:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/history/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as read');
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê thông báo
   */
  async getNotificationStats(): Promise<any> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_URL}/api/notifications/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get notification stats');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

export const backEndNotificationService = new BackendNotificationService();