export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  targetType: 'all' | 'user' | 'group';
  targetIds?: string[]; // userId hoặc groupId
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    time: string; // HH:mm format
  };
}
