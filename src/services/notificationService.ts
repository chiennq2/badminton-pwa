// services/notificationService.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Lấy VAPID key từ Firebase Console
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export class NotificationService {
  private messaging: any;
  private functions: any;

  constructor() {
    if ('serviceWorker' in navigator) {
        const app = getApp(); // Lấy Firebase app đã khởi tạo ở đâu đó
        this.messaging = getMessaging(app);
        this.functions = getFunctions(app, 'us-central1'); // <-- quan trọng
    }
  }

  // Đăng ký nhận thông báo và lưu token vào Firestore
  async registerDevice(userId: string): Promise<string | null> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      const token = await getToken(this.messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        // Kiểm tra token đã tồn tại chưa
        const tokensQuery = query(
          collection(db, 'deviceTokens'),
          where('token', '==', token)
        );
        const existingTokens = await getDocs(tokensQuery);

        if (existingTokens.empty) {
          // Lưu token mới vào Firestore
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

  // Gửi thông báo ngay lập tức đến tất cả thiết bị
  async sendNotificationToAll(title: string, body: string): Promise<any> {
    try {
      // Gọi Firebase Callable Function
      const sendNotification = httpsCallable(this.functions, 'sendImmediateNotification');
      const result = await sendNotification({
        title,
        body,
        targetType: 'all',
      });

      console.log('✅ Notification sent successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  // Gửi thông báo đến user cụ thể
  async sendNotificationToUser(userId: string, title: string, body: string): Promise<any> {
    try {
      const sendNotification = httpsCallable(this.functions, 'sendImmediateNotification');
      const result = await sendNotification({
        title,
        body,
        targetType: 'user',
        targetIds: [userId],
      });

      console.log('Notification sent to user:', userId, result.data);
      return result.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Test gửi thông báo đã lên lịch
  async testScheduledNotification(notificationId: string): Promise<any> {
    try {
      const testSend = httpsCallable(this.functions, 'testSendNotification');
      const result = await testSend({ notificationId });

      console.log('Test notification sent:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error testing notification:', error);
      throw error;
    }
  }

  // Lấy thông báo sắp tới
  async getUpcomingNotifications(): Promise<any> {
    try {
      const getUpcoming = httpsCallable(this.functions, 'getUpcomingNotifications');
      const result = await getUpcoming({});

      console.log('Upcoming notifications:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error getting upcoming notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();