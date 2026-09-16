import net from "net";

/**
 * Instagram CDN hosts (scontent-*.cdninstagram.com) advertise unreachable
 * IPv6 addresses. Node's Happy Eyeballs default attempt timeout is too long,
 * which makes fetch hang until ETIMEDOUT instead of falling back to IPv4.
 * Lowering the attempt timeout makes the fallback fast. Idempotent.
 */
let configured = false;

export function configureInstagramFetch() {
  if (configured) return;
  try {
    net.setDefaultAutoSelectFamily(true);
    net.setDefaultAutoSelectFamilyAttemptTimeout(300);
    configured = true;
  } catch {
    /* older Node — no-op */
  }
}