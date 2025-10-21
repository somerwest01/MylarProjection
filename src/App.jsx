import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MenuPanel from './components/MenuPanel';
import DxfCanvas from './components/DxfCanvas'; 
import { parseDxfFile, extractDxfEntities } from './utils/dxf-importer'; 
import './App.css'; 

function App() {
 const [activeMenu, setActiveMenu] = useState('design');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [dxfData, setDxfData] = useState(null);
  const [dxfEntities, setDxfEntities] = useState([]);
  const [blockDefinitions, setBlockDefinitions] = useState({});
  const [loading, setLoading] = useState(false);
  const [drawingMode, setDrawingMode] = useState('pan');
  const [importError, setImportError] = useState(false);
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false); 
  const [isOrthoActive, setIsOrthoActive] = useState(false);
  const [isSnapActive, setIsSnapActive] = useState(false);
  const [lineColor, setLineColor] = useState('#000000');

  const handleNewDrawing = () => {
    setDxfEntities([]);
    setBlockDefinitions({});
    setDrawingMode('pan'); 
    setImportError(false);
    setIsCanvasInitialized(true); 

    console.log('Nuevo dibujo iniciado.');
  };
  const toggleOrtho = () => {
  setIsOrthoActive(prev => !prev);
  console.log('Modo ORTHO toggled.');
};

const toggleSnap = () => {
  setIsSnapActive(prev => !prev);
  console.log('Modo SNAP toggled.');
};
useEffect(() => {
    const handleGlobalKeyDown = (e) => {
        // Solo debe funcionar si la herramienta 'line' está activa
        if (drawingMode !== 'line') return; 

        // ORTHO - F8
        if (e.key === 'F8') {
            e.preventDefault();
            toggleOrtho();
        }
        
        // SNAP - F3
        if (e.key === 'F3') {
            e.preventDefault();
            toggleSnap();
        }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown);
    };
}, [drawingMode, toggleOrtho, toggleSnap]);
 
  const handleDxfFileSelect = (file) => {
    setLoading(true);
    setImportError(false); // Limpiamos errores antes de intentar cargar
    setIsCanvasInitialized(true); 
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      
      try {
        const drawing = parseDxfFile(fileContent);
        const { entities: extractedEntities, blocks: extractedBlocks } = extractDxfEntities(drawing);

        setDxfEntities(extractedEntities);
        setBlockDefinitions(extractedBlocks);
        setDrawingMode('pan');
        
    
        if (extractedEntities.length === 0) {
            setImportError(true);
        }

        console.log(`Dibujo analizado con ${extractedEntities.length} entidades.`);

      } catch (error) {
        console.error("Error al procesar el archivo:", error.message);
        console.error(error.message); 
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Lógica de Renderizado Simplificada
  let canvasContent;
  
  if (!isCanvasInitialized) {
    canvasContent = (
      <p style={{ textAlign: 'center' }}>
        ¡Bienvenido!<br/>
        Selecciona **"➕ Nuevo Dibujo"** o **"Importar DXF"** para comenzar a diseñar.
      </p>
    );
  } else if (loading) {
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
         isOrthoActive={isOrthoActive}
         isSnapActive={isSnapActive}
         lineColor={lineColor}
        /> 
      </>
    );
  }


  return (
    <div 
      className="main-layout"
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
        lineColor={lineColor}
        setLineColor={setLineColor}
      />
      
      {/* 🔑 NUEVO CONTENEDOR PRINCIPAL: Apila Canvas (se expande) y Barra de Estado (fija) */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

        {/* 3. Área de Trabajo Principal (Canvas / Diseño) */}
        {/* CRÍTICO: flexGrow: 1 hace que este div tome todo el espacio vertical sobrante. */}
        <div className="work-area" style={{ flexGrow: 1 }}> 
          <div className="canvas-container">
            {canvasContent} 
          </div>
        </div>

        {/* 🔑 4. BARRA DE FUNCIONES INFERIOR (Status Bar de Autocad) */}
        <div style={{ 
          height: '30px', 
          backgroundColor: '#333', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 10px',
          color: 'white',
          fontSize: '12px',
          flexShrink: 0 // Este estilo ya estaba bien, asegura que no se encoja.
        }}>
          <span style={{ marginRight: '20px' }}>
            Estado: {drawingMode === 'line' ? 'Dibujando Línea' : 'Pan'}
          </span>
          
          {/* BOTÓN ORTHO (F8) */}
          <button
            onClick={toggleOrtho}
            style={{
              backgroundColor: isOrthoActive ? '#4CAF50' : '#555', // Verde/Gris
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              marginRight: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '3px'
            }}
          >
            ORTHO (F8)
          </button>

          {/* BOTÓN SNAP (F3) */}
          <button
            onClick={toggleSnap}
            style={{
              backgroundColor: isSnapActive ? '#4CAF50' : '#555',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              marginRight: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '3px'
            }}
          >
            SNAP (F3)
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

