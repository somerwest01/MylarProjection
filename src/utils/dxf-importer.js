import { DxfParser } from 'dxf-parser';

const parser = new DxfParser();

export function parseDxfFile(dxfText) {
  try {
    const drawing = parser.parseSync(dxfText);
    return drawing;
  } catch (err) {
    console.error("Error al analizar el archivo DXF:", err);
    throw new Error("Formato DXF no válido o error de análisis. Verifique la consola para detalles técnicos.");
  }
}

export function extractDxfEntities(drawing) {
    const entities = drawing.entities || [];
    const validEntities = [];
    
    entities.forEach(e => {
        // Solo incluimos entidades que tienen la estructura de coordenadas básica
        if (e.type === 'LINE' && e.start && e.end) {
            validEntities.push({
                type: 'LINE',
                start: { x: e.start.x, y: e.start.y },
                end: { x: e.end.x, y: e.end.y },
                color: e.colorIndex || 'black'
            });
        } else if (e.type === 'CIRCLE' && e.center && e.radius > 0) {
             validEntities.push({
                type: 'CIRCLE',
                center: { x: e.center.x, y: e.center.y },
                radius: e.radius,
                color: e.colorIndex || 'black'
            });
        }
        // Nota: Las polilíneas (POLYLINE/LWPOLYLINE) son más complejas, las omitimos por ahora
        // hasta que el flujo básico funcione, para evitar errores.
    });
    
    return validEntities;
}
