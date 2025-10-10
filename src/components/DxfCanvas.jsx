import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const INITIAL_SCALE = 1;

function DxfCanvas({ entities }) {
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
    
    // 🆕 Limite seguro para las coordenadas
    const SAFE_LIMIT = 1e9; // 1 billón (1,000,000,000)

    entities.forEach(entity => {
      // Función de validación para asegurar que el valor es un número finito y dentro del límite seguro
      const isValidCoord = (c) => typeof c === 'number' && isFinite(c) && Math.abs(c) < SAFE_LIMIT;

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
      }
    });

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    console.log(`DXF Limits: MinX=${minX.toFixed(2)}, MaxX=${maxX.toFixed(2)} | Width=${drawingWidth.toFixed(2)}`);
    console.log(`DXF Limits: MinY=${minY.toFixed(2)}, MaxY=${maxY.toFixed(2)} | Height=${drawingHeight.toFixed(2)}`);

    let newScale = INITIAL_SCALE;
    let offsetX = 0;
    let offsetY = 0;
    
    // Solo escalamos si el dibujo tiene un tamaño perceptible
 if (minX !== Infinity && maxX !== -Infinity && drawingWidth > 0 && drawingHeight > 0) {

      const padding = 50;
      const scaleX = (CANVAS_WIDTH - padding) / drawingWidth;
      const scaleY = (CANVAS_HEIGHT - padding) / drawingHeight;
      newScale = Math.min(scaleX, scaleY);
      
      // Asegurar que la escala no sea 0 o Infinity
      if (!isFinite(newScale) || newScale <= 0 || newScale > 1000) { 
          newScale = INITIAL_SCALE;
      }

      const centerX = minX + drawingWidth / 2;
      const centerY = minY + drawingHeight / 2;

      offsetX = (CANVAS_WIDTH / 2) - (centerX * newScale);
      offsetY = (CANVAS_HEIGHT / 2) - (centerY * newScale);
    }

    setScale(newScale);
    setOffset({ x: offsetX, y: offsetY });

  }, [entities]);  // Se ejecuta cada vez que las entidades cambian

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
    if (!isDragging) return;
    const dx = e.evt.clientX - lastPos.x;
    const dy = e.evt.clientY - lastPos.y;

    setOffset(prevOffset => ({
      x: prevOffset.x + dx,
      y: prevOffset.y + dy,
    }));

    setLastPos({ x: e.evt.clientX, y: e.evt.clientY });
  }, [isDragging, lastPos]);

  // Función para renderizar una entidad
  const renderEntity = (entity, index) => {
    if (!entity || !entity.type) return null;
    
    const strokeColor = entity.color || 'black';
    const strokeWidth = 1 / scale;

    switch (entity.type) {
      case 'LINE':
        if (!entity.start || !entity.end || isNaN(entity.start.x) || isNaN(entity.end.x)) return null;
        return (
          <Line
            key={index}
            points={[entity.start.x, entity.start.y, entity.end.x, entity.end.y]}
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
        return (
          <Line
            key={index}
            points={entity.points} // Array plano [x1, y1, x2, y2, ...]
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            closed={entity.isClosed} // Cierra la figura si es una forma (e.g., rectángulo)
          />
        );
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
        // Konva usa x, y en el Layer para aplicar el offset y el pan.
        x={offset.x}
        y={offset.y}
        scaleX={scale}
        scaleY={scale}
      >
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
