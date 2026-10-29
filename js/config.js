/* ============================================================
   Configuración de Chi-Wiss Shop
   Catálogo curado, textos de categorías, reglas del casino.
   ============================================================ */

export const API_URL =
  "https://dummyjson.com/products?limit=200&select=id,title,price,category,thumbnail,images,rating,stock,discountPercentage";

export const CDN_BASE = "https://cdn.dummyjson.com/product-images";

export const STORAGE_KEY = "chi-wiss-shop:v2";

/* DummyJSON entrega precios en USD. Este rango define la conversión demo a MXN. */
export const USD_TO_MXN = { min: 18.5, max: 20.5 };

export const SHIPPING = {
  freeFrom: 999,
  cost: 149,
};

export const RIVAL = {
  name: "Nova IA",
  initialBalance: 5000,
};

export const INITIAL_BALANCE = 0;

/* ---------- Categorías visibles ---------- */

export const CATEGORIES = [
  { key: "deco", label: "Deco" },
  { key: "cocina", label: "Cocina" },
  { key: "belleza", label: "Belleza" },
  { key: "aroma", label: "Aroma" },
  { key: "despensa", label: "Despensa" },
  { key: "accesorios", label: "Accesorios" },
  { key: "tecnologia", label: "Tecnología" },
  { key: "deporte", label: "Deporte" },
  { key: "joyeria", label: "Joyería" },
  { key: "relojes", label: "Relojes" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category.label]),
);

/* ---------- Catálogo curado ----------
   `usd` se usa solo como referencia para calcular el precio MXN.
   `img` construye la URL de respaldo en el CDN de DummyJSON.
   ------------------------------------------------------------ */

export const CURATED = [
  { id: 44, name: "Marco de fotos Árbol de familia", cat: "deco", usd: 29.99, img: "home-decoration/family-tree-photo-frame" },
  { id: 45, name: "Planta escultórica de interior", cat: "deco", usd: 39.99, img: "home-decoration/house-showpiece-plant" },
  { id: 46, name: "Macetero de cerámica mate", cat: "deco", usd: 14.99, img: "home-decoration/plant-pot" },
  { id: 47, name: "Lámpara de mesa Oslo", cat: "deco", usd: 49.99, img: "home-decoration/table-lamp" },
  { id: 48, name: "Espátula de bambú", cat: "cocina", usd: 7.99, img: "kitchen-accessories/bamboo-spatula" },
  { id: 52, name: "Wok de acero al carbono", cat: "cocina", usd: 29.99, img: "kitchen-accessories/carbon-steel-wok" },
  { id: 53, name: "Tabla de cortar de nogal", cat: "cocina", usd: 12.99, img: "kitchen-accessories/chopping-board" },
  { id: 54, name: "Exprimidor cítrico amarillo", cat: "cocina", usd: 8.99, img: "kitchen-accessories/citrus-squeezer-yellow" },
  { id: 59, name: "Vaso de vidrio soplado", cat: "cocina", usd: 4.99, img: "kitchen-accessories/glass" },
  { id: 61, name: "Minipimer de mano", cat: "cocina", usd: 34.99, img: "kitchen-accessories/hand-blender" },
  { id: 64, name: "Cuchillo de chef 20 cm", cat: "cocina", usd: 14.99, img: "kitchen-accessories/knife" },
  { id: 73, name: "Especiero de 12 frascos", cat: "cocina", usd: 19.99, img: "kitchen-accessories/spice-rack" },
  { id: 2, name: "Paleta de sombras con espejo", cat: "belleza", usd: 19.99, img: "beauty/eyeshadow-palette-with-mirror" },
  { id: 4, name: "Labial rojo satinado", cat: "belleza", usd: 12.99, img: "beauty/red-lipstick" },
  { id: 5, name: "Esmalte de uñas rojo", cat: "belleza", usd: 8.99, img: "beauty/red-nail-polish" },
  { id: 6, name: "Perfume CK One 100 ml", cat: "aroma", usd: 49.99, img: "fragrances/calvin-klein-ck-one" },
  { id: 8, name: "Perfume J'adore 50 ml", cat: "aroma", usd: 89.99, img: "fragrances/dior-j'adore" },
  { id: 27, name: "Miel de azahar 500 g", cat: "despensa", usd: 6.99, img: "groceries/honey-jar" },
  { id: 34, name: "Café instantáneo clásico", cat: "despensa", usd: 7.99, img: "groceries/nescafe-coffee" },
  { id: 36, name: "Proteína whey vainilla", cat: "despensa", usd: 19.99, img: "groceries/protein-powder" },
  { id: 154, name: "Lentes de sol negros", cat: "accesorios", usd: 29.99, img: "sunglasses/black-sun-glasses" },
  { id: 155, name: "Lentes de sol clásicos", cat: "accesorios", usd: 24.99, img: "sunglasses/classic-sun-glasses" },
  { id: 172, name: "Bolso azul de mano", cat: "accesorios", usd: 49.99, img: "womens-bags/blue-women's-handbag" },
  { id: 173, name: "Bolso de cuero Heshe", cat: "accesorios", usd: 129.99, img: "womens-bags/heshe-women's-leather-bag" },
  { id: 176, name: "Bolso negro de mujer", cat: "accesorios", usd: 59.99, img: "womens-bags/women-handbag-black" },
  { id: 104, name: "Cargador iPhone 20 W", cat: "tecnologia", usd: 19.99, img: "mobile-accessories/apple-iphone-charger" },
  { id: 108, name: "Funda MagSafe ciruela", cat: "tecnologia", usd: 29.99, img: "mobile-accessories/iphone-12-silicone-case-with-magsafe-plum" },
  { id: 109, name: "Monopie para smartphone", cat: "tecnologia", usd: 19.99, img: "mobile-accessories/monopod" },
  { id: 140, name: "Balón de básquetbol", cat: "deporte", usd: 14.99, img: "sports-accessories/basketball" },
  { id: 152, name: "Raqueta de tenis", cat: "deporte", usd: 49.99, img: "sports-accessories/tennis-racket" },
  { id: 153, name: "Balón de vóleibol", cat: "deporte", usd: 11.99, img: "sports-accessories/volleyball" },
  { id: 182, name: "Aros de cristal verde", cat: "joyeria", usd: 29.99, img: "womens-jewellery/green-crystal-earring" },
  { id: 184, name: "Aros tropicales", cat: "joyeria", usd: 19.99, img: "womens-jewellery/tropical-earring" },
  { id: 93, name: "Reloj de cuero marrón", cat: "relojes", usd: 89.99, img: "mens-watches/brown-leather-belt-watch" },
  { id: 193, name: "Reloj dorado de mujer", cat: "relojes", usd: 799.99, img: "womens-watches/watch-gold-for-women" },
];

/* ---------- Ruleta ----------
   Orden real de una ruleta europea. 37 sectores.
   ------------------------------------------------------------ */

export const ROULETTE_SEQUENCE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const ROULETTE_RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const ROULETTE_COLORS = {
  rojo: { label: "Rojo", multiplier: 2 },
  uva: { label: "Uva", multiplier: 2 },
  verde: { label: "Verde", multiplier: 14 },
};

export function rouletteColor(number) {
  if (number === 0) return "verde";
  return ROULETTE_RED.has(number) ? "rojo" : "uva";
}

/* ---------- Dados ---------- */

export const DICE_MULTIPLIERS = {
  2: 25,
  3: 15,
  4: 10,
  5: 7,
  6: 6,
  7: 5,
  8: 6,
  9: 7,
  10: 10,
  11: 15,
  12: 25,
};

/* ---------- Moneda ---------- */

export const COIN_SIDES = {
  cara: { label: "Cara", multiplier: 2 },
  cruz: { label: "Cruz", multiplier: 2 },
};

/* ---------- Juegos (textos de interfaz) ---------- */

export const GAMES = {
  roulette: {
    key: "roulette",
    label: "Ruleta",
    icon: "roulette",
    action: "Girar la ruleta",
    verb: "giró",
    cta: "Gira la ruleta y cruza los dedos.",
  },
  dice: {
    key: "dice",
    label: "Dados",
    icon: "dice",
    action: "Lanzar los dados",
    verb: "lanzó",
    cta: "Lanza los dados y apunta a la suma exacta.",
  },
  coin: {
    key: "coin",
    label: "Moneda",
    icon: "coin",
    action: "Lanzar la moneda",
    verb: "lanzó",
    cta: "Elige cara o cruz. Simple y honesto.",
  },
};

/* ---------- Jugadores simulados ---------- */

export const PLAYERS = [
  "Ximena",
  "Diego",
  "Valeria",
  "Emiliano",
  "Regina",
  "Santiago",
  "Fernanda",
  "Sebastián",
  "Camila",
  "Alejandro",
];

export const FEED_BETS = {
  roulette: ["Rojo", "Uva", "Verde", "Número 7", "Número 17", "Número 23"],
  dice: ["Suma 7", "Suma 8", "Suma 6", "Suma 11", "Suma 4"],
  coin: ["Cara", "Cruz"],
};
