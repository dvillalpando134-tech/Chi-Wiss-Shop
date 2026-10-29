/* ============================================================
   Tienda · catálogo, filtros y tarjetas
   ============================================================ */

import { loadCatalog } from "./api.js";
import { CATEGORIES } from "./config.js";
import {
  addToCart,
  getState,
  resetFilters,
  setCatalog,
  setCatalogLoading,
  setFilters,
  subscribe,
} from "./store.js";
import {
  bumpCart,
  markAdded,
  productCard,
  skeletonCards,
  toast,
} from "./ui.js";

let elements = {};
let requestTicket = 0;
let initialized = false;

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function matches(product, filters) {
  if (filters.category !== "all" && product.category !== filters.category) {
    return false;
  }

  if (filters.offers && product.discount < 10) {
    return false;
  }

  if (filters.query) {
    const haystack = fold(`${product.name} ${product.categoryLabel}`);
    if (!haystack.includes(fold(filters.query))) return false;
  }

  return true;
}

function sortProducts(products, sort) {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "discount":
      return copy.sort((a, b) => b.discount - a.discount);
    default:
      return copy;
  }
}

function categoriesInUse(products) {
  const counts = new Map();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }
  return CATEGORIES.filter((category) => counts.has(category.key)).map(
    (category) => ({ ...category, count: counts.get(category.key) }),
  );
}

function renderCategories(state) {
  const { categoryScroller } = elements;
  if (!categoryScroller) return;

  const categories = categoriesInUse(state.products);
  const active = state.filters.category;

  const chips = [
    `<button class="chip" type="button" data-category="all" aria-pressed="${
      active === "all"
    }">Todo <span class="chip__count">${state.products.length}</span></button>`,
    ...categories.map(
      (category) => `
        <button class="chip" type="button" data-category="${category.key}"
          aria-pressed="${active === category.key}">
          ${category.label} <span class="chip__count">${category.count}</span>
        </button>`,
    ),
  ];

  categoryScroller.innerHTML = chips.join("");
}

function updateSource(state) {
  const { sourceChip, sourceLabel } = elements;
  if (!sourceChip || !sourceLabel) return;

  sourceChip.classList.remove("is-live", "is-local", "is-loading");

  if (state.source === "live") {
    sourceChip.classList.add("is-live");
    sourceLabel.textContent = "DummyJSON · en vivo";
    sourceChip.title = "Productos e imágenes obtenidos en vivo desde DummyJSON.";
  } else if (state.source === "local") {
    sourceChip.classList.add("is-local");
    sourceLabel.textContent = "Catálogo local";
    sourceChip.title =
      "No fue posible conectar la API. Se muestra el catálogo curado de respaldo.";
  } else {
    sourceChip.classList.add("is-loading");
    sourceLabel.textContent = "Conectando API";
    sourceChip.title = "Conectando con el catálogo dinámico…";
  }
}

function renderCatalog(state) {
  const { productGrid, catalogMeta, catalogEmpty, sourceLabel } = elements;
  if (!productGrid) return;

  updateSource(state);

  if (state.loading) {
    productGrid.hidden = false;
    productGrid.setAttribute("aria-busy", "true");
    productGrid.innerHTML = skeletonCards(8);
    if (catalogMeta) catalogMeta.textContent = "Conectando con el catálogo…";
    if (catalogEmpty) catalogEmpty.hidden = true;
    return;
  }

  renderCategories(state);

  const visible = sortProducts(
    state.products.filter((product) => matches(product, state.filters)),
    state.filters.sort,
  );

  productGrid.setAttribute("aria-busy", "false");
  productGrid.hidden = visible.length === 0;
  productGrid.innerHTML = visible.map(productCard).join("");

  if (catalogEmpty) catalogEmpty.hidden = visible.length > 0;

  if (catalogMeta) {
    const origin =
      state.source === "live"
        ? "DummyJSON en vivo"
        : "catálogo local de respaldo";
    catalogMeta.textContent = `${visible.length} de ${state.products.length} objetos · ${origin} · Precios demo en MXN`;
  }

  if (sourceLabel && state.catalogError) {
    sourceLabel.parentElement.title =
      "La API no respondió. Estás viendo el catálogo local.";
  }
}

function setReloading(isReloading) {
  const button = elements.reloadCatalog;
  if (!button) return;
  button.classList.toggle("is-spinning", isReloading);
  button.disabled = isReloading;
}

async function requestCatalog() {
  const ticket = ++requestTicket;
  setReloading(true);
  setCatalogLoading();

  const result = await loadCatalog();
  if (ticket !== requestTicket) return;

  setCatalog(result);
  setReloading(false);

  if (result.error) {
    toast(
      "La API no respondió. Cargamos el catálogo local para que sigas explorando.",
      "info",
      4600,
    );
  } else {
    toast(`Catálogo actualizado: ${result.products.length} objetos.`, "success", 2600);
  }
}

/* ---------- Acciones públicas ---------- */

export function reloadCatalog() {
  return requestCatalog();
}

export function revealCatalog() {
  window.setTimeout(() => {
    document.getElementById("catalogo")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 80);
}

export function showOffers() {
  setFilters({ offers: true, category: "all" });
  revealCatalog();
}

export function searchProducts(query) {
  setFilters({ query: String(query ?? "").trim() });
}

/* ---------- Init ---------- */

export function initShop() {
  if (initialized) return;
  initialized = true;

  elements = {
    productGrid: document.getElementById("productGrid"),
    catalogMeta: document.getElementById("catalogMeta"),
    catalogEmpty: document.getElementById("catalogEmpty"),
    sourceChip: document.getElementById("sourceChip"),
    sourceLabel: document.getElementById("sourceLabel"),
    reloadCatalog: document.getElementById("reloadCatalog"),
    categoryScroller: document.getElementById("categoryScroller"),
    offersToggle: document.getElementById("offersToggle"),
    sortSelect: document.getElementById("sortSelect"),
    clearFilters: document.getElementById("clearFilters"),
  };

  elements.reloadCatalog?.addEventListener("click", () => requestCatalog());

  elements.categoryScroller?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    setFilters({ category: chip.dataset.category });
  });

  elements.offersToggle?.addEventListener("click", () => {
    const { offers } = getState().filters;
    setFilters({ offers: !offers });
  });

  elements.sortSelect?.addEventListener("change", (event) => {
    setFilters({ sort: event.target.value });
  });

  elements.clearFilters?.addEventListener("click", () => {
    resetFilters();
    elements.sortSelect.value = "relevance";
  });

  elements.productGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add]");
    if (!button) return;

    const id = Number(button.dataset.add);
    const product = getState().products.find((item) => item.id === id);
    if (!product) return;

    addToCart(product);
    markAdded(button);
    bumpCart();
    toast(`${product.name} se agregó a tu bolsa.`, "success", 2400);
  });

  subscribe((state, changed) => {
    if (changed.includes("products") || changed.includes("filters")) {
      renderCatalog(state);
      if (elements.offersToggle) {
        elements.offersToggle.setAttribute(
          "aria-pressed",
          String(state.filters.offers),
        );
      }
    }
  });

  renderCatalog(getState());
  requestCatalog();
}
