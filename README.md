# Chi-Wiss Shop

Tienda demo de miscelánea con carrito editable y un casino de apuestas simulado. Está hecha con HTML, CSS y JavaScript moderno (ES modules), sin frameworks ni paso de compilación.

## Cómo ejecutarla

El proyecto necesita servirse por HTTP porque usa módulos ES y `fetch`. Desde la carpeta raíz del repositorio:

```bash
python -m http.server 4174 --bind 127.0.0.1
```

Luego abre:

```
http://127.0.0.1:4174/chi-wiss-shop/
```

También funciona con cualquier servidor estático (Live Server, `npx serve`, etc.). No hay instalación de dependencias ni build.

## Rutas

| Ruta | Vista |
| --- | --- |
| `#/` | Tienda y catálogo |
| `#/casino` | Casino (ruleta, dados y moneda) |
| `#catalogo` | Ancla directa al catálogo |

El carrito es compartido entre la tienda y el casino. La apuesta de cada ronda equivale al subtotal actual de la bolsa y **no vacía el carrito**.

## Funcionalidad

**Tienda**
- Catálogo dinámico desde [DummyJSON](https://dummyjson.com/) con nombres y categorías curadas en español.
- Si la API falla o responde lento, se carga automáticamente un catálogo local de respaldo.
- Precios demo en pesos mexicanos (MXN), calculados desde el precio USD de DummyJSON y redondeados para terminar en 9 (por ejemplo, `$599`).
- Búsqueda con normalización de acentos, filtros por categoría, filtro de ofertas y 5 órdenes distintos.
- Botón para recargar el catálogo, estado de la fuente y esqueletos de carga.
- Tarjetas con imagen, descuento, valoración, meses sin intereses, envío y botón para agregar.

**Carrito**
- Drawer con cantidades editables, eliminación y subtotal/total.
- Envío gratis desde `$999` con barra de progreso.
- Persistencia en `localStorage` y sincronización entre pestañas.
- Pago simulado con comprobante de demo.

**Casino**
- Ruleta europea de 37 números: apuesta a color (`Rojo`, `Uva`, `Verde`) o número exacto (`x35`).
- Dados: apuesta a la suma exacta de dos dados (`x25` a `x5`).
- Moneda: cara o cruz (`x2`).
- Jugador simulado **Nova IA** que apuesta en cada ronda contra el jugador real.
- Sala en vivo con jugadores simulados, historial de las últimas 30 rondas y anuncios accesibles.
- Saldo inicial `$0` que puede quedar negativo; el de Nova IA parte en `$5,000`.
- Botón para reiniciar saldos e historial.

## Estructura

```
chi-wiss-shop/
├─ index.html            Estructura, sprite SVG y diálogos
├─ css/
│  ├─ tokens.css         Paleta, tipografía, sombras, movimiento
│  ├─ base.css           Reset, botones, formularios, utilidades
│  ├─ header.css         Header fijo, búsqueda, menú móvil
│  ├─ shop.css           Hero, catálogo, tarjetas, footer
│  ├─ cart.css           Drawer del carrito
│  └─ casino.css         Mesa, juegos, billetera e historial
└─ js/
   ├─ config.js          Catálogo curado, reglas y constantes
   ├─ format.js          MXN, azar, textos, animaciones
   ├─ api.js             Carga DummyJSON y respaldo local
   ├─ store.js           Estado, pub/sub, carrito y persistencia
   ├─ ui.js              Tarjetas, toasts e iconos
   ├─ shop.js            Catálogo, filtros y orden
   ├─ cart.js            Drawer y edición de cantidades
   ├─ casino.js          Juegos, apuestas, Nova IA e historial
   └─ app.js             Arranque, ruteo, header y menú
```

## Persistencia

Todo se guarda en la clave `chi-wiss-shop:v2` de `localStorage`:

```json
{
  "cart": [],
  "casino": {
    "balance": 0,
    "rivalBalance": 5000,
    "history": []
  }
}
```

Para empezar de cero, borra esa clave desde DevTools o ejecuta:

```js
localStorage.removeItem("chi-wiss-shop:v2");
```

## Detalles de diseño

- Paleta crema (`#FFFBF4`), uva (`#2A1038`), violeta (`#6D28D9`) y lila (`#D9C8FF`).
- Tipografía Sora con escala fluida y foco visible en todos los controles.
- Header fijo con el logo oficial (`logo-chi-wiss.svg`) escalado de forma fluida. En la vista de casino se aclara con un filtro para mantener el contraste sobre el fondo oscuro.
- Diálogos nativos con cierre por botón, fondo, `Escape` y retorno de foco.
- Respeta `prefers-reduced-motion`.
- Probado sin desbordamiento horizontal en 390, 768, 1024 y 1440 px.

## Alcance

Es una demo: no hay pagos, usuarios ni backend reales. Los precios son simulados y las apuestas no involucran dinero. La disponibilidad del catálogo en vivo depende de DummyJSON.
