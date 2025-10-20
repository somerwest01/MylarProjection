import React, { useState, useEffect, useRef, useCallback } from 'react';
// Importamos los componentes de Konva
import { Stage, Layer, Line, Circle, Text, Group } from 'react-konva';
// Asumo que la dependencia 'dxf-parser' está disponible en el entorno.
import { DxfParser } from 'dxf-parser';

// --- CONFIGURACIÓN Y CONSTANTES DEL LIENZO ---
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const INITIAL_SCALE = 1;

// --- UTILERÍAS DE PARSEO DXF (dxf-importer.js) ---

const parser = new DxfParser();

/**
 * Analiza el contenido de texto del archivo DXF.
 */
function parseDxfFile(dxfText) {
  try {
    const drawing = parser.parseSync(dxfText);
    return drawing;
  } catch (err) {
    console.error("Error al analizar el archivo DXF:", err);
    throw new Error("Formato DXF no válido o error de análisis. Verifique la consola para detalles técnicos.");
  }
}

/**
 * Limpia el texto MTEXT de códigos de formato DXF (como \\H, \\C, {}, etc.).
 */
const cleanMText = (text) => {
    // Elimina códigos de formato complejos y llaves
    let cleanedText = text.replace(/\\{[^}]*\\}|\\\\H[^;]*;|\\\\h[^;]*;|\\\\S[^;]*;|\\\\P|\\\\c[0-9]+|\\\\C[0-9]+;|[\{\}]/g, '');
    return cleanedText.trim();
};

const getCoords = (e) => {
    // Busca en e.position, luego en e.x/e.y directo.
    const x = Number((e.position && e.position.x) || e.x || 0);
    const y = Number((e.position && e.position.y) || e.y || 0);
    
    if (!isFinite(x) || !isFinite(y)) {
        console.error("ADVERTENCIA DE COORDENADAS: Coordenadas NaN/Inválidas para la entidad:", e.type, e);
        return null;
    }
    return { x, y };
};

/**
 * Filtra y prepara las entidades relevantes (LINE, CIRCLE, LWPOLYLINE, TEXT, INSERT).
 */
function extractDxfEntities(drawing) {
    const entities = drawing.entities || [];
    const blockDefinitions = drawing.blocks || {};
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
                        start: { x: Number(e.start.x), y: Number(e.start.y) },
                        end: { x: Number(e.end.x), y: Number(e.end.y) },
                        color: color,
                        lineType: e.lineType
                    });
                }
                break;
            case 'CIRCLE':
                if (e.center && isNumber(e.radius)) {
                    validEntities.push({
                        type: 'CIRCLE',
                        center: { x: Number(e.center.x), y: Number(e.center.y) },
                        radius: Number(e.radius),
                        color: color
                    });
                }
                break;
            case 'LWPOLYLINE':
            case 'POLYLINE': // LWPOLYLINE es el tipo más común para polilíneas ligeras
                if (e.vertices && e.vertices.length >= 2) {
                    const points = [];
                    let hasInvalidPoint = false;

                    e.vertices.forEach(v => {
                        const x = Number(v.x);
                        const y = Number(v.y);
                        if (isNumber(x) && isNumber(y)) {
                            points.push(x, y);
                        } else {
                            hasInvalidPoint = true;
                        }
                    });

                    if (points.length > 0 && !hasInvalidPoint) {
                        validEntities.push({
                            type: 'LWPOLYLINE',
                            points: points,
                            color: color,
                            isClosed: e.shape || false 
                        });
                    }
                }
                break;
            case 'TEXT':
            case 'MTEXT':
                if (e.text && e.position) {
                    const cleanedText = cleanMText(e.text);
                    const coords = getCoords(e);
                    
                    if (cleanedText.length > 0 && coords) { 
                        validEntities.push({
                            type: 'TEXT', // Usamos 'TEXT' para renderizar ambos tipos en Konva
                            text: cleanedText, 
                            x: coords.x,
                            y: coords.y,
                            rotation: e.rotation || 0,
                            color: color,
                            height: e.textHeight || 20 // Altura por defecto
                        });
                    }
                }
                break;
            case 'INSERT':
                validEntities.push({
                    type: 'INSERT',
                    name: e.name, // Nombre del bloque referenciado
                    x: Number(e.position.x || 0),
                    y: Number(e.position.y || 0),
                    scaleX: e.scaleX || 1,
                    scaleY: e.scaleY || 1,
                    rotation: e.rotation || 0,
                    color: color // Color del insert
                });
                break;
            default:
                // console.log(`Entidad no soportada ignorada: ${e.type}`);
                break;
        }
    });
    
    return {
        entities: validEntities,
        blocks: blockDefinitions
    };
}


// --- COMPONENTE DXF CANVAS (DxfCanvas (2).jsx) ---

const isSafeNumber = (c) => typeof c === 'number' && isFinite(c);

function DxfCanvasComponent({ entities, blocks }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const [debugInfo, setDebugInfo] = useState('');
  
  // EFECTO para centrar y escalar el dibujo al cargar
  useEffect(() => {
    if (!entities || entities.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const SAFE_LIMIT = 1e9; // 1 billón (1,000,000,000)
    const isValidCoord = (c) => typeof c === 'number' && isFinite(c) && Math.abs(c) < SAFE_LIMIT;

    const updateBounds = (x, y) => {
        if (isValidCoord(x) && isValidCoord(y)) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    };

    entities.forEach(entity => {
      // Cálculo del Bounding Box
      if (entity.type === 'LINE' && entity.start && entity.end) {
        updateBounds(entity.start.x, entity.start.y);
        updateBounds(entity.end.x, entity.end.y);
      } else if (entity.type === 'CIRCLE' && entity.center) {
        // Para círculos, consideramos el centro + radio
        updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
        updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
      } else if (entity.type === 'LWPOLYLINE' && entity.points) {
        // Puntos planos: [x1, y1, x2, y2, ...]
        for (let i = 0; i < entity.points.length; i += 2) {
            updateBounds(entity.points[i], entity.points[i+1]);
        }
      } else if (entity.type === 'TEXT' && entity.x && entity.y) {
          updateBounds(entity.x, entity.y);
      } else if (entity.type === 'INSERT' && entity.x && entity.y) {
          // Para INSERT, solo usamos la posición de inserción por simplicidad de Bounding Box.
          updateBounds(entity.x, entity.y);
      }
    });
    
    // Si no encontramos entidades válidas, salimos.
    if (minX === Infinity) return;

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    
    const padding = 50; // Margen en píxeles para el lienzo
    const canvasFitWidth = CANVAS_WIDTH - padding * 2;
    const canvasFitHeight = CANVAS_HEIGHT - padding * 2;

    // Calcular la escala necesaria
    const scaleX = drawingWidth > 0 ? canvasFitWidth / drawingWidth : INITIAL_SCALE;
    const scaleY = drawingHeight > 0 ? canvasFitHeight / drawingHeight : INITIAL_SCALE;
    
    const newScale = Math.min(scaleX, scaleY, INITIAL_SCALE); // No dejar que la escala sea demasiado grande
    
    // Calcular el centro del dibujo
    const centerX = minX + drawingWidth / 2;
    const centerY = minY + drawingHeight / 2;

    // Calcular el desplazamiento (offset)
    // El origen de Konva está en (0, 0)
    // Queremos que el centro del dibujo (centerX, centerY) esté en el centro del lienzo (CANVAS_WIDTH/2, CANVAS_HEIGHT/2)
    
    // El desplazamiento se calcula en el sistema de coordenadas de la PANTALLA,
    // pero el LAYER está transformado. Esto puede ser complicado, así que simplificaremos:
    // Calculamos el desplazamiento del centro del dibujo al centro de la pantalla,
    // y luego ajustamos por la nueva escala.

    // Desplazamiento inicial para centrar (en coordenadas del lienzo, no del dibujo)
    const initialOffsetX = CANVAS_WIDTH / 2 - centerX * newScale;
    const initialOffsetY = CANVAS_HEIGHT / 2 - centerY * newScale;
    
    // Konva usa (x, y) del Layer para posicionar el origen del dibujo.
    // Como estamos invirtiendo scaleY a -scale, necesitamos ajustar el offset Y.
    // La capa de Konva está en un espacio de pantalla (píxeles) y la movemos.
    
    // Para centrar correctamente, necesitamos que el punto (0, 0) del mundo DXF (minX, maxY) se mapee
    // a un punto visible.

    // Centro del área visible en coordenadas del mundo Konva (invertidas en Y)
    const worldCenterX = minX + drawingWidth / 2;
    const worldCenterY = maxY - drawingHeight / 2; // Invertir Y: usar maxY - H/2

    // Posición del centro del mundo Konva en píxeles de pantalla:
    // (worldCenterX * newScale + offset.x, worldCenterY * -newScale + offset.y) = (CANVAS_WIDTH/2, CANVAS_HEIGHT/2)

    // Calculamos el offset (pan inicial)
    const offsetX = (CANVAS_WIDTH / 2) - (worldCenterX * newScale);
    // Nota: Como la coordenada Y está invertida (scaleY = -scale), el factor de escala es negativo.
    const offsetY = (CANVAS_HEIGHT / 2) - (worldCenterY * -newScale);
    
    setScale(newScale);
    setOffset({ x: offsetX, y: offsetY });
    setDebugInfo(`Dimensiones: ${drawingWidth.toFixed(2)}x${drawingHeight.toFixed(2)}. Escala: ${newScale.toFixed(4)}. Offset: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)})`);

  }, [entities]);

  // Manejo de eventos de Konva para Pan (arrastrar)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const stage = e.target.getStage();
    setLastPos({ x: stage.getPointerPosition().x, y: stage.getPointerPosition().y });
    stage.container().style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (stageRef.current) {
        stageRef.current.container().style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const stage = e.target.getStage();
    const newPos = stage.getPointerPosition();

    const dx = newPos.x - lastPos.x;
    const dy = newPos.y - lastPos.y;

    setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
    }));

    setLastPos(newPos);
  };
  
  // Manejo del Zoom (rueda del ratón)
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    // Determinar factor de zoom
    const direction = e.evt.deltaY > 0 ? -1 : 1; // Rueda hacia abajo -> Zoom out
    const scaleFactor = 1.1; // Factor de cambio de escala
    const newScale = direction > 0 ? oldScale * scaleFactor : oldScale / scaleFactor;
    
    // Limitar el zoom (opcional)
    const clampedNewScale = Math.max(0.001, Math.min(100, newScale));

    // Calculo del punto de anclaje (zoom centrado en el puntero)
    const mousePointTo = {
      x: (pointer.x - offset.x) / oldScale,
      y: (pointer.y - offset.y) / oldScale,
    };

    // Nuevo offset para mantener el punto de anclaje
    const newOffsetX = pointer.x - mousePointTo.x * clampedNewScale;
    const newOffsetY = pointer.y - mousePointTo.y * clampedNewScale;

    setScale(clampedNewScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  // Función para dibujar una entidad interna (dentro de un Group/Block)
  const renderInternalEntity = (entity, index, parentColor) => {
    const strokeWidth = 1 / scale;
    const strokeColor = entity.color || parentColor || 'black';

    switch (entity.type) {
        case 'LINE':
            return (
              <Line
                key={index}
                points={[entity.start.x, entity.start.y, entity.end.x, entity.end.y]}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                lineCap="round"
                lineJoin="round"
              />
            );
        case 'CIRCLE':
            return (
              <Circle
                key={index}
                x={entity.center.x}
                y={entity.center.y}
                radius={entity.radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            );
        case 'LWPOLYLINE':
            // Las polilíneas ya tienen puntos planos [x1, y1, x2, y2, ...]
            if (!entity.points || entity.points.length < 4) return null;
            
            return (
              <Line
                key={index}
                points={entity.points} 
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                closed={entity.isClosed} 
                lineCap="round"
                lineJoin="round"
              />
            );
        case 'TEXT':
            // NOTA: La altura del texto en DXF es relativa al dibujo. Necesita ser escalada con Konva.
            // Para mantener el tamaño visible, la altura se multiplica por la escala.
            const fontSize = (entity.height * scale) || 20; // Tamaño base del texto, ajustado por zoom
            
            return (
                <Text
                    key={index}
                    text={entity.text}
                    x={entity.x}
                    y={entity.y}
                    fontSize={fontSize * (1 / scale) } // Tamaño base del texto, ajustado inversamente por zoom
                    fill={strokeColor}
                    rotation={-entity.rotation} // Rotación de Konva es en sentido antihorario
                    align="left"
                    verticalAlign="top"
                />
            );
        default:
            return null;
    }
  };


  // Función principal para dibujar una entidad
  const renderEntity = (entity, index) => {
    const strokeWidth = 1 / scale;
    // Convierte el color index a un color CSS o usa el predeterminado
    const strokeColor = entity.color === 'black' ? '#333' : entity.color; 
    
    switch (entity.type) {
      case 'LINE':
        return (
          <Line
            key={index}
            points={[entity.start.x, entity.start.y, entity.end.x, entity.end.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
          />
        );
      case 'CIRCLE':
        return (
          <Circle
            key={index}
            x={entity.center.x}
            y={entity.center.y}
            radius={entity.radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case 'TEXT':
        const fontSize = (entity.height * scale) || 20; 
        
        return (
            <Text
                key={index}
                text={entity.text}
                x={entity.x}
                y={entity.y}
                fontSize={fontSize * (1 / scale) } 
                fill={strokeColor}
                rotation={-entity.rotation} 
                align="left"
                verticalAlign="top"
            />
        );
      case 'LWPOLYLINE':
        if (!entity.points || entity.points.length < 4) return null;
        
        return (
          <Line
            key={index}
            points={entity.points} // Array plano [x1, y1, x2, y2, ...]
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            closed={entity.isClosed} // Cierra la figura si es una forma
            lineCap="round"
            lineJoin="round"
          />
        );

      case 'INSERT':
        const blockGeometry = blocks[entity.name] ? blocks[entity.name].entities : [];
        if (blockGeometry.length === 0) {
             // console.warn(`Insertar ${entity.name} no tiene geometría definida.`);
             return null;
        }

        return (
            <Group
                key={index}
                // Posición de inserción del bloque
                x={entity.x}
                y={entity.y}
                // Escala y rotación del insert
                scaleX={entity.scaleX || 1}
                scaleY={entity.scaleY || 1}
                rotation={entity.rotation}
            >
                {/* Dibuja recursivamente la geometría interna del bloque */}
                {blockGeometry.map((blockEntity, blockIndex) => {
                    // El color del insert puede aplicar a las entidades internas
                    return renderInternalEntity(blockEntity, blockIndex, strokeColor);
                })}
            </Group>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-screen">
        <div className="mb-4 p-2 bg-white rounded-lg shadow-md w-full max-w-5xl">
            <p className="text-sm font-mono text-gray-700">
                {debugInfo || 'Haga zoom con la rueda y pan (arrastrar) con el ratón.'}
            </p>
        </div>
        <div 
            className="rounded-lg shadow-xl bg-white"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
            <Stage
                ref={stageRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onWheel={handleWheel} // Zoom
                onMouseDown={handleMouseDown} // Pan
                onMouseUp={handleMouseUp} // Pan
                onMouseMove={handleMouseMove} // Pan
                className="rounded-lg"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }} 
            >
                <Layer
                    // Las transformaciones de la capa aplican a todo el dibujo
                    x={offset.x}
                    y={offset.y}
                    scaleX={scale}
                    scaleY={-scale} // Invertir el eje Y (DXF/CAD usan Y+ hacia arriba)
                >
                    {/* Eje de prueba (0,0) a (100,100) en el sistema DXF */}
                    <Line 
                        points={[0, 0, 100, 100]} 
                        stroke="red"
                        strokeWidth={5 / scale} // Se ajusta para que el grosor sea constante en la pantalla
                        opacity={0.5}
                    />
                    {/* Dibuja todas las entidades DXF */}
                    {entities.map((entity, index) => renderEntity(entity, index))}
                </Layer>
            </Stage>
        </div>
    </div>
  );
}


// --- COMPONENTE PRINCIPAL (App.jsx) ---

function App() {
  const [dxfEntities, setDxfEntities] = useState(null);
  const [blockDefinitions, setBlockDefinitions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const handleDxfFileSelect = (file) => {
    setLoading(true);
    setError(null);
    setDxfEntities(null); // Limpiar el lienzo
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      
      try {
        const drawing = parseDxfFile(fileContent);
        const { entities: extractedEntities, blocks: extractedBlocks } = extractDxfEntities(drawing);

        setDxfEntities(extractedEntities);
        setBlockDefinitions(extractedBlocks);
        console.log(`Dibujo analizado con ${extractedEntities.length} entidades.`);

      } catch (error) {
        console.error("Error al procesar el archivo:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
        setError("Error al leer el archivo.");
        setLoading(false);
    }
    
    reader.readAsText(file);
  };

  // Componente simple de menú de herramientas
  const MenuPanel = ({ onDxfFileSelect }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onDxfFileSelect(file);
        }
        // Limpiar el input para permitir la recarga del mismo archivo
        event.target.value = null; 
    };

    return (
        <div className="bg-white p-4 shadow-lg rounded-xl mb-6 w-full max-w-5xl">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Herramientas DXF</h2>
            <p className="text-sm text-gray-600 mb-4">
                Importe un archivo .dxf para visualizar su geometría 2D (Líneas, Círculos, Polilíneas y Bloques).
            </p>
            <div className="flex justify-start space-x-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".dxf"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    Importar Archivo DXF
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Visor de Geometría DXF 2D</h1>
        <p className="text-gray-500">Impulsado por React y Konva</p>
      </header>
      
      {/* Panel de Herramientas */}
      <div className="flex justify-center">
        <MenuPanel onDxfFileSelect={handleDxfFileSelect} />
      </div>

      {/* Área de Trabajo Principal (Canvas / Diseño) */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-2xl relative">
          {loading ? (
            <div className="flex items-center justify-center h-[600px] text-lg text-blue-600">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              Cargando y analizando dibujo...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[600px] text-red-600 border border-red-300 bg-red-50 p-4 rounded-lg">
                <p className="font-semibold">Error de Carga: {error}</p>
            </div>
          ) : dxfEntities && dxfEntities.length > 0 ? (
            <>
              <p className="absolute top-8 left-8 text-sm text-gray-600 z-10 p-1 bg-white bg-opacity-80 rounded">
                  Entidades encontradas: {dxfEntities.length}
              </p>
              
              {/* Pasamos las entidades al componente de dibujo */}
              <DxfCanvasComponent 
                entities={dxfEntities}
                blocks={blockDefinitions}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg p-10">
              <p className="text-lg">
                Lienzo de Diseño Vacío.
                <br/>
                ¡Importa un archivo DXF para comenzar la visualización!
              </p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default App;
