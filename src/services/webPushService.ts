// services/webPushService.ts
import { collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class WebPushService {
  private vapidPublicKey: string;

  constructor() {
    // VAPID Public Key - Generate tại: https://vapidkeys.com/
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  }

  // Chuyển base64 sang Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Đăng ký Push Subscription
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    try {
      // Kiểm tra browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return null;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Đợi service worker ready
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource,
      });

      // Convert subscription to JSON
      const subscriptionJSON = subscription.toJSON();
      const pushSubscription: PushSubscription = {
        endpoint: subscriptionJSON.endpoint || '',
        keys: {
          p256dh: subscriptionJSON.keys?.p256dh || '',
          auth: subscriptionJSON.keys?.auth || '',
        },
      };

      // Lưu subscription vào Firestore
      await this.saveSubscription(userId, pushSubscription);

      console.log('Push subscription successful:', pushSubscription);
      return pushSubscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  // Lưu subscription vào Firestore
  private async saveSubscription(
    userId: string,
    subscription: PushSubscription
  ): Promise<void> {
    try {
      // Kiểm tra xem subscription đã tồn tại chưa
      const subscriptionsQuery = query(
        collection(db, 'pushSubscriptions'),
        where('endpoint', '==', subscription.endpoint)
      );
      const existingSubs = await getDocs(subscriptionsQuery);

      if (existingSubs.empty) {
        // Lưu subscription mới
        await addDoc(collection(db, 'pushSubscriptions'), {
          userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          createdAt: new Date(),
          updatedAt: new Date(),
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        });
        console.log('Push subscription saved to Firestore');
      } else {
        console.log('Push subscription already exists');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  // Hủy đăng ký push
  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Xóa khỏi Firestore
        const subscriptionsQuery = query(
          collection(db, 'pushSubscriptions'),
          where('endpoint', '==', subscription.endpoint)
        );
        const docs = await getDocs(subscriptionsQuery);
        
        for (const doc of docs.docs) {
          await deleteDoc(doc.ref);
        }

        console.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  // Kiểm tra trạng thái subscription
  async getSubscriptionStatus(): Promise<{
    isSubscribed: boolean;
    subscription: PushSubscription | null;
  }> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const subscriptionJSON = subscription.toJSON();
        return {
          isSubscribed: true,
          subscription: {
            endpoint: subscriptionJSON.endpoint || '',
            keys: {
              p256dh: subscriptionJSON.keys?.p256dh || '',
              auth: subscriptionJSON.keys?.auth || '',
            },
          },
        };
      }

      return { isSubscribed: false, subscription: null };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { isSubscribed: false, subscription: null };
    }
  }

  // Test notification (client-side)
  async testNotification(title: string, body: string): Promise<void> {
    try {
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/pwa-192x192.png',
        // vibrate is not supported in NotificationOptions
      });
    } catch (error) {
      console.error('Error showing test notification:', error);
      throw error;
    }
  }
}

export const webPushService = new WebPushService();