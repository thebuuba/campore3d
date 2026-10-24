# Carpas domo y pórtico Legado · 0.4

## Implementado
- Sustituida la carpa triangular por una superficie domo de planta redondeada, dos varillas cruzadas con tramos de color, suelo oscuro y puerta frontal curva.
- Puerta abierta/cerrada, sobretoldo superior, tensores y color de detalles editables. La puerta abierta es una abertura de la malla, no un triángulo pintado.
- Entrada tipo pórtico con dos torres de madera, refuerzos diagonales laterales, frontón, rótulo y dos estandartes; amarres opcionales. Variante sencilla para comparar.
- Los elementos de madera e inventario se generan desde la misma lista geométrica. No se cuentan los estandartes como madera.
- El inspector muestra ancho y altura libres aproximados del paso central. No hay travesaños de suelo cruzando el acceso.
- Esquema de proyecto v3 con migración de v1/v2. Se conservan medidas, posiciones y rótulos guardados. El formato del primer HTML conserva su ancho anterior de entrada al importarse.
- Plano 2D independiente, iconos propios para los modelos, importación/exportación, duplicación, historial y cocina anterior conservados.

## Probar
En la rama `feat/legado-studio-cocinas`: `npm install` y `npm run dev`.
Seleccionar una carpa o Entrada Legado en «En tu campo»; pulsar «Enfocar pieza».
Las opciones nuevas están al final de Propiedades. Pulsar «Aplicar cambios» después de editarlas.
Las piezas antiguas conservan sus dimensiones; una entrada nueva propone 6.4 × 1.8 m y 4.6 m de altura. Son valores provisionales, no una estimación a partir de la foto ni una recomendación de construcción.

## Verificación
- Local: 45 pruebas de lógica aprobadas; sintaxis JS revisada; HTML portátil generado.
- Chromium local: controles de carpa/entrada, estilos, historial, JSON, cocina y distribución 1280 px comprobados sin errores de página, en modo `--standalone`.
- El navegador del entorno local bloquea la navegación HTTP y la descarga de Three.js. Esa ejecución usa almacenamiento simulado y NO certifica persistencia nativa ni WebGL.
- Se añade un workflow de PR independiente para ejecutar `python3 tests/structures-ui.py --require-3d`: exige motor WebGL real, geometría finita, recarga de localStorage nativo, exportación/importación y capturas. Consultar el resultado de la ejecución del commit concreto; incluir el workflow no equivale a que haya pasado.
- Comando local restringido: `npm run build:standalone && python tests/structures-ui.py --standalone`.

## Límites
El diseño es conceptual. No certifica estabilidad, capacidad, anclajes, ventilación ni seguridad de construcción. Las longitudes de madera son entre ejes, sin enterramiento, pérdidas o margen de corte. Las sogas de amarres y los tensores de carpas no se incluyen en la longitud de soga del perímetro. Los avisos de colisión usan el volumen principal, no todo el espacio ocupado por tensores. Medir el equipo real y verificar el montaje en el campo.
