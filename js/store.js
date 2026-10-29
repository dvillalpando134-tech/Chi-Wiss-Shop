/* ============================================================
   Estado compartido (pub/sub) + persistencia en localStorage
   ============================================================ */

import {
  INITIAL_BALANCE,
  RIVAL,
  STORAGE_KEY,
} from "./config.js";
import { clamp } from "./format.js";

const listeners = new Set();

const state = {
  products: [],
  loading: true,
  source: "loading", // loading | live | local
  catalogError: null,
  filters: {
    query: "",
    category: "all",
    sort: "relevance",
    offers: false,
  },
  cart: [],
  casino: {
    balance: INITIAL_BALANCE,
    rivalBalance: RIVAL.initialBalance,
    history: [],
  },
};

/* ---------- Persistencia ---------- */

const maxQty = (stock) => Math.min(20, Math.max(1, Number(stock) || 20));

function sanitizeCart(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && Number.isFinite(Number(item.id)))
    .map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? "Producto"),
      category: String(item.category ?? "miscelanea"),
      categoryLabel: String(item.categoryLabel ?? "Miscelánea"),
      price: Math.max(0, Math.round(Number(item.price) || 0)),
      image: String(item.image ?? ""),
      stock: Math.max(1, Number(item.stock) || 20),
      freeShipping: Boolean(item.freeShipping),
      qty: clamp(Math.round(Number(item.qty) || 1), 1, maxQty(item.stock)),
    }))
    .filter((item) => item.price > 0);
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .slice(0, 30)
    .map((entry) => ({
      id: String(entry.id ?? ""),
      game: String(entry.game ?? "roulette"),
      gameLabel: String(entry.gameLabel ?? "Juego"),
      betLabel: String(entry.betLabel ?? "Apuesta"),
      resultLabel: String(entry.resultLabel ?? "Resultado"),
      stake: Math.max(0, Math.round(Number(entry.stake) || 0)),
      multiplier: Math.max(1, Number(entry.multiplier) || 1),
      win: Boolean(entry.win),
      profit: Math.round(Number(entry.profit) || 0),
      rivalLabel: String(entry.rivalLabel ?? ""),
      rivalWin: Boolean(entry.rivalWin),
      rivalProfit: Math.round(Number(entry.rivalProfit) || 0),
      createdAt: Number(entry.createdAt) || Date.now(),
    }));
}

function restore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.cart = sanitizeCart(saved?.cart);

    const casino = saved?.casino;
    if (casino && typeof casino === "object") {
      state.casino.balance = Math.round(Number(casino.balance) || 0);
      state.casino.rivalBalance = Math.round(
        Number(casino.rivalBalance) || RIVAL.initialBalance,
      );
      state.casino.history = sanitizeHistory(casino.history);
    }
  } catch {
    /* localStorage lleno, bloqueado o JSON corrupto: seguimos en memoria */
  }
}

function persist() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cart: state.cart, casino: state.casino }),
    );
  } catch {
    /* Modo privado o cuota llena: la demo funciona igual en memoria */
  }
}

restore();

/* ---------- Pub/sub ---------- */

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(changed) {
  for (const listener of listeners) listener(state, changed);
}

/* ---------- Catálogo ---------- */

export function getState() {
  return state;
}

export function setCatalogLoading() {
  state.loading = true;
  state.source = "loading";
  emit(["products"]);
}

export function setCatalog({ products, source, error = null }) {
  state.products = Array.isArray(products) ? products : [];
  state.source = source;
  state.catalogError = error;
  state.loading = false;
  emit(["products"]);
}

/* ---------- Filtros ---------- */

export function setFilters(patch) {
  state.filters = { ...state.filters, ...patch };
  emit(["filters"]);
}

export function resetFilters() {
  state.filters = {
    query: "",
    category: "all",
    sort: "relevance",
    offers: false,
  };
  emit(["filters"]);
}

/* ---------- Carrito ---------- */

export function addToCart(product, quantity = 1) {
  if (!product) return;

  const existing = state.cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty = clamp(
      existing.qty + quantity,
      1,
      maxQty(existing.stock),
    );
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      category: product.category,
      categoryLabel: product.categoryLabel,
      price: product.price,
      image: product.image,
      stock: product.stock,
      freeShipping: product.freeShipping,
      qty: clamp(quantity, 1, maxQty(product.stock)),
    });
  }

  persist();
  emit(["cart"]);
}

export function setQuantity(id, quantity) {
  const item = state.cart.find((line) => line.id === id);
  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }

  item.qty = clamp(Math.round(quantity), 1, maxQty(item.stock));
  persist();
  emit(["cart"]);
}

export function removeFromCart(id) {
  const before = state.cart.length;
  state.cart = state.cart.filter((item) => item.id !== id);
  if (state.cart.length === before) return;
  persist();
  emit(["cart"]);
}

export function clearCart() {
  if (!state.cart.length) return;
  state.cart = [];
  persist();
  emit(["cart"]);
}

export function getCartCount() {
  return state.cart.reduce((total, item) => total + item.qty, 0);
}

export function getSubtotal() {
  return state.cart.reduce((total, item) => total + item.price * item.qty, 0);
}

export function getCartLines() {
  return state.cart.map((item) => ({
    ...item,
    lineTotal: item.price * item.qty,
  }));
}

/* ---------- Casino ---------- */

export function settleRound({ entry, profit, rivalProfit }) {
  const safeProfit = Math.round(Number(profit) || 0);
  const safeRivalProfit = Math.round(Number(rivalProfit) || 0);

  state.casino.balance += safeProfit;
  state.casino.rivalBalance += safeRivalProfit;
  state.casino.history = [entry, ...state.casino.history].slice(0, 30);

  persist();
  emit(["casino"]);
}

export function resetCasino() {
  state.casino = {
    balance: INITIAL_BALANCE,
    rivalBalance: RIVAL.initialBalance,
    history: [],
  };
  persist();
  emit(["casino"]);
}

/* ---------- Suscripción entre pestañas ---------- */

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const saved = JSON.parse(event.newValue);
    state.cart = sanitizeCart(saved?.cart);
    const casino = saved?.casino;
    if (casino) {
      state.casino.balance = Math.round(Number(casino.balance) || 0);
      state.casino.rivalBalance = Math.round(
        Number(casino.rivalBalance) || RIVAL.initialBalance,
      );
      state.casino.history = sanitizeHistory(casino.history);
    }
    emit(["cart", "casino"]);
  } catch {
    /* ignorar mensajes de storage inválidos */
  }
});
