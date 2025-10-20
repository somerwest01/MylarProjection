import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Group } from 'react-konva';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const INITIAL_SCALE = 1;

const isSafeNumber = (c) => typeof c === 'number' && isFinite(c);

function DxfCanvas({ entities, setEntities, blocks, drawingMode, setDrawingMode }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [lineStartPoint, setLineStartPoint] = useState(null);
  const [currentEndPoint, setCurrentEndPoint] = useState(null);
  const [tempEntities, setTempEntities] = useState([]);
  const lengthInputRef = useRef(null); 
  const [isTypingLength, setIsTypingLength] = useState(false);

  

  const getRelativePoint = useCallback((stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    // Convertir de coordenadas de la pantalla a coordenadas del Layer (mundo)
    const layer = stage.children[0]; // Asume que Layer es el primer hijo de Stage
    const layerTransform = layer.getAbsoluteTransform().copy();
    
    // Invertir la transformación Y (debido al scaleY=-scale)
    layerTransform.invert();
    
    // Aplicar la transformación y obtener el punto relativo
    const relativePoint = layerTransform.point({ x: pointer.x, y: pointer.y });
    
    // Retornamos solo números enteros (sin decimales)
    return { 
        x: Math.round(relativePoint.x), 
        y: Math.round(relativePoint.y) 
    };
}, []); 
  
  // EFECTO para centrar y escalar el dibujo al cargar
  useEffect(() => {
    if (!entities || entities.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const SAFE_LIMIT = 1e9; // 1 billón (1,000,000,000)
    const isValidCoord = (c) => typeof c === 'number' && isFinite(c) && Math.abs(c) < SAFE_LIMIT;

    entities.forEach(entity => {

      // Cálculo del Bounding Box
      if (entity.type === 'LINE' && entity.start && entity.end) {
        if (isValidCoord(entity.start.x) && isValidCoord(entity.end.x)) {
          minX = Math.min(minX, entity.start.x, entity.end.x);
          maxX = Math.max(maxX, entity.start.x, entity.end.x);
        }
        if (isValidCoord(entity.start.y) && isValidCoord(entity.end.y)) {
          minY = Math.min(minY, entity.start.y, entity.end.y);
          maxY = Math.max(maxY, entity.start.y, entity.end.y);
        }
      } else if (entity.type === 'CIRCLE' && entity.center && entity.radius > 0) {
        if (isValidCoord(entity.center.x) && isValidCoord(entity.radius)) {
          minX = Math.min(minX, entity.center.x - entity.radius);
          maxX = Math.max(maxX, entity.center.x + entity.radius);
        }
        if (isValidCoord(entity.center.y) && isValidCoord(entity.radius)) {
          minY = Math.min(minY, entity.center.y - entity.radius);
          maxY = Math.max(maxY, entity.center.y + entity.radius);
        }
      } else if (entity.type === 'POLYLINE_GEOM' && entity.points) {
          // Iterar sobre los puntos de la polilínea
          for(let i = 0; i < entity.points.length; i += 2) {
              const x = entity.points[i];
              const y = entity.points[i+1];
              
              if (isValidCoord(x)) {
                  minX = Math.min(minX, x);
                  maxX = Math.max(maxX, x);
              }
              if (isValidCoord(y)) {
                  minY = Math.min(minY, y);
                  maxY = Math.max(maxY, y);
              }
          }
      } else if (entity.type === 'MTEXT') {
        // En dxf-importer.js, el MTEXT se exporta con entity.x y entity.y
        const x = entity.x; 
        const y = entity.y;

        if (isValidCoord(x)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        }
        if (isValidCoord(y)) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        } else if (entity.type === 'INSERT') {
        const x = entity.x;
        const y = entity.y;
        
        if (isValidCoord(x)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        }
        if (isValidCoord(y)) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
      }
    });

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    let newScale = INITIAL_SCALE;
    let offsetX = 0;
    let offsetY = 0;

    const isLimitsValid = minX !== Infinity && maxX !== -Infinity && drawingWidth > 0 && drawingHeight > 0;
    
    if (isLimitsValid) {
      // Si los límites son válidos, calculamos la escala y el offset normal
      const padding = 50;
      const scaleX = (CANVAS_WIDTH - padding) / drawingWidth;
      const scaleY = (CANVAS_HEIGHT - padding) / drawingHeight;
      newScale = Math.min(scaleX, scaleY);
      
      // ... (cálculo de centerX/centerY y offsetX/offsetY) ...
      const centerX = minX + drawingWidth / 2;
      const centerY = minY + drawingHeight / 2;

      offsetX = (CANVAS_WIDTH / 2) - (centerX * newScale);
      offsetY = (CANVAS_HEIGHT / 2) - (centerY * (-newScale));
    } else {
      // ⚠️ SOLUCIÓN DE FALLO: Si los límites son inválidos (Infinity/NaN), reseteamos la vista.
      // Esto evita que Konva reciba un valor NaN en su Layer.x o Layer.y.
      newScale = 0.0000001; // Forzamos una escala mínima (para que intente dibujar, aunque muy pequeño)
      offsetX = CANVAS_WIDTH / 2; // Lo centramos en el medio del lienzo.
      offsetY = CANVAS_HEIGHT / 2;
      console.warn("ADVERTENCIA CRÍTICA: Límites del DXF inválidos o demasiado grandes. Forzando una escala mínima y centrado. Use el zoom para encontrar el dibujo.");
    }
    console.log("DIAGNÓSTICO DE LÍMITES:");
    console.log(`MinY: ${minY}, MaxY: ${maxY}`);
    console.log(`DrawingHeight: ${drawingHeight}, DrawingWidth: ${drawingWidth}`);
    console.log(`NewScale: ${newScale}`);
    console.log(`OffsetY calculado: ${offsetY}`);
    console.log(`Posición Y FINAL aplicada: ${offsetY + CANVAS_HEIGHT}`);
    
    // ... (resto del useEffect: setScale, setOffset, setDebugInfo)
    setScale(newScale);
    setOffset({ x: offsetX, y: offsetY });
    setDebugInfo(`Scale: ${newScale.toFixed(8)}, Offset: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`);
  }, [entities]); 

    const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    const oldScale = scale;
    // Zoom in/out
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;

    // Calcular el nuevo offset para mantener el punto bajo el cursor
    const mousePointTo = {
      x: (pointer.x - offset.x) / oldScale,
      y: (pointer.y - offset.y) / oldScale,
    };
    
    setOffset({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    setScale(newScale);
  };
const handleMouseDown = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    
    // 🔑 LÓGICA DE DIBUJO DE LÍNEA
    if (drawingMode === 'line') {
      const point = getRelativePoint(stage);
      if (!point) return;

      if (!lineStartPoint) {
        // Primer clic: Iniciar la línea
        setLineStartPoint(point);
        setCurrentEndPoint(point); // El punto final provisional es el inicio
        setIsTypingLength(false); // Asegúrate de que no estamos en modo tecleo
        
      } else {
        // Segundo clic: Terminar la línea
        const newLine = {
          type: 'LINE',
          start: lineStartPoint,
          end: point,
          color: 'green' // Nuevo color para la línea dibujada
        };
        
        // Agregar la nueva línea a las entidades permanentes
        setEntities(prevEntities => [...prevEntities, newLine]);
        
        // El punto de destino se convierte en el nuevo punto de inicio (dibujo continuo)
        setLineStartPoint(point); 
      }
      return; // Salir para no activar el Pan
    }

    // 🔑 LÓGICA DE PAN (si no estamos dibujando)
    if (drawingMode === 'pan') {
      setIsDragging(true);
      setLastPos({ x: e.evt.clientX, y: e.evt.clientY });
    }
}, [drawingMode, lineStartPoint, getRelativePoint, setEntities]);
  

  // Manejo del arrastre (Pan)
  const handleMouseDown = useCallback((e) => {
    e.evt.preventDefault();
    setIsDragging(true);
    setLastPos({ x: e.evt.clientX, y: e.evt.clientY });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

const handleMouseMove = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    // Lógica de Pan
    if (drawingMode === 'pan' && isDragging) {
      // ... (código existente para Pan) ...
      const dx = e.evt.clientX - lastPos.x;
      const dy = e.evt.clientY - lastPos.y;

      setOffset(prevOffset => ({
        x: prevOffset.x + dx,
        y: prevOffset.y + dy,
      }));

      setLastPos({ x: e.evt.clientX, y: e.evt.clientY });
      return; // Salir
    }
    
    // 🔑 LÓGICA DE VISTA PREVIA DE LÍNEA
    if (drawingMode === 'line' && lineStartPoint && !isTypingLength) {
        const point = getRelativePoint(stage);
        if (point) {
            setCurrentEndPoint(point);
        }
    }
}, [isDragging, lastPos, drawingMode, lineStartPoint, isTypingLength, getRelativePoint]);

  useEffect(() => {
    // 🔑 Manejador de entrada de teclado para la longitud
    const handleKeyDown = (e) => {
      // Solo interesa si estamos en modo 'line' Y ya tenemos un punto de inicio
      if (drawingMode !== 'line' || !lineStartPoint) return; 

      // Si el usuario presiona Enter para confirmar la longitud
      if (e.key === 'Enter' && isTypingLength && lengthInputRef.current) {
        const length = parseInt(lengthInputRef.current.value);
        
        if (isNaN(length) || length <= 0) {
            // Si el valor no es válido, salimos del modo tecleo
            setIsTypingLength(false);
            return;
        }

        // 1. Obtener el ángulo de la línea de vista previa (mouse position)
        const dx_preview = currentEndPoint.x - lineStartPoint.x;
        const dy_preview = currentEndPoint.y - lineStartPoint.y;
        const angle = Math.atan2(dy_preview, dx_preview);
        
        // 2. Calcular el nuevo punto final usando la longitud y el ángulo
        const newEndPoint = {
            x: lineStartPoint.x + length * Math.cos(angle),
            y: lineStartPoint.y + length * Math.sin(angle)
        };
        
        // 3. Crear la nueva línea (con coordenadas redondeadas)
        const newLine = {
            type: 'LINE',
            start: lineStartPoint,
            end: { x: Math.round(newEndPoint.x), y: Math.round(newEndPoint.y) },
            color: 'green' 
        };
        
        // 4. Agregar la línea, establecer el nuevo inicio y salir del modo tecleo
        setEntities(prevEntities => [...prevEntities, newLine]);
        setLineStartPoint(newLine.end); // Continuar dibujo
        setIsTypingLength(false);
        setCurrentEndPoint(newLine.end); // La vista previa comienza desde el nuevo final
        
        // 5. Opcional: Centrar la vista en el nuevo punto (si es necesario)
        // Por ahora, solo limpiamos el input
        lengthInputRef.current.value = '';
        
      } 
      // Si el usuario presiona una tecla numérica y NO está tecleando AÚN
      else if (['0','1','2','3','4','5','6','7','8','9'].includes(e.key) && !isTypingLength) {
          setIsTypingLength(true);
          // Opcional: Enfocar el input
          if (lengthInputRef.current) {
              lengthInputRef.current.focus();
              lengthInputRef.current.value = e.key; // Coloca el primer dígito
          }
      } 
      // Si el usuario presiona ESC para cancelar
      else if (e.key === 'Escape') {
          setLineStartPoint(null); // Cancela el dibujo
          setCurrentEndPoint(null);
          setIsTypingLength(false);
          if (lengthInputRef.current) lengthInputRef.current.value = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

}, [drawingMode, lineStartPoint, currentEndPoint, setEntities, isTypingLength]);
  

  const renderInternalEntity = (blockEntity, blockIndex) => {
    const strokeColor = blockEntity.color || 'gray'; 
    const strokeWidth = 1 / scale; 

    switch (blockEntity.type) {
        case 'LINE':
            if (!blockEntity.start || !blockEntity.end) return null;
            const linePoints = [blockEntity.start.x, blockEntity.start.y, blockEntity.end.x, blockEntity.end.y];
            return (
                <Line
                    key={`line-${blockIndex}`}
                    points={linePoints}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />
            );
        case 'CIRCLE':
            if (!blockEntity.center || isNaN(blockEntity.center.x) || isNaN(blockEntity.radius)) return null;
            return (
                <Circle
                    key={`circle-${blockIndex}`}
                    x={blockEntity.center.x}
                    y={blockEntity.center.y}
                    radius={blockEntity.radius}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />
            );
        case 'POLYLINE_GEOM':
             if (!blockEntity.points || blockEntity.points.length < 4) return null;
             return (
                 <Line
                     key={`poly-${blockIndex}`}
                     points={blockEntity.points}
                     stroke={strokeColor}
                     strokeWidth={strokeWidth}
                     closed={blockEntity.isClosed}
                 />
             );
        default:
            return null;
    }
};
 
  const renderEntity = (entity, index) => {
    if (!entity || !entity.type) return null;
    
    const strokeColor = entity.color || 'black';
    const strokeWidth = 1 / scale;

    switch (entity.type) {
            case 'MTEXT':
            if (!entity.text || !entity.x) return null; 
            const BASE_FONT_SIZE = 50;

            console.log("RENDER TEXTO:", {
                text: entity.text, 
                x: entity.x, 
                y: entity.y, 
                fontSize: BASE_FONT_SIZE / scale, 
                scale: scale
            });
        
            return (
                <Text
                    key={index}
                    text={entity.text}
                    scaleY={-1}
                    x={entity.x}
                    y={entity.y}
                    rotation={entity.rotation}
                    fontSize={BASE_FONT_SIZE} 
                    fill={entity.color} 
                />
            );
        
      case 'LINE':
        if (!entity.start || !entity.end) return null;
        const linePoints = [
            entity.start.x || 0,  // ⬅️ CAMBIO CRÍTICO
            entity.start.y || 0,  // ⬅️ CAMBIO CRÍTICO
            entity.end.x || 0,    // ⬅️ CAMBIO CRÍTICO
            entity.end.y || 0     // ⬅️ CAMBIO CRÍTICO
        ];
        
        const allLineCoordsValid = linePoints.every(isSafeNumber);
        if (!allLineCoordsValid) {
            console.error(`Línea ${index} omitida (Error de coordenadas no finitas):`, linePoints);
            return null;
        }  
        return (
          <Line
            key={index}
            points={linePoints}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );      
      case 'CIRCLE':
        if (!entity.center || isNaN(entity.center.x) || isNaN(entity.radius)) return null;
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
      case 'POLYLINE_GEOM': // ⬅️ NUEVO CASO para Polilíneas
        if (!entity.points || entity.points.length < 4) return null;
        const validPoints = entity.points.filter(isSafeNumber);

        if (validPoints.length / entity.points.length < 0.9) { 
             console.error(`Polilínea ${index} omitida, demasiados puntos inválidos.`);
             return null;
        }
        
        return (
          <Line
            key={index}
            points={entity.points} // Array plano [x1, y1, x2, y2, ...]
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            closed={entity.isClosed} // Cierra la figura si es una forma (e.g., rectángulo)
          />
        );
    case 'INSERT': 
        const blockGeometry = blocks[entity.name];
        
        // 1. Verificar que la definición del bloque existe y tiene geometría
        if (blockGeometry && blockGeometry.length > 0) {
            
            // Diagnóstico (opcional)
            console.log(`Bloque INSERT encontrado y renderizado: ${entity.name}. Geometría interna: ${blockGeometry.length} entidades.`);
            
            // 2. Devolver el componente Group (el dibujo real)
            return (
                <Group 
                    key={`block-${index}`}
                    x={entity.x}
                    y={entity.y}
                    scaleX={entity.scaleX || 1}
                    scaleY={entity.scaleY || 1}
                    rotation={entity.rotation}
                >
                    {/* 🔑 Dibuja recursivamente la geometría interna del bloque */}
                    {blockGeometry.map((blockEntity, blockIndex) => {
                        return renderInternalEntity(blockEntity, blockIndex);
                    })}
                </Group>
            );

        } else {
            // 3. Si no se encuentra, devolver null (no dibujar)
            console.warn(`Bloque INSERT omitido: Definición '${entity.name}' no encontrada o está vacía. Definiciones cargadas: ${Object.keys(blocks).join(', ')}`);
            return null;
        }

    default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onWheel={handleWheel} // ⬅️ Zoom
      onMouseDown={handleMouseDown} // ⬅️ Pan
      onMouseUp={handleMouseUp} // ⬅️ Pan
      onMouseMove={handleMouseMove} // ⬅️ Pan
      style={{ border: '1px solid #ddd', cursor: isDragging ? 'grabbing' : 'grab' }} 
    >
      <Layer
        x={offset.x}
        y={offset.y}
        scaleX={scale}
        scaleY={-scale}
      >
        {/* 🔑 HUD: Medida de la línea (visible solo en modo 'line' con punto de inicio) */}
{drawingMode === 'line' && lineStartPoint && currentEndPoint && (
    <Layer>
        {/* 1. Calcular y mostrar la longitud */}
        <Text
            text={(() => {
                const dx = currentEndPoint.x - lineStartPoint.x;
                const dy = currentEndPoint.y - lineStartPoint.y;
                const length = Math.round(Math.sqrt(dx * dx + dy * dy));
                return `Longitud: ${length} mm`;
            })()}
            fontSize={14}
            fill="blue"
            x={stageRef.current.getPointerPosition().x + 10} // Mostrar al lado del cursor
            y={stageRef.current.getPointerPosition().y}
            fontStyle="bold"
            // Escala inversa para que el texto no se vea afectado por el zoom del dibujo
            scaleX={1 / scale} 
            scaleY={1 / scale} 
        />
    </Layer>
)}

{/* 🔑 Capa para la Información de depuración (Mantenla o bórrala) */}
<Layer> 
  {/* ... (código existente para el debug info) ... */}
  <Text 
      text={debugInfo} 
      fontSize={12} 
      fill="blue" 
      x={10} 
      y={CANVAS_HEIGHT - 30} 
  />
</Layer>
        {/* 🔑 Vista previa de la línea */}
{drawingMode === 'line' && lineStartPoint && currentEndPoint && (
  <Line
    points={[lineStartPoint.x, lineStartPoint.y, currentEndPoint.x, currentEndPoint.y]}
    stroke="gray"
    strokeWidth={1 / scale}
    dash={[10 / scale, 5 / scale]} // Línea punteada
  />
)}
        {entities.map((entity, index) => renderEntity(entity, index))}
      </Layer>
       {/* Información de depuración superpuesta */}
      <Layer> 
        <Text 
            text={debugInfo} 
            fontSize={12} 
            fill="blue" 
            x={10} 
            y={CANVAS_HEIGHT - 30} 
        />
      </Layer>
    </Stage>
  );
}

export default DxfCanvas;
