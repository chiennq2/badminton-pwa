import { useEffect, useState } from 'react';

export default function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Lắng nghe sự kiện khi có Service Worker mới đang chờ
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Có phiên bản mới
              setWaitingWorker(registration.waiting);
              setShowReload(true);
            }
          });
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const reloadPage = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return { showReload, reloadPage };
}