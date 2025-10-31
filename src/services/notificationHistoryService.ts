// services/notificationHistoryService.ts
import { backEndNotificationService } from './backendNotificationService';
import { NotificationHistory } from '../types/notification';

class NotificationHistoryService {
  /**
   * Lấy danh sách lịch sử thông báo
   */
  async getNotificationHistory(limitCount: number = 100): Promise<NotificationHistory[]> {
    try {
      const history = await backEndNotificationService.getNotificationHistory(limitCount);
      
      return history.map(h => ({
        id: h.id,
        title: h.title,
        body: h.body,
        failureCount: h.failureCount || 0,
        readBy: h.readBy || [],
        sentAt: h.sentAt ? new Date(h.sentAt) : undefined,
        successCount: h.successCount || 0,
        targetType: h.targetType || 'all',
        totalDevices: h.totalDevices || 0,
      }));
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử thông báo chưa đọc
   */
  async getUnreadNotifications(userId: string): Promise<NotificationHistory[]> {
    try {
      const allHistory = await this.getNotificationHistory(50);
      
      return allHistory.filter(h => !h.readBy?.includes(userId));
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await backEndNotificationService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const unreadNotifications = await this.getUnreadNotifications(userId);
      
      const updatePromises = unreadNotifications.map((notification) =>
        this.markAsRead(notification.id, userId)
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Xóa lịch sử thông báo
   */
  async deleteNotificationHistory(notificationId: string): Promise<void> {
    try {
      await backEndNotificationService.deleteNotificationHistory(notificationId);
    } catch (error) {
      console.error('Error deleting notification history:', error);
      throw error;
    }
  }

  /**
   * Xóa nhiều lịch sử thông báo
   */
  async deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
    try {
      const deletePromises = notificationIds.map((id) =>
        this.deleteNotificationHistory(id)
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting multiple notifications:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê thông báo
   */
  async getNotificationStats(): Promise<{
    total: number;
    totalDevices: number;
    totalSuccess: number;
    totalFailure: number;
    successRate: number;
  }> {
    try {
      const stats = await backEndNotificationService.getNotificationStats();
      
      return {
        total: stats.history.total,
        totalDevices: stats.history.totalDevices,
        totalSuccess: stats.history.totalSuccess,
        totalFailure: stats.history.totalFailure,
        successRate: parseFloat(stats.history.successRate),
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        totalDevices: 0,
        totalSuccess: 0,
        totalFailure: 0,
        successRate: 0,
      };
    }
  }
}

export const notificationHistoryService = new NotificationHistoryService();