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

    // 1. Calcular límites del dibujo (Bounding Box)
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    entities.forEach(entity => {
      // ⚠️ Solo calculamos límites para las entidades que tienen puntos
      if (entity.type === 'LINE' && entity.start && entity.end) {
        minX = Math.min(minX, entity.start.x, entity.end.x);
        minY = Math.min(minY, entity.start.y, entity.end.y);
        maxX = Math.max(maxX, entity.start.x, entity.end.x);
        maxY = Math.max(maxY, entity.start.y, entity.end.y);
      } else if (entity.type === 'CIRCLE' && entity.center && entity.radius > 0) {
        minX = Math.min(minX, entity.center.x - entity.radius);
        minY = Math.min(minY, entity.center.y - entity.radius);
        maxX = Math.max(maxX, entity.center.x + entity.radius);
        maxY = Math.max(maxY, entity.center.y + entity.radius);
      }
    });

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    // 2. Cálculo de la escala y centrado (con protección contra división por cero)
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
      if (!isFinite(newScale) || newScale === 0) {
          newScale = INITIAL_SCALE; // Revertir a escala inicial si falla
      }

      // Calcular el nuevo centro del dibujo
      const centerX = minX + drawingWidth / 2;
      const centerY = minY + drawingHeight / 2;

      // Calcular el offset para centrar el dibujo escalado
      offsetX = (CANVAS_WIDTH / 2) - (centerX * newScale);
      offsetY = (CANVAS_HEIGHT / 2) - (centerY * newScale);
    }

    setScale(newScale);
    setOffset({ x: offsetX, y: offsetY });
    setDebugInfo(`Scale: ${newScale.toFixed(2)}, Offset: (${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`);

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
