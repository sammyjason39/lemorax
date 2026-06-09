import { brand } from "@/lib/brand";

interface AriesLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showTagline?: boolean;
}

const SIZES = {
  sm: { mark: 28, wordmark: "text-sm", tag: "text-[10px]" },
  md: { mark: 36, wordmark: "text-lg", tag: "text-[11px]" },
  lg: { mark: 48, wordmark: "text-2xl", tag: "text-xs" },
};

export function AriesLogo({
  size = "md",
  showWordmark = true,
  showTagline = false,
}: AriesLogoProps) {
  const s = SIZES[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center shrink-0 font-sans font-extrabold text-white"
        style={{
          width: s.mark,
          height: s.mark,
          borderRadius: size === "sm" ? 8 : 10,
          background: brand.blue,
          fontSize: size === "sm" ? 14 : size === "md" ? 17 : 22,
          letterSpacing: "-0.03em",
        }}
      >
        A
      </div>
      {showWordmark && (
        <div>
          <div
            className={`${s.wordmark} font-sans font-extrabold leading-none`}
            style={{ color: brand.blue, letterSpacing: "-0.04em" }}
          >
            ARIES
          </div>
          {showTagline && (
            <div
              className={`${s.tag} mt-1 font-sans font-semibold`}
              style={{ color: "var(--text-secondary)" }}
            >
              PT Lemorax
            </div>
          )}
        </div>
      )}
    </div>
  );
}
