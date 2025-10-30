// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions/v2';

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Chạy mỗi phút để kiểm tra thông báo cần gửi
export const sendScheduledNotifications = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Ho_Chi_Minh',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    logger.info('[Scheduler] Checking for scheduled notifications...');

    const now = Timestamp.now();
    const oneMinuteAgo = Timestamp.fromDate(
      new Date(Date.now() - 60 * 1000)
    );

    try {
      // Lấy các thông báo cần gửi (trong khoảng 1 phút qua đến hiện tại)
      const notificationsSnapshot = await db
        .collection('scheduledNotifications')
        .where('status', '==', 'pending')
        .where('scheduledTime', '>=', oneMinuteAgo)
        .where('scheduledTime', '<=', now)
        .get();

      if (notificationsSnapshot.empty) {
        logger.info('[Scheduler] No notifications to send');
        return;
      }

      logger.info(`[Scheduler] Found ${notificationsSnapshot.size} notifications to send`);

      const batch = db.batch();
      const sendPromises: Promise<any>[] = [];

      for (const doc of notificationsSnapshot.docs) {
        const notification = doc.data();
        
        try {
          // Lấy device tokens
          let tokensSnapshot;
          
          if (notification.targetType === 'all') {
            tokensSnapshot = await db
              .collection('deviceTokens')
              .get();
          } else if (notification.targetType === 'user' && notification.targetIds) {
            tokensSnapshot = await db
              .collection('deviceTokens')
              .where('userId', 'in', notification.targetIds)
              .get();
          }

          if (!tokensSnapshot || tokensSnapshot.empty) {
            logger.warn(`[Scheduler] No tokens found for notification ${doc.id}`);
            batch.update(doc.ref, {
              status: 'failed',
              sentAt: FieldValue.serverTimestamp(),
            });
            continue;
          }

          const tokens: string[] = [];
          tokensSnapshot.forEach((tokenDoc) => {
            tokens.push(tokenDoc.data().token);
          });

          // Giới hạn 500 tokens mỗi batch (FCM limit)
          const tokenBatches = [];
          for (let i = 0; i < tokens.length; i += 500) {
            tokenBatches.push(tokens.slice(i, i + 500));
          }

          // Gửi thông báo
          const sendPromise = Promise.all(
            tokenBatches.map(async (tokenBatch) => {
              try {
                const message = {
                  notification: {
                    title: notification.title,
                    body: notification.body,
                  },
                  tokens: tokenBatch,
                };

                const response = await messaging.sendEachForMulticast(message);
                
                logger.info(
                  `[Scheduler] Sent notification ${doc.id}: ${response.successCount} success, ${response.failureCount} failed`
                );

                // Xóa token lỗi
                if (response.failureCount > 0) {
                  const failedTokens: string[] = [];
                  response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                      failedTokens.push(tokenBatch[idx]);
                      logger.warn(`[Scheduler] Failed token: ${tokenBatch[idx]}, error: ${resp.error?.message}`);
                    }
                  });

                  // Xóa failed tokens (batch delete)
                  if (failedTokens.length > 0) {
                    const invalidTokensSnapshot = await db
                      .collection('deviceTokens')
                      .where('token', 'in', failedTokens.slice(0, 10)) // Firestore limit 10
                      .get();

                    invalidTokensSnapshot.forEach((tokenDoc) => {
                      batch.delete(tokenDoc.ref);
                    });
                  }
                }

                return response;
              } catch (error) {
                logger.error(`[Scheduler] Error sending to token batch:`, error);
                throw error;
              }
            })
          ).then((responses) => {
            const totalSuccess = responses.reduce((sum, r) => sum + r.successCount, 0);
            const totalFailure = responses.reduce((sum, r) => sum + r.failureCount, 0);

            // Cập nhật trạng thái
            if (notification.recurring?.enabled) {
              // Nếu là thông báo lặp, tính thời gian gửi tiếp theo
              const nextTime = calculateNextRecurringTime(notification);
              if (nextTime) {
                batch.update(doc.ref, {
                  scheduledTime: Timestamp.fromDate(nextTime),
                  lastSentAt: FieldValue.serverTimestamp(),
                  successCount: (notification.successCount || 0) + totalSuccess,
                  failureCount: (notification.failureCount || 0) + totalFailure,
                });
              } else {
                batch.update(doc.ref, {
                  status: 'sent',
                  sentAt: FieldValue.serverTimestamp(),
                  successCount: (notification.successCount || 0) + totalSuccess,
                  failureCount: (notification.failureCount || 0) + totalFailure,
                });
              }
            } else {
              // Thông báo gửi 1 lần
              batch.update(doc.ref, {
                status: 'sent',
                sentAt: FieldValue.serverTimestamp(),
                successCount: totalSuccess,
                failureCount: totalFailure,
              });
            }
          });

          sendPromises.push(sendPromise);
        } catch (error) {
          logger.error(`[Scheduler] Error processing notification ${doc.id}:`, error);
          batch.update(doc.ref, {
            status: 'failed',
            sentAt: FieldValue.serverTimestamp(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Đợi tất cả thông báo được gửi
      await Promise.allSettled(sendPromises);

      // Commit batch update
      await batch.commit();

      logger.info('[Scheduler] Completed sending scheduled notifications');
      return;
    } catch (error) {
      logger.error('[Scheduler] Error in sendScheduledNotifications:', error);
      throw error;
    }
  }
);

// Hàm tính thời gian gửi tiếp theo cho thông báo định kỳ
function calculateNextRecurringTime(notification: any): Date | null {
  if (!notification.recurring?.enabled) return null;

  const { frequency, daysOfWeek, dayOfMonth, time } = notification.recurring;
  const [hours, minutes] = time.split(':').map(Number);

  let nextDate = new Date();
  nextDate.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      // Chuyển sang ngày mai
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      if (!daysOfWeek || daysOfWeek.length === 0) return null;
      
      const currentDay = nextDate.getDay();
      const sortedDays = [...daysOfWeek].sort((a: number, b: number) => a - b);
      
      let foundDay = sortedDays.find((day: number) => day > currentDay);
      if (!foundDay) {
        foundDay = sortedDays[0];
        nextDate.setDate(nextDate.getDate() + (7 - currentDay + foundDay));
      } else {
        nextDate.setDate(nextDate.getDate() + (foundDay - currentDay));
      }
      break;

    case 'monthly':
      if (!dayOfMonth) return null;
      
      // Chuyển sang tháng sau
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(dayOfMonth);
      break;

    default:
      return null;
  }

  return nextDate;
}

// API để kiểm tra thông báo sắp tới
export const getUpcomingNotifications = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      const now = Timestamp.now();
      const tomorrow = Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      const notificationsSnapshot = await db
        .collection('scheduledNotifications')
        .where('status', '==', 'pending')
        .where('scheduledTime', '>=', now)
        .where('scheduledTime', '<=', tomorrow)
        .orderBy('scheduledTime', 'asc')
        .get();

      const notifications = notificationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, notifications };
    } catch (error) {
      logger.error('Error getting upcoming notifications:', error);
      throw new HttpsError('internal', 'Failed to get notifications');
    }
  }
);

// API để test gửi thông báo ngay lập tức
export const testSendNotification = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    // Kiểm tra authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { notificationId } = request.data;

    if (!notificationId) {
      throw new HttpsError('invalid-argument', 'notificationId is required');
    }

    try {
      const notificationDoc = await db
        .collection('scheduledNotifications')
        .doc(notificationId)
        .get();

      if (!notificationDoc.exists) {
        throw new HttpsError('not-found', 'Notification not found');
      }

      const notification = notificationDoc.data();

      // Lấy tokens
      const tokensSnapshot = await db
        .collection('deviceTokens')
        .get();

      const tokens: string[] = [];
      tokensSnapshot.forEach((doc) => {
        tokens.push(doc.data().token);
      });

      if (tokens.length === 0) {
        return { success: false, message: 'No devices to send notification' };
      }

      // Gửi thông báo
      const message = {
        notification: {
          title: notification?.title || 'Test Notification',
          body: notification?.body || 'This is a test notification',
        },
        tokens: tokens.slice(0, 500), // FCM limit 500 tokens per request
      };

      const response = await messaging.sendEachForMulticast(message);

      logger.info(
        `Test notification sent: ${response.successCount} success, ${response.failureCount} failed`
      );

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length,
      };
    } catch (error) {
      logger.error('Error sending test notification:', error);
      throw new HttpsError('internal', 'Failed to send notification');
    }
  }
);

// API để gửi thông báo ngay lập tức (không cần lên lịch)
export const sendImmediateNotification = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    // Kiểm tra authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Kiểm tra quyền admin
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admin can send notifications');
    }

    const { title, body, targetType = 'all', targetIds = [] } = request.data;

    if (!title || !body) {
      throw new HttpsError('invalid-argument', 'title and body are required');
    }

    try {
      // Lấy device tokens
      let tokensSnapshot;
      
      if (targetType === 'all') {
        tokensSnapshot = await db.collection('deviceTokens').get();
      } else if (targetType === 'user' && targetIds.length > 0) {
        tokensSnapshot = await db
          .collection('deviceTokens')
          .where('userId', 'in', targetIds.slice(0, 10)) // Firestore limit
          .get();
      } else {
        throw new HttpsError('invalid-argument', 'Invalid targetType or targetIds');
      }

      if (tokensSnapshot.empty) {
        return { success: false, message: 'No devices to send notification' };
      }

      const tokens: string[] = [];
      tokensSnapshot.forEach((doc) => {
        tokens.push(doc.data().token);
      });

      // Gửi thông báo (batch 500 tokens)
      const tokenBatches = [];
      for (let i = 0; i < tokens.length; i += 500) {
        tokenBatches.push(tokens.slice(i, i + 500));
      }

      let totalSuccess = 0;
      let totalFailure = 0;

      for (const tokenBatch of tokenBatches) {
        const message = {
          notification: { title, body },
          tokens: tokenBatch,
        };

        const response = await messaging.sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        // Xóa token lỗi
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(tokenBatch[idx]);
            }
          });

          // Xóa failed tokens
          for (const failedToken of failedTokens.slice(0, 10)) {
            const invalidTokensSnapshot = await db
              .collection('deviceTokens')
              .where('token', '==', failedToken)
              .limit(1)
              .get();

            if (!invalidTokensSnapshot.empty) {
              await invalidTokensSnapshot.docs[0].ref.delete();
            }
          }
        }
      }

      logger.info(
        `Immediate notification sent: ${totalSuccess} success, ${totalFailure} failed`
      );

      return {
        success: true,
        successCount: totalSuccess,
        failureCount: totalFailure,
        totalTokens: tokens.length,
      };
    } catch (error) {
      logger.error('Error sending immediate notification:', error);
      throw new HttpsError('internal', 'Failed to send notification');
    }
  }
);