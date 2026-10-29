/* ============================================================
   Carrito · drawer, cantidades y resumen
   ============================================================ */

import { SHIPPING } from "./config.js";
import {
  getCartCount,
  getCartLines,
  getState,
  getSubtotal,
  removeFromCart,
  setQuantity,
  subscribe,
} from "./store.js";
import { escapeHTML, formatMXN } from "./format.js";
import { icon, toast } from "./ui.js";

let elements = {};
let initialized = false;

function emptyMarkup() {
  return `
    <div class="cart-empty">
      <span class="cart-empty__icon">${icon("bag")}</span>
      <h3>Tu bolsa está vacía</h3>
      <p>Agrega objetos del catálogo. Cuando tengas algo, ese será tu monto de apuesta en el casino.</p>
      <button class="btn btn--outline btn--sm" type="button" data-close-cart>
        Seguir explorando
      </button>
    </div>
  `;
}

function itemMarkup(item) {
  const max = Math.min(20, Math.max(1, item.stock));
  const name = escapeHTML(item.name);
  const category = escapeHTML(item.categoryLabel);

  return `
    <article class="cart-item" data-id="${item.id}">
      <img
        class="cart-item__img"
        src="${escapeHTML(item.image)}"
        alt="${name}"
        loading="lazy"
        data-fallback="${category}"
      />
      <div class="cart-item__info">
        <p class="cart-item__cat">${category}</p>
        <p class="cart-item__name">${name}</p>
        <p class="cart-item__price">${formatMXN(item.price)} c/u</p>
      </div>
      <div class="cart-item__controls">
        <span class="cart-item__line">${formatMXN(item.lineTotal)}</span>
        <div class="qty" role="group" aria-label="Cantidad de ${name}">
          <button type="button" data-step="-1" aria-label="Quitar una unidad"
            ${item.qty <= 1 ? "disabled" : ""}>
            ${icon("minus")}
          </button>
          <span class="qty__value" aria-live="polite">${item.qty}</span>
          <button type="button" data-step="1" aria-label="Agregar una unidad"
            ${item.qty >= max ? "disabled" : ""}>
            ${icon("plus")}
          </button>
        </div>
        <button class="cart-item__remove" type="button" data-remove>
          ${icon("trash")} Eliminar
        </button>
      </div>
    </article>
  `;
}

function summaryMarkup(subtotal, count) {
  const freeShipping = subtotal >= SHIPPING.freeFrom;
  const shipping = freeShipping ? 0 : SHIPPING.cost;
  const total = subtotal + shipping;
  const progress = Math.min(100, Math.round((subtotal / SHIPPING.freeFrom) * 100));
  const remaining = Math.max(0, SHIPPING.freeFrom - subtotal);

  return `
    <div class="shipping-meter">
      <p>
        ${
          freeShipping
            ? `<strong>Envío gratis desbloqueado.</strong> Tu bolsa supera los ${formatMXN(SHIPPING.freeFrom)}.`
            : `Te faltan <strong>${formatMXN(remaining)}</strong> para el envío gratis.`
        }
      </p>
      <div class="shipping-meter__bar" role="presentation">
        <span class="shipping-meter__fill" style="width:${progress}%"></span>
      </div>
    </div>

    <div class="cart-summary">
      <div class="cart-summary__row">
        <span>Subtotal · ${count} ${count === 1 ? "ítem" : "ítems"}</span>
        <span>${formatMXN(subtotal)}</span>
      </div>
      <div class="cart-summary__row">
        <span>Envío</span>
        <span>${freeShipping ? "Gratis" : formatMXN(shipping)}</span>
      </div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Total</span>
        <span>${formatMXN(total)}</span>
      </div>
    </div>

    <div class="cart-actions">
      <a class="btn btn--lilac btn--full" href="#/casino" data-go-casino>
        ${icon("spark")} Jugar con ${formatMXN(subtotal)}
      </a>
      <button class="btn btn--primary btn--full" type="button" data-checkout>
        ${icon("lock")} Pagar demo
      </button>
    </div>
    <p class="cart-foot__fine">
      Pago simulado. No se cobra dinero real. La apuesta del casino usa el subtotal de tu bolsa.
    </p>
  `;
}

function renderCart(state) {
  const lines = getCartLines();
  const count = getCartCount();
  const subtotal = getSubtotal();

  const trigger = document.getElementById("cartTrigger");
  const triggerCount = document.getElementById("cartCount");
  const triggerTotal = document.getElementById("cartTotal");
  const dialogCount = document.getElementById("cartDialogCount");

  if (triggerCount) triggerCount.textContent = String(count);
  if (triggerTotal) triggerTotal.textContent = formatMXN(subtotal);
  if (dialogCount) dialogCount.textContent = String(count);
  trigger?.classList.toggle("is-empty", count === 0);
  trigger?.setAttribute(
    "aria-label",
    count === 0
      ? "Abrir bolsa, vacía"
      : `Abrir bolsa, ${count} ${count === 1 ? "ítem" : "ítems"}`,
  );

  if (!elements.body || !elements.foot) return;

  if (!lines.length) {
    elements.body.innerHTML = emptyMarkup();
    elements.foot.innerHTML = "";
    elements.foot.hidden = true;
    return;
  }

  elements.body.innerHTML = lines.map(itemMarkup).join("");
  elements.foot.hidden = false;
  elements.foot.innerHTML = summaryMarkup(subtotal, count);
}

/* ---------- Dialog ---------- */

export function openCart() {
  if (!elements.dialog || elements.dialog.open) return;
  renderCart(getState());
  elements.dialog.showModal();
  document.body.classList.add("no-scroll");
}

function unlockScroll() {
  const menuIsOpen = document.getElementById("menuDialog")?.open;
  if (!menuIsOpen) document.body.classList.remove("no-scroll");
}

export function closeCart() {
  if (!elements.dialog?.open) return;
  elements.dialog.close();
  unlockScroll();
}

function handleBodyClick(event) {
  const close = event.target.closest("[data-close-cart]");
  if (close) {
    closeCart();
    return;
  }

  const item = event.target.closest(".cart-item");
  if (!item) return;
  const id = Number(item.dataset.id);

  const step = event.target.closest("[data-step]");
  if (step) {
    const direction = Number(step.dataset.step);
    const line = getCartLines().find((entry) => entry.id === id);
    if (!line) return;

    setQuantity(id, line.qty + direction);

    // El carrito se vuelve a dibujar: devolvemos el foco al control equivalente.
    const item = elements.body.querySelector(`.cart-item[data-id="${id}"]`);
    if (!item) return;
    const next = item.querySelector(`[data-step="${direction}"]`);
    if (next && !next.disabled) next.focus();
    else item.querySelector("[data-remove]")?.focus();
    return;
  }

  if (event.target.closest("[data-remove]")) {
    removeFromCart(id);
    toast("Producto eliminado de tu bolsa.", "info", 2200);
  }
}

function handleFootClick(event) {
  if (event.target.closest("[data-checkout]")) {
    const code = Math.floor(1000 + Math.random() * 9000);
    toast(
      `Pago demo aprobado · Pedido #CW-${code}. No se cobró dinero real.`,
      "success",
      4200,
    );
    return;
  }

  if (event.target.closest("[data-go-casino]")) {
    closeCart();
  }
}

export function initCart() {
  if (initialized) return;
  initialized = true;

  elements = {
    dialog: document.getElementById("cartDialog"),
    body: document.getElementById("cartBody"),
    foot: document.getElementById("cartFoot"),
  };

  document
    .getElementById("cartTrigger")
    ?.addEventListener("click", () => openCart());

  elements.dialog?.addEventListener("click", (event) => {
    if (event.target === elements.dialog) {
      closeCart();
      return;
    }
    if (event.target.closest("[data-close-cart]")) closeCart();
  });

  elements.dialog?.addEventListener("close", unlockScroll);

  elements.dialog?.addEventListener("cancel", () => {
    unlockScroll();
  });

  elements.body?.addEventListener("click", handleBodyClick);
  elements.foot?.addEventListener("click", handleFootClick);

  subscribe((state, changed) => {
    if (changed.includes("cart")) renderCart(state);
  });

  renderCart(getState());
}
