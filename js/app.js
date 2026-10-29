/* ============================================================
   Bootstrap · header, búsqueda, menú, ruteo y secciones
   ============================================================ */

import { debounce, formatMXN } from "./format.js";
import { initCart, closeCart } from "./cart.js";
import { initCasino, mountCasino, unmountCasino } from "./casino.js";
import {
  initShop,
  revealCatalog,
  searchProducts,
  showOffers,
} from "./shop.js";
import { getState, subscribe } from "./store.js";
import { initImageFallback, toast } from "./ui.js";

let currentView = "shop";
let menuOpen = false;

const els = {};

function cacheElements() {
  els.header = document.getElementById("siteHeader");
  els.shopView = document.getElementById("shopView");
  els.casinoView = document.getElementById("casinoView");
  els.menuDialog = document.getElementById("menuDialog");
  els.menuTrigger = document.getElementById("menuTrigger");
  els.themeColor = document.querySelector('meta[name="theme-color"]');
  els.searchInputs = [...document.querySelectorAll("[data-search-form] input[name='q']")];
  els.searchForms = [...document.querySelectorAll("[data-search-form]")];
  els.navLinks = [...document.querySelectorAll("[data-nav]")];
}

/* ---------- Header ---------- */

function initHeader() {
  const onScroll = () => {
    els.header?.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Menú móvil ---------- */

function openMenu() {
  if (!els.menuDialog || els.menuDialog.open) return;
  closeCart();
  els.menuDialog.showModal();
  document.body.classList.add("no-scroll");
  els.menuTrigger?.setAttribute("aria-expanded", "true");
  menuOpen = true;
}

function closeMenu() {
  if (!els.menuDialog?.open) return;
  els.menuDialog.close();
  els.menuTrigger?.setAttribute("aria-expanded", "false");
  menuOpen = false;
  document.body.classList.remove("no-scroll");
}

function initMenu() {
  els.menuTrigger?.addEventListener("click", () => {
    if (els.menuDialog?.open) closeMenu();
    else openMenu();
  });

  document
    .querySelectorAll("[data-close-menu]")
    .forEach((button) => button.addEventListener("click", closeMenu));

  els.menuDialog?.addEventListener("click", (event) => {
    if (event.target === els.menuDialog) closeMenu();
    if (event.target.closest("a[href], [data-offers]")) closeMenu();
  });

  els.menuDialog?.addEventListener("close", () => {
    menuOpen = false;
    els.menuTrigger?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  });

  els.menuDialog?.addEventListener("cancel", () => {
    menuOpen = false;
    els.menuTrigger?.setAttribute("aria-expanded", "false");
  });
}

/* ---------- Búsqueda ---------- */

function goToShop() {
  if (currentView !== "shop") {
    window.location.hash = "#/";
  }
}

function submitSearch(value) {
  searchProducts(value);
  goToShop();
  closeMenu();
  window.setTimeout(revealCatalog, 120);
}

function initSearch() {
  els.searchForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input[name='q']");
      submitSearch(input?.value ?? "");
    });
  });

  const liveSearch = debounce((value) => {
    searchProducts(value);
  }, 260);

  els.searchInputs.forEach((input) => {
    input.addEventListener("input", () => liveSearch(input.value));
  });
}

/* ---------- Ruteo ---------- */

function routeFromHash() {
  return window.location.hash === "#/casino" ? "casino" : "shop";
}

function setActiveNav(view) {
  els.navLinks.forEach((link) => {
    if (link.dataset.nav === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function syncRoute({ scroll = true } = {}) {
  const route = routeFromHash();
  const changed = route !== currentView;
  currentView = route;

  document.body.dataset.view = route;
  if (els.shopView) els.shopView.hidden = route !== "shop";
  if (els.casinoView) els.casinoView.hidden = route !== "casino";

  setActiveNav(route);
  closeMenu();

  if (route === "casino") {
    mountCasino();
    document.title = "Casino · Chi-Wiss";
    els.themeColor?.setAttribute("content", "#160B20");
  } else {
    unmountCasino();
    document.title = "Chi-Wiss · Miscelánea curada";
    els.themeColor?.setAttribute("content", "#FFFBF4");
  }

  if (changed && scroll) {
    // "instant" evita que el scroll suave de CSS arrastre la posición entre vistas.
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function scrollToHashTarget() {
  const hash = window.location.hash;
  if (!hash || hash.startsWith("#/") || hash.length < 2) return;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;

  window.setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

function initRouter() {
  window.addEventListener("hashchange", () => {
    syncRoute();
    scrollToHashTarget();
  });

  syncRoute({ scroll: false });
  scrollToHashTarget();

  // Si ya estamos en la tienda, el logo lleva al inicio de la página.
  document.querySelector(".brand")?.addEventListener("click", () => {
    if (routeFromHash() === "shop") {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
    }
  });
}

/* ---------- Secciones y formularios ---------- */

function initOffers() {
  document.querySelectorAll("[data-offers]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      goToShop();
      showOffers();
    });
  });
}

function initNewsletter() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input[type='email']");
    if (!input) return;

    if (!input.value.trim() || !input.checkValidity()) {
      toast("Escribe un correo válido para suscribirte.", "error");
      input.focus();
      return;
    }

    toast(
      `Listo. ${input.value.trim()} quedó en la lista demo (no se envían correos).`,
      "success",
      4200,
    );
    form.reset();
  });
}

function initDemoLinks() {
  document.querySelectorAll("[data-demo-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.textContent.trim() || "Sección";
      toast(`${label}: contenido simulado para esta demo.`, "info", 3000);
    });
  });
}

function initYear() {
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
}

function initSearchSync() {
  subscribe((state, changed) => {
    if (!changed.includes("filters")) return;
    els.searchInputs.forEach((input) => {
      if (document.activeElement !== input) input.value = state.filters.query;
    });
  });
}

/* ---------- Arranque ---------- */

function boot() {
  cacheElements();
  initImageFallback();
  initHeader();
  initMenu();
  initSearch();
  initSearchSync();
  initOffers();
  initNewsletter();
  initDemoLinks();
  initYear();

  initCart();
  initCasino();
  initShop();

  initRouter();

  // Mantiene el saldo del menú sincronizado aunque el casino no esté montado.
  const syncMenuBalance = () => {
    const menuBalance = document.getElementById("menuBalance");
    if (menuBalance) menuBalance.textContent = formatMXN(getState().casino.balance);
  };

  subscribe((state, changed) => {
    if (changed.includes("casino")) syncMenuBalance();
  });

  syncMenuBalance();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
