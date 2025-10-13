import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh?: () => void | Promise<void>;
}

export default function usePullToRefresh(options: UsePullToRefreshOptions = {}) {
  const { threshold = 100, onRefresh } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const maxPullRef = useRef(0);

  const resetPull = useCallback(() => {
    setIsPulling(false);
    setPullProgress(0);
    startYRef.current = 0;
    currentYRef.current = 0;
    maxPullRef.current = 0;
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Chỉ kích hoạt nếu ở đầu trang
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      if (scrollTop <= 0 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = e.touches[0].clientY;
        setIsPulling(true);
        maxPullRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshingRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        resetPull();
        return;
      }

      currentYRef.current = e.touches[0].clientY;
      const diff = Math.max(0, currentYRef.current - startYRef.current);

      if (diff > 0) {
        // Giảm resistance khi kéo xa
        const resistance = diff > threshold ? 0.5 : 1;
        const calculatedProgress = Math.min((diff / threshold) * resistance + (diff > threshold ? 0.5 : 0), 2);

        maxPullRef.current = Math.max(maxPullRef.current, diff);
        setPullProgress(Math.min(calculatedProgress, 1.5)); // Cap ở 1.5 để visual

        // Prevent default chỉ khi kéo đủ
        if (diff > 20) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      const diff = currentYRef.current - startYRef.current;
      const shouldRefresh = diff >= threshold;

      if (shouldRefresh) {
        isRefreshingRef.current = true;
        setPullProgress(1);

        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.location.reload();
          }
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          isRefreshingRef.current = false;
          resetPull();
        }
      } else {
        // Animation spring back
        setPullProgress(0);
        setTimeout(() => {
          resetPull();
        }, 300);
      }
    };

    // Use passive: false để có thể preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, threshold, onRefresh, resetPull]);

  return {
    isPulling,
    pullProgress,
    isRefreshing: isRefreshingRef.current,
  };
}