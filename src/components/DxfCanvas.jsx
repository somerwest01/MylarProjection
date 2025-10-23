import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva';

const ContextMenuButton = ({ iconClass, name, onClick, isActive }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: isActive ? '#e0f7fa' : 'white',
            fontWeight: isActive ? 'bold' : 'normal',
            borderLeft: isActive ? '3px solid #00bcd4' : 'none',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isActive ? '#e0f7fa' : '#f0f0f0'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActive ? '#e0f7fa' : 'white'}
    >
        <i className={iconClass} style={{ marginRight: '10px', width: '20px', textAlign: 'center' }}></i>
        <span>{name}</span>
    </div>
);

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const INITIAL_SCALE = 1;

const isSafeNumber = (c) => typeof c === 'number' && isFinite(c);

function DxfCanvas({ entities, setEntities, blocks, drawingMode, setDrawingMode, isOrthoActive, isSnapActive, lineColor, lineThicknessMm }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [lineStartPoint, setLineStartPoint] = useState(null);
  const [currentEndPoint, setCurrentEndPoint] = useState(null);
  const [tempEntities, setTempEntities] = useState([]);
  const [isTypingLength, setIsTypingLength] = useState(false);
  const [typedLength, setTypedLength] = useState(''); 
  const [contextMenu, setContextMenu] = useState(null);
  const [hoveredEntityIndex, setHoveredEntityIndex] = useState(null);
  const [selectedEntityIndex, setSelectedEntityIndex] = useState(null);
  

  const getRelativePoint = useCallback((stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const layer = stage.children[0]; 
    const layerTransform = layer.getAbsoluteTransform().copy();
    

    layerTransform.invert();
    
    const relativePoint = layerTransform.point({ x: pointer.x, y: pointer.y });
    
    return { 
        x: Math.round(relativePoint.x), 
        y: Math.round(relativePoint.y) 
    };
}, []); 

  // 🔑 NUEVO EFECTO: Resetea el estado de dibujo cuando el modo cambia
useEffect(() => {
    if (drawingMode !== 'line') {
        setLineStartPoint(null); 
        setCurrentEndPoint(null);
        setTypedLength(''); // Limpia cualquier dimensión tecleada
        setIsTypingLength(false); // Sale del modo de entrada numérica
    }
if (drawingMode !== 'select') {
        setSelectedEntityIndex(null);
        setHoveredEntityIndex(null);
    }
}, [drawingMode]);
  
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
  }, []); 

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
  
    if (contextMenu) {
    setContextMenu(null);
  }

if (e.target === stage) { 
        if (drawingMode === 'select') {
            setSelectedEntityIndex(null); // Deselect if in 'select' mode
            setHoveredEntityIndex(null); // Also clear hover
        }
    }

    // Ignorar clics mientras el usuario está tecleando la longitud
    if (isTypingLength) return; 
    
    // 🔑 LÓGICA DE DIBUJO DE LÍNEA
    if (drawingMode === 'line') {
      const clickedPoint = getRelativePoint(stage);
      if (!clickedPoint) return;

      if (!lineStartPoint) {
      let snappedStartPoint = clickedPoint;
        if (isSnapActive) {
            snappedStartPoint = getSnappedPoint(clickedPoint); 
        }
        
        setLineStartPoint(snappedStartPoint);
        setCurrentEndPoint(snappedStartPoint);// El punto final provisional es el inicio
        
      } else {
        const finalPoint = currentEndPoint || clickedPoint; 
        
        const newLine = {
          type: 'LINE',
          start: lineStartPoint,
          end: finalPoint,
          color: lineColor,
          thickness: lineThicknessMm
        };
        
        // Agregar la nueva línea
        setEntities(prevEntities => [...prevEntities, newLine]);
        
        // El punto de destino (ajustado) se convierte en el nuevo punto de inicio (dibujo continuo)
        setLineStartPoint(finalPoint); 
        setCurrentEndPoint(finalPoint); // Reiniciar la vista previa desde el nuevo punto
      }
      return; 
    }

    // 🔑 LÓGICA DE PAN (si no estamos dibujando)
    if (drawingMode === 'pan') {
      setIsDragging(true);
      setLastPos({ x: e.evt.clientX, y: e.evt.clientY });
    }
}, [drawingMode, lineStartPoint, currentEndPoint, getRelativePoint, setEntities, isTypingLength]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

const SNAP_DISTANCE = 10; // Distancia en píxeles de la pantalla para el ajuste

const getSnappedPoint = useCallback((currentPoint) => {
    if (!isSnapActive || !stageRef.current) return currentPoint;

    let bestSnapPoint = currentPoint;
    let minDistance = Infinity;

    // 1. Convertir la distancia de píxeles a unidades del mundo
    // (SNAP_DISTANCE / scale) nos da la distancia en unidades de dibujo
    const snapThresholdWorld = SNAP_DISTANCE / scale; 

    // 2. Iterar sobre los puntos clave de las entidades existentes (solo líneas por ahora)
    entities.forEach(entity => {
        if (entity.type === 'LINE') {
            const snapPoints = [entity.start, entity.end];
            
            snapPoints.forEach(p => {
                if (!p) return;
                
                const dx = p.x - currentPoint.x;
                const dy = p.y - currentPoint.y;
                const distanceWorld = Math.sqrt(dx * dx + dy * dy);
                
                if (distanceWorld < snapThresholdWorld && distanceWorld < minDistance) {
                    minDistance = distanceWorld;
                    // Retornamos el punto de la entidad como el punto de ajuste
                    bestSnapPoint = { x: p.x, y: p.y }; 
                }
            });
        }
    });

    return bestSnapPoint;
}, [isSnapActive, entities, scale]);

const handleContextMenu = (e) => {
    // 1. Evitar el menú contextual del navegador
    e.evt.preventDefault(); 
    const stage = stageRef.current;
    if (!stage) return;

    // 2. Determinar si se hizo clic sobre una entidad
    const clickedOnShape = e.target !== stage && e.target.getStage() === stage;

    if (clickedOnShape) {
        // Si hacemos clic en una entidad, el menú no aparece, y podrías implementar la selección.
        // Por ahora, solo ocultamos el menú si estuviera visible.
        setContextMenu(null);
    } else {
        // 3. Mostrar el menú en las coordenadas del ratón (en píxeles de pantalla)
        setContextMenu({
            x: e.evt.clientX,
            y: e.evt.clientY,
        });
    }
};

const handleMouseMove = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (contextMenu) {
    setContextMenu(null);
  }
    
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
        let point = getRelativePoint(stage);
        if (!point) return;

        point = getSnappedPoint(point);
    if (isOrthoActive) {
            const dx = point.x - lineStartPoint.x;
            const dy = point.y - lineStartPoint.y;
            
            // Si el cambio en X es mayor que en Y, fijar Y al punto de inicio.
            if (Math.abs(dx) > Math.abs(dy)) {
                point.y = lineStartPoint.y;
            } 
            // Si el cambio en Y es mayor o igual que en X, fijar X al punto de inicio.
            else {
                point.x = lineStartPoint.x;
            }
        }
        
        // 3. Establecer el punto final (final de la vista previa)
        setCurrentEndPoint(point);
    }
}, [isDragging, lastPos, drawingMode, lineStartPoint, isTypingLength, getRelativePoint, isOrthoActive, getSnappedPoint]);
  
  useEffect(() => {
    // 🔑 Manejador de entrada de teclado para la longitud
    const handleKeyDown = (e) => {
      // Solo interesa si estamos en modo 'line' Y ya tenemos un punto de inicio
      if (drawingMode !== 'line' || !lineStartPoint) return; 

      if (['0','1','2','3','4','5','6','7','8','9'].includes(e.key)) {
          e.preventDefault(); // CRÍTICO: Evita que la tecla afecte a cualquier otro elemento
          const newDigit = e.key;
          
          if (!isTypingLength) {
              setIsTypingLength(true);
              setTypedLength(newDigit);
          } else {
              setTypedLength(prevLength => prevLength + newDigit);
          }
          return; // Finaliza aquí si es un dígito
      }

      // Si el usuario presiona Enter para confirmar la longitud
      if (e.key === 'Enter' && isTypingLength) {
        e.preventDefault(); 
        const length = parseInt(typedLength);
        
        if (isNaN(length) || length <= 0 || !currentEndPoint || !lineStartPoint) {
            console.warn("Entrada de longitud inválida o falta el punto de referencia.");
            setLineStartPoint(null); 
            setCurrentEndPoint(null);
            setTypedLength('');
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
                if (isNaN(newEndPoint.x) || isNaN(newEndPoint.y)) {
            console.error("Coordenadas de la línea no son válidas (NaN/Infinity). Cancelando.");
            // 🚨 SOLUCIÓN: Reiniciar el estado de la línea COMPLETAMENTE
            setLineStartPoint(null); 
            setCurrentEndPoint(null);
            setTypedLength('');
            setIsTypingLength(false);
            return;
        }
        
        const newLine = {
            type: 'LINE',
            start: lineStartPoint,
            end: { x: Math.round(newEndPoint.x), y: Math.round(newEndPoint.y) },
            color: lineColor,
            thickness: lineThicknessMm
        };
        
        // 4. Agregar la línea, establecer el nuevo inicio y salir del modo tecleo
        setEntities(prevEntities => [...prevEntities, newLine]);
        setLineStartPoint(newLine.end); // Continuar dibujo
        setTypedLength('');
        setIsTypingLength(false);
        
        setCurrentEndPoint(newLine.end); // La vista previa comienza desde el nuevo final

        return;
      } 
      // Si el usuario presiona una tecla numérica y NO está tecleando AÚN
      else if (['0','1','2','3','4','5','6','7','8','9'].includes(e.key)) {
         e.preventDefault();
         const newDigit = e.key;

              if (!isTypingLength) {
              setIsTypingLength(true);
              setTypedLength(newDigit);
          } else {
              setTypedLength(prevLength => prevLength + newDigit);
          }
        }
      else if (e.key === 'Backspace' && isTypingLength) {
          e.preventDefault();
          setTypedLength(prevLength => prevLength.slice(0, -1));
          
          // Si solo queda un dígito (el que acabamos de borrar), salimos del modo tecleo.
          if (typedLength.length === 1) { 
              setIsTypingLength(false);
          }
      }
      // Si el usuario presiona ESC para cancelar
      else if (e.key === 'Escape') {
          setLineStartPoint(null); // Cancela el dibujo
          setCurrentEndPoint(null);
          setTypedLength('');
          setIsTypingLength(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

}, [drawingMode, lineStartPoint, currentEndPoint, setEntities, isTypingLength, typedLength]);
  

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
    // const strokeWidth = 1 / scale;

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
            const isHovered = drawingMode === 'select' && hoveredEntityIndex === index;
        const isSelected = drawingMode === 'select' && selectedEntityIndex === index;
        
        const entityThickness = entity.thickness || 1;
        const baseStrokeWidth = entityThickness / scale;
        const strokeColor = entity.color || 'black';
        
        // Propiedades visuales
        const currentStroke = isHovered ? 'blue' : strokeColor;
        // Si está en hover, lo hacemos más grueso, si está seleccionado, mantenemos el grosor base para que el punteado se vea bien.
        const currentStrokeWidth = isHovered ? (baseStrokeWidth * 1.5) : baseStrokeWidth;
        const currentDash = isSelected ? [5 / scale, 5 / scale] : []; // Línea punteada si está seleccionada
        
        const lineComponent = (
          <Line
            key={`line-${index}`}
            points={linePoints}
            stroke={currentStroke}
            strokeWidth={currentStrokeWidth}
            dash={currentDash}
            
            // 🔑 Efectos visuales de sombreado (Hover/Selección)
            shadowBlur={isHovered || isSelected ? 8 / scale : 0} 
            shadowColor={isHovered ? 'blue' : 'black'}
            
            // 🔑 Eventos de selección
            onMouseEnter={() => {
                if (drawingMode === 'select') setHoveredEntityIndex(index);
            }}
            onMouseLeave={() => {
                if (drawingMode === 'select') setHoveredEntityIndex(null);
            }}
            onClick={(e) => {
                // Previene que el clic se propague al Stage (handleMouseDown) para deselección de fondo
                e.cancelBubble = true; 
                if (drawingMode === 'select') {
                    // Toglea la selección
                    setSelectedEntityIndex(prevIndex => prevIndex === index ? null : index);
                }
            }}
          />
        );      
        
        if (isSelected) {
             const handleSize = 6 / scale; // Tamaño del recuadro de selección en unidades del mundo
             const halfHandleSize = handleSize / 2;

             return (
                 <Group key={index}>
                    {lineComponent}
                    {/* Handle 1 (Start Point) - Cuadrado Azul con Borde Negro */}
                    <Rect
                        x={entity.start.x - halfHandleSize}
                        y={entity.start.y - halfHandleSize}
                        width={handleSize}
                        height={handleSize}
                        fill="blue"
                        stroke="black"
                        strokeWidth={1 / scale}
                        // name="handle-start" // Para futura manipulación
                    />
                    {/* Handle 2 (End Point) - Cuadrado Azul con Borde Negro */}
                     <Rect
                        x={entity.end.x - halfHandleSize}
                        y={entity.end.y - halfHandleSize}
                        width={handleSize}
                        height={handleSize}
                        fill="blue"
                        stroke="black"
                        strokeWidth={1 / scale}
                        // name="handle-end" // Para futura manipulación
                    />
                 </Group>
             );
        }
        
        return lineComponent; 
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
    <>
    <Stage
      ref={stageRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onWheel={handleWheel} 
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp} 
      onMouseMove={handleMouseMove}
      onContextMenu={handleContextMenu}
        style={{ 
          border: '1px solid #ddd', 
          cursor: isDragging 
              ? 'grabbing' 
              : (drawingMode === 'line' 
                  ? 'crosshair' 
                  : (drawingMode === 'pan' 
                      ? 'grab' 
                      : 'pointer' 
                  )
              ) 
      }}
    >
        {/* 1. CAPA PRINCIPAL DE DIBUJO (CON ESCALA Y OFFSET) */}
        <Layer
            x={offset.x}
            y={offset.y}
            scaleX={scale}
            scaleY={-scale}
        >
            {/* 🔑 Vista previa de la línea (DENTRO de la capa escalada) */}
            {drawingMode === 'line' && lineStartPoint && currentEndPoint && (
                <Line
                    points={[lineStartPoint.x, lineStartPoint.y, currentEndPoint.x, currentEndPoint.y]}
                    stroke={lineColor}
                    strokeWidth={1 / scale} // Se mantiene delgado sin importar el zoom
                    dash={[10 / scale, 5 / scale]} 
                />
            )}
            {/* Todas las entidades permanentes */}
            {entities.map((entity, index) => renderEntity(entity, index))}
        </Layer>
        
        {/* 2. CAPA DE HUD Y DEBUG (SIN ESCALA NI OFFSET - se superpone) */}
        {/* Usamos un solo Layer para ambos elementos de la UI/HUD */}
        <Layer> 
            {/* HUD: Medida de la línea */}
            {drawingMode === 'line' && lineStartPoint && currentEndPoint && stageRef.current && (
                <Text
                    text={(() => {
                        const dx = currentEndPoint.x - lineStartPoint.x;
                        const dy = currentEndPoint.y - lineStartPoint.y;
                        // Longitud sin decimales
                        const length = Math.round(Math.sqrt(dx * dx + dy * dy)); 
                        return `Longitud: ${length} mm`;
                    })()}
                    fontSize={14}
                    fill="blue"
                    // Posicionamos el texto basándonos en las coordenadas de la pantalla (cursor)
                    x={stageRef.current.getPointerPosition().x + 10} 
                    y={stageRef.current.getPointerPosition().y}
                    fontStyle="bold"
                />
            )}

            {/* Mensaje de tecleo de longitud (para informar al usuario) */}
            {isTypingLength && (
                <Text
        text={`Escriba longitud (mm) y presione Enter: ${typedLength}`} 
        fontSize={14}
        fill="red"
        x={CANVAS_WIDTH / 2 - 150} 
        y={10}
        fontStyle="bold"
                />
            )}
            
            {/* Información de depuración */}
            <Text 
                text={debugInfo} 
                fontSize={12} 
                fill="blue" 
                x={10} 
                y={CANVAS_HEIGHT - 30} 
            />
        </Layer>
    </Stage>
              {/* Menú Contextual Flotante */}
{contextMenu && (
    <div
        style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            boxShadow: '2px 2px 10px rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            zIndex: 1000,
            padding: '5px 0',
            minWidth: '150px',
            fontFamily: 'Arial, sans-serif'
        }}
    >
        <ContextMenuButton
            iconClass="fa-solid fa-mouse-pointer"
            name="Selección"
            onClick={() => {
                setDrawingMode('select'); // Nuevo modo
                setContextMenu(null);
            }}
            isActive={drawingMode === 'select'}
        />
        <ContextMenuButton
            iconClass="fa-solid fa-hand-paper"
            name="Mover dibujo (Pan)"
            onClick={() => {
                setDrawingMode('pan');
                setContextMenu(null);
            }}
            isActive={drawingMode === 'pan'}
        />
    </div>
)}
  </>  
);
}

export default DxfCanvas;
