"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatPct } from "@/lib/formatters";
import { brand, domain } from "@/lib/brand";
import { X, ExternalLink, Heart, MessageCircle, Eye, BarChart3, Hash, AtSign, MapPin, Calendar } from "lucide-react";

export type ModalPost = {
  id: string;
  caption: null | string;
  media_type: null | string;
  post_url: null | string;
  thumbnail_url: null | string;
  published_at: null | string;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
  raw: null | {
    proxiedVideoUrl?: null | string;
    videoViewCount?: number;
    hashtags?: string[];
    mentions?: string[];
    locationName?: null | string;
    productType?: null | string;
    alt?: null | string;
  };
};

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-lg font-extrabold font-tabular" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

export function PostDetailModal({ post, avgER, onClose }: { post: ModalPost; avgER: number; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isVideo = /video|reel|igtv|clip/i.test(post.media_type || "");
  const videoUrl = post.raw?.proxiedVideoUrl || null;
  const views = Number(post.raw?.videoViewCount) || 0;
  const hashtags: string[] = Array.isArray(post.raw?.hashtags) ? post.raw!.hashtags! : [];
  const mentions: string[] = Array.isArray(post.raw?.mentions) ? post.raw!.mentions! : [];
  const location = post.raw?.locationName || null;
  const productType = post.raw?.productType || null;

  const erDelta = post.engagement_rate - avgER;
  const erBetter = erDelta >= 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(10,14,25,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col md:flex-row"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", boxShadow: "0 40px 90px -30px rgba(10,14,25,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="md:w-[54%] shrink-0 flex items-center justify-center relative" style={{ background: "#0c1222", minHeight: 280 }}>
          {isVideo && videoUrl ? (
            <video src={videoUrl} controls autoPlay playsInline className="w-full h-full object-contain" style={{ maxHeight: "92vh" }} />
          ) : post.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.thumbnail_url} alt={(post.caption || "Konten").slice(0, 120)} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-sm" style={{ color: "#94A3B8" }}>
              Media tidak tersedia
            </div>
          )}
          <span
            className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            {isVideo ? "Video" : "Image"}
            {productType ? ` · ${productType}` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full p-1.5 md:hidden"
            style={{ background: "rgba(0,0,0,0.6)" }}
            aria-label="Tutup"
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Analytics panel */}
        <div className="flex-1 min-w-0 flex flex-col max-h-[92vh]">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Analisa Konten
              </p>
              <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <Calendar size={12} color={brand.blue} />
                {post.published_at
                  ? new Date(post.published_at).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-black/5" aria-label="Tutup">
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <StatCell icon={<Heart size={11} />} label="Likes" value={(post.likes || 0).toLocaleString("id-ID")} color={brand.danger} />
              <StatCell icon={<MessageCircle size={11} />} label="Komentar" value={(post.comments || 0).toLocaleString("id-ID")} color={domain.crm} />
              <StatCell icon={<Eye />} label="Views" value={views ? views.toLocaleString("id-ID") : "—"} color={brand.violet} />
              <StatCell icon={<Eye />} label="Reach" value={(post.reach || 0).toLocaleString("id-ID")} color={domain.marketing} />
              <StatCell icon={<Eye />} label="Impressions" value={(post.impressions || 0).toLocaleString("id-ID")} color={brand.blue} />
              <StatCell icon={<BarChart3 size={11} />} label="ER" value={formatPct(post.engagement_rate)} color={brand.emerald} />
            </div>

            <div
              className="rounded-xl p-3 flex items-center justify-between text-xs"
              style={{
                background: erBetter ? brand.emeraldSoft : brand.dangerSoft,
                border: `1px solid ${erBetter ? "rgba(0,168,132,0.25)" : "rgba(224,84,84,0.25)"}`,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>vs rata-rata ER akun ({formatPct(avgER)})</span>
              <span className="font-bold" style={{ color: erBetter ? brand.emerald : brand.danger }}>
                {erBetter ? "+" : ""}
                {erDelta.toFixed(2)}%
              </span>
            </div>

            {post.caption && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Caption
                </p>
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                  {post.caption}
                </p>
              </div>
            )}

            {hashtags.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                  <Hash size={10} /> Hashtags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.slice(0, 12).map((h) => (
                    <span key={h} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: brand.violetSoft, color: brand.violet }}>
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mentions.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                  <AtSign size={10} /> Mentions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mentions.slice(0, 10).map((m) => (
                    <span key={m} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: brand.blueSoft, color: brand.blue }}>
                      @{m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {location && (
              <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <MapPin size={12} color={domain.crm} /> {location}
              </p>
            )}

            {post.raw?.alt && (
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Alt: {post.raw.alt}
              </p>
            )}

            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Reach & impressions diestimasi dari engagement saat sync (bukan Instagram API resmi).
            </p>
          </div>

          <div className="px-5 py-3.5 border-t" style={{ borderColor: "var(--border)" }}>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-75"
                style={{ color: brand.blue }}
              >
                <ExternalLink size={12} /> Buka di Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}