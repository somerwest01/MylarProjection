import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';

// Definimos un tamaño fijo para el canvas dentro de canvas-container
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

function DxfCanvas({ entities }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [initialView, setInitialView] = useState(false);
  
  // 🆕 EFECTO para centrar y escalar el dibujo al cargar
  useEffect(() => {
    if (entities && entities.length > 0 && !initialView) {
      // 1. Calcular límites del dibujo (Bounding Box)
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      entities.forEach(entity => {
        // Esto debe ajustarse según el tipo de entidad
        if (entity.type === 'LINE') {
          minX = Math.min(minX, entity.start.x, entity.end.x);
          minY = Math.min(minY, entity.start.y, entity.end.y);
          maxX = Math.max(maxX, entity.start.x, entity.end.x);
          maxY = Math.max(maxY, entity.start.y, entity.end.y);
        }
        // ... Lógica para otros tipos (Polyline, Circle, etc.)
      });

      const drawingWidth = maxX - minX;
      const drawingHeight = maxY - minY;

      // 2. Calcular la escala y centrado
      const padding = 50; // Un poco de margen
      const scaleX = (CANVAS_WIDTH - padding) / drawingWidth;
      const scaleY = (CANVAS_HEIGHT - padding) / drawingHeight;
      const newScale = Math.min(scaleX, scaleY) || 1;

      // 3. Aplicar el centrado
      const offsetX = (CANVAS_WIDTH / 2) - (drawingWidth / 2) * newScale - minX * newScale;
      const offsetY = (CANVAS_HEIGHT / 2) - (drawingHeight / 2) * newScale - minY * newScale;

      setScale(newScale);
      setOffset({ x: offsetX, y: offsetY });
      setInitialView(true);
    }
  }, [entities, initialView]);


  // 🆕 Función para renderizar una entidad
  const renderEntity = (entity, index) => {
    const strokeColor = entity.colorIndex ? entity.colorIndex : 'black';

    switch (entity.type) {
      case 'LINE':
        return (
          <Line
            key={index}
            points={[entity.start.x, entity.start.y, entity.end.x, entity.end.y]}
            stroke={strokeColor}
            strokeWidth={1 / scale} // 1px real, sin importar el zoom
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
            strokeWidth={1 / scale}
          />
        );
      // ➡️ Aquí agregarías más casos (POLYLINE, ARC, TEXT, etc.)
      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ border: '1px solid #ddd' }}
    >
      <Layer
        scaleX={scale}
        scaleY={scale}
        offsetX={-offset.x / scale} // Aplicar el offset en la posición del Layer
        offsetY={-offset.y / scale} // Asegurarse que el punto (0,0) esté visible
      >
        {entities.map((entity, index) => renderEntity(entity, index))}
      </Layer>
    </Stage>
  );
}

export default DxfCanvas;
