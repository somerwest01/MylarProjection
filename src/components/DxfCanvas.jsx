import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const INITIAL_SCALE = 1;

const isSafeNumber = (c) => typeof c === 'number' && isFinite(c);

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
            case 'MTEXT':
            if (!entity.text || !entity.x) return null; 
            const BASE_FONT_SIZE = 1.0;

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
                    fontSize={BASE_FONT_SIZE / scale} 
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
        <Line 
            points={[0, 0, 100, 100]} // Dibuja una línea de (0,0) a (100,100)
            stroke="red"
            strokeWidth={1 / scale}
        />
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
