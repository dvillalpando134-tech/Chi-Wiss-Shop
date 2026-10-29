/* ============================================================
   Catálogo dinámico
   Intenta DummyJSON; si falla, arma un catálogo local curado.
   ============================================================ */

import {
  API_URL,
  CDN_BASE,
  CURATED,
  CATEGORY_LABEL,
  SHIPPING,
  USD_TO_MXN,
} from "./config.js";
import {
  clamp,
  isSafeImageUrl,
  pick,
  randomBetween,
  randomInt,
  roundPrice,
  shuffle,
} from "./format.js";

const TIMEOUT_MS = 9000;

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return Number(randomBetween(3.7, 4.9).toFixed(1));
  return Number(clamp(rating + randomBetween(-0.25, 0.2), 3.2, 5).toFixed(1));
}

function imageFor(entry, apiProduct) {
  const candidates = [
    apiProduct?.thumbnail,
    ...(Array.isArray(apiProduct?.images) ? apiProduct.images : []),
  ].filter(isSafeImageUrl);

  if (candidates.length) return pick(candidates);
  return `${CDN_BASE}/${entry.img}/thumbnail.webp`;
}

function buildProduct(entry, apiProduct, priceFactor) {
  const base = Number(apiProduct?.price) || entry.usd;
  const price = roundPrice(base * priceFactor * randomBetween(0.94, 1.07));

  let discount = Math.round(Number(apiProduct?.discountPercentage) || 0);
  discount = clamp(discount, 0, 45);
  if (discount < 6 && Math.random() < 0.45) discount = randomInt(8, 32);

  const oldPrice =
    discount > 0 ? roundPrice(price / (1 - discount / 100) + 10) : null;

  return {
    id: entry.id,
    name: entry.name,
    category: entry.cat,
    categoryLabel: CATEGORY_LABEL[entry.cat] ?? "Miscelánea",
    price,
    oldPrice,
    discount,
    rating: normalizeRating(apiProduct?.rating),
    reviews: randomInt(18, 940),
    stock: Math.max(1, Number(apiProduct?.stock) || randomInt(4, 60)),
    image: imageFor(entry, apiProduct),
    freeShipping: price >= SHIPPING.freeFrom,
    installments: Math.max(1, Math.ceil(price / 3)),
  };
}

function normalize(apiProducts) {
  const byId = new Map((apiProducts ?? []).map((product) => [product.id, product]));
  const factor = randomBetween(USD_TO_MXN.min, USD_TO_MXN.max);

  return shuffle(CURATED)
    .filter((entry) => byId.has(entry.id))
    .map((entry) => buildProduct(entry, byId.get(entry.id), factor));
}

export function fallbackCatalog() {
  const factor = randomBetween(USD_TO_MXN.min, USD_TO_MXN.max);
  return shuffle(CURATED).map((entry) =>
    buildProduct(entry, null, factor),
  );
}

async function fetchLiveCatalog() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`La API respondió ${response.status}`);
    }

    const payload = await response.json();
    const products = normalize(payload?.products);

    if (products.length < 8) {
      throw new Error("La API devolvió muy pocos productos del catálogo curado");
    }

    return { products, source: "live", error: null };
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Carga el catálogo. Nunca rechaza: ante cualquier error devuelve
 * el catálogo local y el error para mostrarlo en la interfaz.
 */
export async function loadCatalog() {
  try {
    return await fetchLiveCatalog();
  } catch (error) {
    return {
      products: fallbackCatalog(),
      source: "local",
      error,
    };
  }
}
