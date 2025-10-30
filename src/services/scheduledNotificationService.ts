import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ScheduledNotification } from '../types/notification';

export class ScheduledNotificationService {
  private collectionName = 'scheduledNotifications';

  // Tạo thông báo lên lịch
  async createScheduledNotification(
    notification: Omit<ScheduledNotification, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...notification,
        status: 'pending',
        createdAt: new Date(),
        scheduledTime: Timestamp.fromDate(notification.scheduledTime),
      });
      console.log('Scheduled notification created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating scheduled notification:', error);
      throw error;
    }
  }

  // Lấy danh sách thông báo đã lên lịch
  async getScheduledNotifications(
    status?: 'pending' | 'sent' | 'failed' | 'cancelled'
  ): Promise<ScheduledNotification[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('scheduledTime', 'asc')
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime.toDate(),
          createdAt: data.createdAt.toDate(),
          sentAt: data.sentAt?.toDate(),
        } as ScheduledNotification;
      });
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      throw error;
    }
  }

  // Lấy thông báo sắp tới (trong vòng 24h)
  async getUpcomingNotifications(): Promise<ScheduledNotification[]> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'pending'),
        where('scheduledTime', '>=', Timestamp.fromDate(now)),
        where('scheduledTime', '<=', Timestamp.fromDate(tomorrow)),
        orderBy('scheduledTime', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime.toDate(),
          createdAt: data.createdAt.toDate(),
        } as ScheduledNotification;
      });
    } catch (error) {
      console.error('Error getting upcoming notifications:', error);
      throw error;
    }
  }

  // Cập nhật trạng thái thông báo
  async updateNotificationStatus(
    id: string,
    status: 'sent' | 'failed' | 'cancelled',
    sentAt?: Date
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        status,
        ...(sentAt && { sentAt: Timestamp.fromDate(sentAt) }),
      });
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  }

  // Hủy thông báo đã lên lịch
  async cancelScheduledNotification(id: string): Promise<void> {
    try {
      await this.updateNotificationStatus(id, 'cancelled');
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw error;
    }
  }

  // Xóa thông báo
  async deleteScheduledNotification(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Tính toán thời gian gửi tiếp theo cho thông báo định kỳ
  calculateNextRecurringTime(notification: ScheduledNotification): Date | null {
    if (!notification.recurring?.enabled) return null;

    const now = new Date();
    const { frequency, daysOfWeek, dayOfMonth, time } = notification.recurring;
    const [hours, minutes] = time.split(':').map(Number);

    let nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        // Nếu giờ trong ngày đã qua, chuyển sang ngày mai
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;

      case 'weekly':
        if (!daysOfWeek || daysOfWeek.length === 0) return null;
        
        // Tìm ngày tiếp theo trong tuần
        const currentDay = nextDate.getDay();
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        
        let foundDay = sortedDays.find(day => day > currentDay);
        if (!foundDay) {
          // Nếu không có ngày nào trong tuần này, lấy ngày đầu tuần sau
          foundDay = sortedDays[0];
          nextDate.setDate(nextDate.getDate() + (7 - currentDay + foundDay));
        } else {
          nextDate.setDate(nextDate.getDate() + (foundDay - currentDay));
        }
        break;

      case 'monthly':
        if (!dayOfMonth) return null;
        
        nextDate.setDate(dayOfMonth);
        
        // Nếu ngày trong tháng đã qua, chuyển sang tháng sau
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
    }

    return nextDate;
  }
}

export const scheduledNotificationService = new ScheduledNotificationService();