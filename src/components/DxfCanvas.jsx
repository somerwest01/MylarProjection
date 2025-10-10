import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

function DxfCanvas({ entities }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
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
      } else if (entity.type === 'CIRCLE' && entity.center) {
         // Lógica simplificada para círculos
        minX = Math.min(minX, entity.center.x - entity.radius);
        minY = Math.min(minY, entity.center.y - entity.radius);
        maxX = Math.max(maxX, entity.center.x + entity.radius);
        maxY = Math.max(maxY, entity.center.y + entity.radius);
      }
    });

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;

    // 2. Cálculo de la escala y centrado (con protección contra división por cero)
    const padding = 50;
    let newScale = 1;
    
    // Solo escalamos si el dibujo tiene un tamaño perceptible
    if (drawingWidth > 0 && drawingHeight > 0) {
        const scaleX = (CANVAS_WIDTH - padding) / drawingWidth;
        const scaleY = (CANVAS_HEIGHT - padding) / drawingHeight;
        newScale = Math.min(scaleX, scaleY);
    }
    
    // 3. Aplicar el centrado (manejando posible Infinity/NaN si no se encontraron entidades)
    if (minX !== Infinity && maxX !== -Infinity) {
      const centerX = minX + drawingWidth / 2;
      const centerY = minY + drawingHeight / 2;

      const offsetX = (CANVAS_WIDTH / 2) - (centerX * newScale);
      const offsetY = (CANVAS_HEIGHT / 2) - (centerY * newScale);
      
      setScale(newScale);
      setOffset({ x: offsetX, y: offsetY });
    }
    
  }, [entities]); // Se ejecuta cada vez que las entidades cambian


  // Función para renderizar una entidad
  const renderEntity = (entity, index) => {
    // ⚠️ Protección contra valores indefinidos o inválidos antes de renderizar
    if (!entity || !entity.type) return null;
    
    // Determina el color (si viene del DXF, si no, usa negro)
    const strokeColor = entity.color || 'black';

    switch (entity.type) {
      case 'LINE':
        // Protección extra para líneas
        if (!entity.start || !entity.end) return null;
        
        return (
          <Line
            key={index}
            points={[entity.start.x, entity.start.y, entity.end.x, entity.end.y]}
            stroke={strokeColor}
            strokeWidth={1 / scale} // 1px real, sin importar el zoom
          />
        );
      case 'CIRCLE':
        // Protección extra para círculos
        if (!entity.center || !entity.radius) return null;
        
        return (
          <Circle
            key={index}
            x={entity.center.x}
            y={entity.center.y}
            radius={entity.radius}
            stroke={strokeColor}
            strokeWidth={1 / scale}
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
      // El estilo aquí es importante para que el Stage ocupe el espacio del canvas-container
      style={{ border: '1px solid #ddd' }} 
    >
      <Layer
        // ⚠️ Konva usa la propiedad position (x, y) en el Layer para el centrado/offset
        x={offset.x}
        y={offset.y}
        scaleX={scale}
        scaleY={scale}
      >
        {entities.map((entity, index) => renderEntity(entity, index))}
      </Layer>
    </Stage>
  );
}

export default DxfCanvas;
