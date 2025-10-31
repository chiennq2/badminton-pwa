// services/scheduledNotificationService.ts
import { backEndNotificationService } from './backendNotificationService';
import { ScheduledNotification } from '../types/notification';

class ScheduledNotificationService {
  /**
   * Tạo thông báo đã lên lịch
   */
  async createScheduledNotification(
    notification: Omit<ScheduledNotification, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    try {
      const result = await backEndNotificationService.scheduleNotification(
        notification.title,
        notification.body,
        notification.scheduledTime,
        notification.recurring
      );

      return result.notificationId;
    } catch (error) {
      console.error('Error creating scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách thông báo đã lên lịch
   */
  async getScheduledNotifications(status?: string): Promise<ScheduledNotification[]> {
    try {
      const notifications = await backEndNotificationService.getScheduledNotifications(status);
      
      return notifications.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduledTime: new Date(n.scheduledTime),
        targetType: n.targetType || 'all',
        targetIds: n.targetIds,
        status: n.status,
        createdBy: n.createdBy,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        sentAt: n.sentAt ? new Date(n.sentAt) : undefined,
        recurring: n.recurring,
      }));
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Lấy thông báo sắp tới (24h)
   */
  async getUpcomingNotifications(): Promise<ScheduledNotification[]> {
    try {
      const notifications = await this.getScheduledNotifications('pending');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return notifications.filter(n => {
        const scheduledTime = new Date(n.scheduledTime);
        return scheduledTime >= now && scheduledTime <= tomorrow;
      });
    } catch (error) {
      console.error('Error getting upcoming notifications:', error);
      throw error;
    }
  }

  /**
   * Hủy thông báo đã lên lịch
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await backEndNotificationService.cancelScheduledNotification(notificationId);
    } catch (error) {
      console.error('Error cancelling scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Xóa thông báo đã lên lịch
   */
  async deleteScheduledNotification(notificationId: string): Promise<void> {
    try {
      await backEndNotificationService.deleteScheduledNotification(notificationId);
    } catch (error) {
      console.error('Error deleting scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê thông báo đã lên lịch
   */
  async getScheduledStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  }> {
    try {
      const stats = await backEndNotificationService.getNotificationStats();
      return stats.scheduled;
    } catch (error) {
      console.error('Error getting scheduled stats:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
      };
    }
  }
}

export const scheduledNotificationService = new ScheduledNotificationService();