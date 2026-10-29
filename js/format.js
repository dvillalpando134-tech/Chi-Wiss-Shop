/* ============================================================
   Utilidades de formato y azar
   ============================================================ */

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Formatea un número como peso mexicano: $12,990 */
export function formatMXN(value) {
  return mxn.format(Math.round(Number(value) || 0));
}

/** Formatea un monto con signo: +$12,990 / −$12,990 */
export function formatSigned(value) {
  const amount = Math.abs(Math.round(Number(value) || 0));
  return `${value >= 0 ? "+" : "−"}${formatMXN(amount)}`;
}

/** Redondea un precio para que termine en 9: $599, $1,299. */
export function roundPrice(value, step = 10) {
  return Math.max(9, Math.round(value / step) * step - 1);
}

/** Escapa texto antes de inyectarlo como HTML. */
export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Baraja sin mutar el arreglo original. */
export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function debounce(fn, wait = 250) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Devuelve un texto relativo simple: "hace 3 s", "hace 2 min". */
export function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "ahora";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}

/** Hora corta local: 21:04 */
export function formatTime(timestamp) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

/**
 * Anima un número dentro de un elemento.
 * Si el usuario prefiere movimiento reducido, salta al valor final.
 */
export function animateNumber(element, from, to, duration = 650) {
  if (!element) return;
  const start = Number(from) || 0;
  const end = Number(to) || 0;

  if (prefersReducedMotion() || document.hidden || start === end) {
    element.textContent = formatMXN(end);
    return;
  }

  const startedAt = performance.now();
  const difference = end - start;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    element.textContent = formatMXN(end);
  };

  const frame = (now) => {
    if (finished) return;
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatMXN(start + difference * eased);
    if (progress < 1) requestAnimationFrame(frame);
    else finished = true;
  };

  requestAnimationFrame(frame);
  // Respaldo: si la pestaña queda oculta, rAF se pausa y el saldo quedaría obsoleto.
  window.setTimeout(finish, duration + 120);
}

/** Solo acepta URLs http(s) para evitar esquemas peligrosos. */
export function isSafeImageUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

/** Genera una imagen SVG de respaldo con la inicial del producto. */
export function fallbackImage(label = "CW") {
  const initial = escapeHTML(String(label).trim().charAt(0).toUpperCase() || "C");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 300">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#EFE4FF"/>
          <stop offset="1" stop-color="#D9C8FF"/>
        </linearGradient>
      </defs>
      <rect width="320" height="300" fill="url(#g)"/>
      <circle cx="160" cy="138" r="54" fill="#FFFBF4" opacity=".72"/>
      <text x="160" y="158" font-family="Sora, Segoe UI, sans-serif" font-size="52"
        font-weight="600" fill="#2A1038" text-anchor="middle">${initial}</text>
      <text x="160" y="238" font-family="Sora, Segoe UI, sans-serif" font-size="13"
        letter-spacing="4" fill="#6B5A75" text-anchor="middle">CHI-WISS</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
