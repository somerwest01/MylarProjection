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
const cleanMText = (text) => {
    // Expresión regular para eliminar códigos de formato MTEXT: {..;}
    let cleanedText = text.replace(/\{.*?\}|\\H.*?|\\h.*?|\\S.*?;/g, '');
    
    // Elimina códigos especiales restantes, como saltos de línea (\P) o control de color (\c)
    cleanedText = cleanedText.replace(/\\P|\\c[0-9]+|\\C[0-9]+;/g, ''); 
    
    return cleanedText.trim();
};

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
                        start: { 
                            x: Number(e.start.x || 0), 
                            y: Number(e.start.y || 0) 
                        }, 
                        end: { 
                            x: Number(e.end.x || 0), 
                            y: Number(e.end.y || 0) 
                        },
                        color: color
                    });
                    console.log(`LINE agregada al array de entidades.`);
                } else {
                    console.error("LÍNEA FALLIDA. Objeto devuelto por el parser:", e);
                    console.warn("Línea omitida en la importacion: Objeto start/end faltante.");
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
              case 'MTEXT':
                  if (e.text && e.position) {
                      validEntities.push({
                          type: 'MTEXT',
                          text: e.text, 
                          x: Number(e.position.x || 0),
                          y: Number(e.position.y || 0),
                          rotation: e.rotation || 0,
                          color: color
                });
    }
    break;
            case 'INSERT':
    // El 'INSERT' es una referencia a la definición del bloque.
    validEntities.push({
        type: 'INSERT',
        name: e.name, 
        x: Number(e.position.x || 0),
        y: Number(e.position.y || 0),
        scaleX: e.scaleX || 1,
        scaleY: e.scaleY || 1,
        rotation: e.rotation || 0,
    });
    break;

            // IGNORAR MTEXT y otras entidades por ahora, para mantener la robustez.
            default:
                // console.log(`Entidad no soportada ignorada: ${e.type}`);
                break;
        }
    });
    
    return validEntities;
}





