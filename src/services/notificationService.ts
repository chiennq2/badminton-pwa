// services/notificationService.ts - Fixed for iOS
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getApp } from 'firebase/app';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Detect iOS version
const getIOSVersion = (): number | null => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
};

// Check if iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Check if running as standalone PWA
const isStandalone = () => {
  return (window.navigator as any).standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

// Check if running in Safari browser
const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Check if Push API is supported
const isPushSupported = () => {
  return 'PushManager' in window && 'serviceWorker' in navigator;
};

export interface NotificationCapability {
  canReceive: boolean;
  reason: string;
  suggestion?: string;
  deviceInfo: {
    isIOS: boolean;
    iosVersion: number | null;
    isStandalone: boolean;
    isSafari: boolean;
    isPushSupported: boolean;
    userAgent: string;
  };
}

export class NotificationService {
  private messaging: any;
  private isMessagingSupported: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.isMessagingSupported = await isSupported();
      
      if (this.isMessagingSupported && 'serviceWorker' in navigator) {
        const app = getApp();
        this.messaging = getMessaging(app);
        console.log('✅ Firebase Messaging initialized');
      } else {
        console.warn('⚠️ Firebase Messaging not supported on this device');
      }
    } catch (error) {
      console.error('❌ Error initializing Firebase Messaging:', error);
      this.isMessagingSupported = false;
    }
  }

  // Check notification capability with detailed info
  async checkNotificationCapability(): Promise<NotificationCapability> {
    const ios = isIOS();
    const iosVersion = getIOSVersion();
    const standalone = isStandalone();
    const safari = isSafari();
    const pushSupported = isPushSupported();

    const deviceInfo = {
      isIOS: ios,
      iosVersion,
      isStandalone: standalone,
      isSafari: safari,
      isPushSupported: pushSupported,
      userAgent: navigator.userAgent,
    };

    // iOS PWA không hỗ trợ push notifications
    if (ios && standalone) {
      return {
        canReceive: false,
        reason: 'iOS PWA không hỗ trợ thông báo đẩy',
        suggestion: 'Vui lòng sử dụng Safari để nhận thông báo',
        deviceInfo,
      };
    }

    // iOS Safari nhưng version < 16.4
    if (ios && safari && iosVersion && iosVersion < 16) {
      return {
        canReceive: false,
        reason: `iOS ${iosVersion} chưa hỗ trợ Web Push`,
        suggestion: 'Vui lòng cập nhật iOS lên phiên bản 16.4 trở lên',
        deviceInfo,
      };
    }

    // iOS Safari >= 16.4
    if (ios && safari && iosVersion && iosVersion >= 16) {
      if (!this.isMessagingSupported || !pushSupported) {
        return {
          canReceive: false,
          reason: 'Trình duyệt chưa hỗ trợ đầy đủ Web Push',
          deviceInfo,
        };
      }
      
      return {
        canReceive: true,
        reason: 'Thiết bị hỗ trợ thông báo đẩy',
        deviceInfo,
      };
    }

    // Non-iOS devices
    if (!this.isMessagingSupported || !pushSupported) {
      return {
        canReceive: false,
        reason: 'Thiết bị không hỗ trợ thông báo đẩy',
        deviceInfo,
      };
    }

    return {
      canReceive: true,
      reason: 'Thiết bị hỗ trợ thông báo đẩy',
      deviceInfo,
    };
  }

  // Register device for notifications
  async registerDevice(userId: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
    capability: NotificationCapability;
  }> {
    try {
      const capability = await this.checkNotificationCapability();

      console.log('📱 Device Capability Check:', capability);

      // Nếu không thể nhận thông báo
      if (!capability.canReceive) {
        // Lưu thông tin device nhưng đánh dấu là không hỗ trợ
        await addDoc(collection(db, 'deviceTokens'), {
          userId,
          token: null,
          supported: false,
          capability,
          createdAt: new Date(),
          updatedAt: new Date(),
          note: capability.reason,
        });

        return {
          success: false,
          message: `${capability.reason}${capability.suggestion ? '. ' + capability.suggestion : ''}`,
          capability,
        };
      }

      // Kiểm tra quyền
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
      }

      if (permission !== 'granted') {
        return {
          success: false,
          message: 'Người dùng từ chối quyền thông báo',
          capability,
        };
      }

      // Đợi Service Worker ready
      if (!navigator.serviceWorker.controller) {
        console.log('⏳ Waiting for Service Worker to be ready...');
        await navigator.serviceWorker.ready;
        
        // Đợi thêm một chút để đảm bảo SW đã sẵn sàng
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Lấy token
      const token = await getToken(this.messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (token) {
        console.log('✅ FCM Token received:', token.substring(0, 20) + '...');

        // Kiểm tra token đã tồn tại chưa
        const tokensQuery = query(
          collection(db, 'deviceTokens'),
          where('token', '==', token)
        );
        const existingTokens = await getDocs(tokensQuery);

        if (existingTokens.empty) {
          // Lưu token mới
          await addDoc(collection(db, 'deviceTokens'), {
            userId,
            token,
            supported: true,
            capability,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log('💾 Device token saved to Firestore');
        } else {
          // Cập nhật token hiện có
          const docId = existingTokens.docs[0].id;
          await updateDoc(doc(db, 'deviceTokens', docId), {
            userId,
            capability,
            updatedAt: new Date(),
          });
          console.log('🔄 Device token updated in Firestore');
        }
        
        return {
          success: true,
          token,
          message: 'Đã đăng ký nhận thông báo thành công',
          capability,
        };
      }

      return {
        success: false,
        message: 'Không thể lấy token từ Firebase',
        capability,
      };

    } catch (error: any) {
      console.error('❌ Error registering device:', error);
      
      const capability = await this.checkNotificationCapability();
      
      return {
        success: false,
        message: error.message || 'Lỗi khi đăng ký nhận thông báo',
        capability,
      };
    }
  }

  // Listen for messages when app is open
  onMessageReceived(callback: (payload: any) => void) {
    if (this.messaging && this.isMessagingSupported) {
      onMessage(this.messaging, (payload) => {
        console.log('📬 Message received in foreground:', payload);
        callback(payload);
      });
    }
  }

  // Get notification permission status
  getPermissionStatus(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }
}

export const notificationService = new NotificationService();