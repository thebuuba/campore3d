# Legado Studio: reglas de desarrollo

Este proyecto es independiente de Aula Base y camporee-app. No modificar esos repositorios. No publicar el proyecto ni cambiar su visibilidad sin autorización del usuario.

Trabajar mediante ramas y solicitudes de cambios. No modificar main ni desplegar automáticamente a producción. Mantener las pruebas del modelo (`npm test`) y la comprobación de sintaxis (`npm run check`).

No afirmar que el 3D funciona por haber pasado solo pruebas de sintaxis. Verificar la vista real con un navegador compatible. Mantener el plano 2D independiente del motor gráfico; un fallo de Three.js no debe impedir editar y exportar el proyecto.

Guardar las versiones de esquema; validar JSON antes de reemplazar el estado. Nunca ejecutar contenido importado. Escapar rótulos cuando se inserten en SVG. No incluir claves o tokens en el cliente.

Las medidas son conceptuales. No afirmar seguridad, cumplimiento de normas, resistencia estructural o exactitud de presupuesto sin verificación apropiada. El norte del visor es ilustrativo.
