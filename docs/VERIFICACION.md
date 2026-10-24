# Verificación de la entrega 0.3.0

Fecha: 24 de octubre de 2026.

## Ejecutado en este entorno

- `npm test`: 33 pruebas aprobadas. Incluye modelo, terreno, entradas, perímetro, historial, migración, validación de opciones de toldo, superficies de techo y separación entre kits metálicos y madera.
- `npm run check`: sintaxis JavaScript válida.
- `npm run build:standalone`: HTML portátil generado.
- `python tests/ui-smoke.py`: interfaz 2D en Chromium, edición, duplicado, deshacer/rehacer, salida, terreno, guardado con almacenamiento simulado, JSON/CSV, avisos, arrastre y adaptación móvil. Sin errores de página.
- `python tests/canopy-ui.py`: paredes, techo, mesa, tensores, persistencia del estado mediante un almacenamiento simulado, duplicado, deshacer/rehacer, enfoque y actualización del plano. Sin errores de página.

Las pruebas nuevas detectaron un problema heredado de validación HTML: los límites mínimos y los pasos de los campos de dimensiones impedían aplicar medidas válidas. Corregido con `step="any"` y validación de límites en el modelo.

## No verificado aquí

La red de este entorno no pudo descargar Three.js. Por tanto, no se ejecutó el renderizado WebGL real, ni la instalación npm completa, ni el build estático que requiere el motor. No presentar las pruebas 2D como prueba de 3D. Tampoco se comprobó la persistencia nativa entre sesiones ni la entrega efectiva de descargas del navegador.

## Comprobación pendiente en un entorno con red

1. Ejecutar `npm install`, `npm run dev` y abrir la dirección indicada.
2. Confirmar que aparece “Motor 3D listo” y el campo renderizado.
3. Seleccionar la cocina, pulsar Enfocar pieza y revisar techo, ventanas y armazón desde varios ángulos.
4. Cambiar cada pared, altura del techo, mesa y tensores; comprobar que cambia la geometría.
5. Exportar e importar JSON, recargar, y exportar PNG desde ambas vistas.
6. Ejecutar `npm run build`, servir dist/site y comprobar que no solicita bibliotecas a un CDN.

Sin despliegue ni cambios en main. Las medidas y materiales son conceptuales, sin certificación de seguridad.
