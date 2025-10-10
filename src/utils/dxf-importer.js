import { DxfParser } from 'dxf-parser';

// Inicializa el parser
const parser = new DxfParser();

/**
 * Analiza el contenido de texto de un archivo DXF y lo convierte en un objeto de dibujo.
 * @param {string} dxfText El contenido de texto del archivo DXF.
 * @returns {object} El objeto de dibujo analizado con todas sus entidades.
 */
export function parseDxfFile(dxfText) {
  try {
    // La función principal de la librería para el análisis
    const drawing = parser.parseSync(dxfText);
    return drawing;
  } catch (err) {
    console.error("Error al analizar el archivo DXF:", err);
    throw new Error("Formato DXF no válido o error de análisis.");
  }
}

/**
 * Filtra las entidades relevantes (LÍNEAS, CÍRCULOS, etc.) y las prepara.
 * @param {object} drawing El objeto de dibujo devuelto por parseDxfFile.
 * @returns {Array} Un array de entidades simplificadas.
 */
export function extractDxfEntities(drawing) {
    // Aquí es donde obtienes las entidades del dibujo
    const entities = drawing.entities || [];
    
    // Solo toma las entidades que nos interesan para el dibujo (LÍNEAS, POLILÍNEAS, etc.)
    const filteredEntities = entities.filter(e => 
        e.type === 'LINE' || 
        e.type === 'POLYLINE' ||
        e.type === 'LWPOLYLINE' ||
        e.type === 'CIRCLE'
        // Puedes añadir más tipos aquí (ARC, TEXT, etc.)
    );

    // En un proyecto real, necesitarías transformar las coordenadas 
    // para que se ajusten al tamaño de tu canvas. Por ahora, devolveremos los datos sin modificar.
    
    return filteredEntities;
}