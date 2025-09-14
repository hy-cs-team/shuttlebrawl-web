import React, { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

type Props = {
  slot: string;                       // data-ad-slot from AdSense UI
  style?: React.CSSProperties;        // reserve height to avoid CLS
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
  // Optional: turn off in dev/staging
  enabled?: boolean;
};

export default function AdsenseBox({
  slot,
  style,
  format = "auto",
  responsive = true,
  className,
  enabled = true,
}: Props) {
  useEffect(() => {
    if (!enabled) return;
    try {
      // Re-request an ad when the component mounts (or slot changes)
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ads can fail silently on dev or if account/site not approved yet
      console.debug("[adsense] push failed:", e);
    }
  }, [slot, enabled]);

  if (!enabled) return null;

  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", ...(style ?? {}) }}
      data-ad-client="ca-pub-2988947633391165"  // <-- your ID
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}