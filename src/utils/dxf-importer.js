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

/**
 * Filtra y prepara las entidades relevantes (LINE, CIRCLE, LWPOLYLINE).
 */
export function extractDxfEntities(drawing) {
    const entities = drawing.entities || [];
    const validEntities = [];

    const isNumber = (n) => typeof n === 'number' && isFinite(n);
    
    entities.forEach(e => {
        const color = e.colorIndex || 'black';
        
        switch(e.type) {
            case 'LINE':
                if (e.start && e.end) 
                {
                    validEntities.push({
                        type: 'LINE',
                        // Pasamos las coordenadas tal cual las devuelve el parser
                        start: { x: e.start.x, y: e.start.y }, 
                        end: { x: e.end.x, y: e.end.y },
                        color: color
                    });
                } else {
                    console.warn("Línea omitida en la importación: Objeto start/end faltante.");
                }
                break;

            case 'CIRCLE':
                if (e.center && e.radius > 0) {
                    validEntities.push({
                        type: 'CIRCLE',
                        center: { x: e.center.x, y: e.center.y },
                        radius: e.radius,
                        color: color
                    });
                }
                break;
            
            case 'LWPOLYLINE':
            case 'POLYLINE':
                // Las polilíneas son arrays de vértices (puntos).
                // Konva espera un array plano de coordenadas [x1, y1, x2, y2, ...]
                if (e.vertices && e.vertices.length > 0) {
                    const points = e.vertices
                        .map(v => [v.x, v.y])
                        .flat(); // Aplanar a un solo array de [x1, y1, x2, y2, ...]

                    if (points.length >= 4) { // Necesita al menos dos puntos (4 coordenadas)
                        validEntities.push({
                            type: 'POLYLINE_GEOM', // Usamos un nuevo tipo para el renderizador
                            points: points,
                            color: color,
                            isClosed: e.shape || false // Para saber si es una figura cerrada
                        });
                    }
                }
                break;

            // IGNORAR MTEXT y otras entidades por ahora, para mantener la robustez.
            default:
                // console.log(`Entidad no soportada ignorada: ${e.type}`);
                break;
        }
    });
    
    return validEntities;
}


