/* ============================================================
   Piezas de interfaz reutilizables
   ============================================================ */

import { formatMXN, escapeHTML, fallbackImage } from "./format.js";
import { SHIPPING } from "./config.js";

/** Marca compartida del sprite de iconos. */
export function icon(name, className = "icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

/* ---------- Toasts ---------- */

const TOAST_ICONS = {
  success: "check",
  error: "alert",
  info: "spark",
};

export function toast(message, type = "info", duration = 3600) {
  const region = document.getElementById("toastRegion");
  if (!region) return;

  while (region.children.length >= 3) {
    region.firstElementChild?.remove();
  }

  const element = document.createElement("div");
  element.className = `toast toast--${type}`;
  element.setAttribute("role", "status");
  element.innerHTML = icon(TOAST_ICONS[type] ?? "spark");
  const text = document.createElement("span");
  text.textContent = message;
  element.append(text);
  region.append(element);

  window.setTimeout(() => {
    element.classList.add("is-out");
    window.setTimeout(() => element.remove(), 220);
  }, duration);
}

/* ---------- Anuncios de accesibilidad ---------- */

let announceTimer = 0;

export function announce(message) {
  const region = document.getElementById("casinoAnnouncer");
  if (!region) return;
  region.textContent = "";
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    region.textContent = message;
  }, 60);
}

/* ---------- Imágenes ---------- */

export function initImageFallback() {
  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.fallbackApplied === "1") return;
      image.dataset.fallbackApplied = "1";
      image.src = fallbackImage(image.dataset.fallback || image.alt || "Chi-Wiss");
    },
    true,
  );
}

/* ---------- Tarjeta de producto ---------- */

function shippingMarkup(product) {
  if (product.freeShipping) {
    return `<span class="product-card__shipping">${icon("truck")} Envío gratis</span>`;
  }
  return `<span class="product-card__shipping is-paid">${icon("truck")} Envío desde ${formatMXN(
    SHIPPING.cost,
  )}</span>`;
}

export function productCard(product) {
  const name = escapeHTML(product.name);
  const category = escapeHTML(product.categoryLabel);
  const discount =
    product.discount > 0
      ? `<span class="product-card__discount">−${product.discount}%</span>`
      : "";

  const oldPrice =
    product.oldPrice && product.oldPrice > product.price
      ? `<span class="product-card__was">${formatMXN(product.oldPrice)}</span>`
      : "";

  return `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card__media">
        ${discount}
        <img
          class="product-card__img"
          src="${escapeHTML(product.image)}"
          alt="${name}"
          loading="lazy"
          decoding="async"
          data-fallback="${escapeHTML(product.categoryLabel)}"
        />
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${category}</span>
        <h3 class="product-card__title">${name}</h3>
        <span class="product-card__rating">
          ${icon("star")} ${product.rating.toFixed(1)}
          <span aria-hidden="true">·</span> ${product.reviews} reseñas
        </span>
        <div class="product-card__price">
          <span class="product-card__now">${formatMXN(product.price)}</span>
          ${oldPrice}
        </div>
        <span class="product-card__installments">
          3 meses sin intereses de ${formatMXN(product.installments)}
        </span>
        ${shippingMarkup(product)}
        <button
          class="btn btn--primary product-card__add"
          type="button"
          data-add="${product.id}"
          aria-label="Agregar ${name} a la bolsa"
        >
          ${icon("plus")}
          Agregar a la bolsa
        </button>
      </div>
    </article>
  `;
}

export function skeletonCards(count = 8) {
  return Array.from(
    { length: count },
    () => `
      <article class="product-card product-card--skeleton" aria-hidden="true">
        <div class="product-card__media skeleton"></div>
        <div class="product-card__body">
          <span class="skeleton-line skeleton-line--short"></span>
          <span class="skeleton-line"></span>
          <span class="skeleton-line skeleton-line--medium"></span>
          <span class="skeleton-line skeleton-line--short"></span>
          <span class="skeleton-line skeleton-line--medium"></span>
        </div>
      </article>
    `,
  ).join("");
}

/* ---------- Feedback del carrito ---------- */

export function bumpCart() {
  const trigger = document.getElementById("cartTrigger");
  if (!trigger) return;
  trigger.classList.add("is-bumping");
  window.setTimeout(() => trigger.classList.remove("is-bumping"), 280);
}

export function markAdded(button) {
  if (!button) return;
  const original = button.innerHTML;
  button.classList.add("is-added");
  button.innerHTML = `${icon("check")} Agregado`;
  window.setTimeout(() => {
    button.classList.remove("is-added");
    button.innerHTML = original;
  }, 1100);
}
