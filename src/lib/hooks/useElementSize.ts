import { useState, useEffect, RefObject } from 'react';

export function useElementSize<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T>
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const updateSize = () => {
      if (ref.current) {
        setSize({
          width: ref.current.clientWidth,
          height: ref.current.clientHeight,
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
}

