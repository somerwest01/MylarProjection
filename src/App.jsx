import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MenuPanel from './components/MenuPanel';
import DxfCanvas from './components/DxfCanvas'; 
import { parseDxfFile, extractDxfEntities } from './utils/dxf-importer'; 
import './App.css'; 

function App() {
  const [activeMenu, setActiveMenu] = useState('design'); 
  const [isMenuOpen, setIsMenuOpen] = useState(true); 
  const [dxfData, setDxfData] = useState(null); 
  // 🔑 CAMBIO CLAVE: Inicializamos con un array vacío para que el Canvas se monte inmediatamente.
  const [dxfEntities, setDxfEntities] = useState([]); 
  const [blockDefinitions, setBlockDefinitions] = useState({});
  const [loading, setLoading] = useState(false);
  const [drawingMode, setDrawingMode] = useState('pan');
  // Eliminamos isCleanCanvas, ya no es estrictamente necesario con la nueva lógica.
  // const [isCleanCanvas, setIsCleanCanvas] = useState(true); 

  // Estado para manejar el mensaje de error de importación (Advertencia)
  const [importError, setImportError] = useState(false); 

  const handleNewDrawing = () => {
    // Restablece el lienzo a un estado vacío y el modo de dibujo a 'pan'.
    setDxfEntities([]);
    setBlockDefinitions({});
    setDrawingMode('pan'); 
    setImportError(false); // Limpiamos cualquier error previo
    
    console.log('Nuevo dibujo iniciado.');
  };

  const handleDxfFileSelect = (file) => {
    setLoading(true);
    setImportError(false); // Limpiamos errores antes de intentar cargar
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      
      try {
        const drawing = parseDxfFile(fileContent);
        const { entities: extractedEntities, blocks: extractedBlocks } = extractDxfEntities(drawing);

        setDxfEntities(extractedEntities);
        setBlockDefinitions(extractedBlocks);
        setDrawingMode('pan'); // Vuelve a pan después de cargar
        
        // Si no hay entidades válidas, establecemos el error
        if (extractedEntities.length === 0) {
            setImportError(true);
        }

        console.log(`Dibujo analizado con ${extractedEntities.length} entidades.`);

      } catch (error) {
        console.error("Error al procesar el archivo:", error.message);
        // Aquí puedes usar un estado para mostrar el error al usuario si no quieres usar alert()
        console.error(error.message); 
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Lógica de Renderizado Simplificada
  let canvasContent;
  
  if (loading) {
    canvasContent = <p>Cargando y analizando dibujo...</p>;
  } else if (importError && dxfEntities.length === 0) {
    // Caso: Error de importación (Archivo vacío)
    canvasContent = (
      <p style={{ textAlign: 'center' }}>
        Lienzo de Diseño.
        <span style={{ color: 'red' }}><br/>¡Advertencia! El DXF no contenía entidades válidas.</span>
      </p>
    );
  } else {
    // Caso: Canvas Listo (vacío por defecto, nuevo, o con DXF cargado)
    canvasContent = (
      <>
        {/* Muestra cuántas entidades se encontraron (si hay) */}
        {dxfEntities.length > 0 && (
            <p style={{ position: 'absolute', top: 10, left: 10, color: '#333', zIndex: 1, backgroundColor: 'white', padding: '5px' }}>
                Entidades: {dxfEntities.length}
            </p>
        )}
        
        {/* 🔑 DxfCanvas SE MONTA SIEMPRE, listo para recibir clics */}
        <DxfCanvas 
          entities={dxfEntities} 
          setEntities={setDxfEntities} 
          blocks={blockDefinitions}
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
        /> 
      </>
    );
  }


  return (
    <div 
      className="main-layout"
      // Eliminamos onMouseLeave y onMouseEnter vacíos
    >      
      {/* 1. Panel Lateral Delgado (Sidebar) */}
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
      />

      {/* 2. Panel Desplegable de Herramientas (MenuPanel) */}
      <MenuPanel 
        isOpen={isMenuOpen} 
        activeMenu={activeMenu} 
        onDxfFileSelect={handleDxfFileSelect}
        onNewDrawing={handleNewDrawing} 
        setDrawingMode={setDrawingMode}
        currentDrawingMode={drawingMode}
      />

      {/* 3. Área de Trabajo Principal (Canvas / Diseño) */}
      <div className="work-area">
        <div className="canvas-container">
          {canvasContent} 
        </div>
      </div>
    </div>
  );
}

export default App;
