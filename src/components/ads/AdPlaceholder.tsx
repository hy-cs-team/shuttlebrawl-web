// src/components/ads/AdPlaceholder.tsx
type AdSize = "728x90" | "300x250" | "336x280" | "320x100" | "160x600";

const SIZE_MAP: Record<AdSize, { w: number; h: number }> = {
  "728x90": { w: 728, h: 90 }, // Leaderboard (desktop top)
  "300x250": { w: 300, h: 250 }, // Medium rectangle (in-article)
  "336x280": { w: 336, h: 280 }, // Large rectangle (in-article)
  "320x100": { w: 320, h: 100 }, // Large mobile banner (mobile top/bottom)
  "160x600": { w: 160, h: 600 }, // Wide skyscraper (sidebar)
};

export default function AdPlaceholder({
  size,
  label = "Ad placeholder",
  className,
}: {
  size: AdSize;
  label?: string;
  className?: string;
}) {
  const { w, h } = SIZE_MAP[size];
  return (
    <div
      className={className}
      style={{
        // Always reserve space to avoid CLS
        width: "100%",
        maxWidth: w,
        height: h,
        borderRadius: 8,
        border: "1px dashed #9aa",
        background:
          "repeating-linear-gradient(45deg, #eef, #eef 10px, #dde 10px, #dde 20px)",
        color: "#445",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        fontSize: 12,
        margin: "0 auto",
      }}
    >
      {/* Keep exact size label to design layout */}
      {label} · {size}
    </div>
  );
}
