// src/services/notificationService.ts
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

class NotificationService {
  private messaging: any = null;
  private currentToken: string | null = null;

  constructor() {
    this.initializeMessaging();
  }

  private initializeMessaging() {
    try {
      if (typeof window === "undefined") {
        console.warn("[NotificationService] Running outside browser environment");
        return;
      }

      if (!("Notification" in window)) {
        console.warn("[NotificationService] Browser không hỗ trợ Notification API");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        console.warn("[NotificationService] Browser không hỗ trợ Service Worker");
        return;
      }

      this.messaging = getMessaging();
      console.log("[NotificationService] Firebase Messaging initialized");
    } catch (error) {
      console.error("[NotificationService] Initialization error:", error);
    }
  }

  /** Đăng ký thiết bị để nhận thông báo */
  async registerDevice(userId: string): Promise<string | null> {
    try {
      console.log("[NotificationService] Starting device registration for:", userId);

      if (!this.messaging) {
        throw new Error("Firebase Messaging chưa được khởi tạo");
      }

      const permission = Notification.permission;
      console.log("[NotificationService] Current permission:", permission);

      if (permission === "denied") {
        throw new Error("Quyền thông báo đã bị từ chối. Vui lòng bật trong cài đặt trình duyệt.");
      }

      if (permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          throw new Error("Vui lòng cấp quyền thông báo");
        }
      }

      console.log("[NotificationService] Waiting for Service Worker...");
      const registration = await navigator.serviceWorker.ready;

      if (!registration.active) {
        throw new Error("Service Worker chưa active");
      }

      console.log("[NotificationService] Getting FCM token...");
      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        throw new Error("Không thể tạo FCM token. Vui lòng kiểm tra VAPID key.");
      }

      this.currentToken = token;
      console.log("[NotificationService] FCM token:", token.substring(0, 20) + "...");

      await this.saveTokenToFirestore(userId, token);

      console.log("[NotificationService] Device registered successfully");
      return token;
    } catch (error: any) {
      console.error("[NotificationService] Registration failed:", error);

      if (error.code === "messaging/permission-blocked") {
        throw new Error("Quyền thông báo đã bị chặn. Vui lòng bật trong cài đặt trình duyệt.");
      }

      if (error.code === "messaging/token-subscribe-failed") {
        throw new Error("Không thể đăng ký với FCM. Vui lòng kiểm tra kết nối internet.");
      }

      if (error.message?.includes("messaging/unsupported-browser")) {
        throw new Error("Trình duyệt không hỗ trợ thông báo đẩy.");
      }

      throw error;
    }
  }

  /** Lưu token vào Firestore */
  private async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      const deviceRef = doc(db, "deviceTokens", userId);

      await setDoc(
        deviceRef,
        {
          token,
          userId,
          updatedAt: serverTimestamp(),
          platform: this.getPlatform(),
          browser: this.getBrowser(),
        },
        { merge: true }
      );

      console.log("[NotificationService] Token saved to Firestore");
    } catch (error) {
      console.error("[NotificationService] Failed to save token to Firestore:", error);
    }
  }

  /** Lắng nghe thông báo khi app đang mở */
  onMessageReceived(callback: (payload: MessagePayload) => void): void {
    if (!this.messaging) {
      console.warn("[NotificationService] Messaging not initialized");
      return;
    }

    try {
      onMessage(this.messaging, (payload) => {
        console.log("[NotificationService] Foreground message:", payload);
        callback(payload);
      });
    } catch (error) {
      console.error("[NotificationService] onMessage listener error:", error);
    }
  }

  /** Hủy đăng ký thiết bị */
  async unregisterDevice(userId: string): Promise<void> {
    try {
      const deviceRef = doc(db, "deviceTokens", userId);
      await setDoc(
        deviceRef,
        {
          token: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      this.currentToken = null;
      console.log("[NotificationService] Device unregistered");
    } catch (error) {
      console.error("[NotificationService] Unregister failed:", error);
    }
  }

  /** Lấy token hiện tại */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /** Kiểm tra đã đăng ký chưa */
  isRegistered(): boolean {
    return this.currentToken !== null;
  }

  /** Helper: Lấy platform */
  private getPlatform(): string {
    if (typeof navigator === "undefined") return "Unknown";
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
    if (/Win/.test(ua)) return "Windows";
    if (/Mac/.test(ua)) return "MacOS";
    if (/Linux/.test(ua)) return "Linux";
    return "Unknown";
  }

  /** Helper: Lấy browser */
  private getBrowser(): string {
    if (typeof navigator === "undefined") return "Unknown";
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";
    if (/Chrome/.test(ua) && /Google Inc/.test(vendor)) return "Chrome";
    if (/Firefox/.test(ua)) return "Firefox";
    if (/Safari/.test(ua) && /Apple Computer/.test(vendor)) return "Safari";
    if (/Edg/.test(ua)) return "Edge";
    if (/OPR/.test(ua) || /Opera/.test(ua)) return "Opera";
    return "Unknown";
  }

  /** Gửi thông báo test */
  async testNotification(): Promise<void> {
    if (typeof window === "undefined") return;
    if (Notification.permission !== "granted") {
      console.warn("[NotificationService] Chưa được cấp quyền thông báo");
      return;
    }

    try {
      new Notification("Test Notification", {
        body: "Hệ thống thông báo đang hoạt động bình thường ✅",
        icon: "/favicon.ico",
        badge: "/pwa-192x192.png",
      });
    } catch (error) {
      console.error("[NotificationService] Test notification failed:", error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
