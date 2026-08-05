import { useEffect, useRef } from "react";

export function InfiniteScrollSentinel({
  disabled,
  onVisible,
}: {
  disabled: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: "250px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, onVisible]);

  return <div ref={ref} className="h-1" aria-hidden="true" />;
}
