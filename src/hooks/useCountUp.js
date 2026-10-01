import { useState, useEffect } from 'react';

export function useCountUp(targetNumber, duration = 600) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    const num = typeof targetNumber === 'number' ? targetNumber : (Number(targetNumber) || 0);

    // Respeto estricto por usuarios con reducción de movimiento
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrentValue(num);
      return;
    }

    if (num === 0) {
      setCurrentValue(0);
      return;
    }

    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing cúbico easeOut
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(Math.floor(easedProgress * num));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(num);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetNumber, duration]);

  return currentValue;
}

export default useCountUp;
