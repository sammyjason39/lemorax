import { brand } from "@/lib/brand";

interface AirinLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showTagline?: boolean;
}

const SIZES = {
  sm: { markHeight: 16, wordmark: "text-sm", tag: "text-[10px]" },
  md: { markHeight: 21, wordmark: "text-lg", tag: "text-[11px]" },
  lg: { markHeight: 28, wordmark: "text-2xl", tag: "text-xs" },
};

export function AirinLogo({
  size = "md",
  showWordmark = true,
  showTagline = false,
}: AirinLogoProps) {
  const s = SIZES[size];

  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/airin-wordmark.svg"
        alt="Airin"
        style={{ height: s.markHeight, width: "auto", filter: `drop-shadow(0 0 12px ${brand.blue}55)` }}
      />
      {showTagline && (
        <div className={`${s.tag} font-sans font-semibold`} style={{ color: "var(--text-secondary)" }}>
          PT Lemorax
        </div>
      )}
    </div>
  );
}