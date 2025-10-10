import { useEffect, useState } from "react";

export default function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // 🔔 Lắng nghe Service Worker gửi message yêu cầu reload
      const handleSWMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "RELOAD_PAGE") {
          console.log("[PWA] Received RELOAD_PAGE from Service Worker");
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("message", handleSWMessage);

      // 🚀 Khi có Service Worker mới đang cài đặt
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[PWA] New Service Worker available");
              setWaitingWorker(registration.waiting);
              setShowReload(true);
            }
          });
        });
      });

      // 🔄 Khi Service Worker mới được kích hoạt → reload app
      const handleControllerChange = () => {
        console.log("[PWA] Controller changed — reloading app");
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      // 🧹 Cleanup khi component bị unmount
      return () => {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }
  }, []);

  // 👇 Gửi lệnh cho SW mới skip waiting và chiếm quyền
  const reloadPage = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return { showReload, reloadPage };
}
