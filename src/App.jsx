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
  const [drawingMode, setDrawingMode] = useState('select');
  const [importError, setImportError] = useState(false);
  // Estado inicializado en false para cumplir con el requisito de lienzo en blanco
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false); 
  const [isOrthoActive, setIsOrthoActive] = useState(false);
  const [isSnapActive, setIsSnapActive] = useState(false);
  const [lineColor, setLineColor] = useState('#000000');
  const [lineThicknessMm, setLineThicknessMm] = useState(0.5);
  // 🔑 NUEVO ESTADO: Controla el tipo de proyecto seleccionado ('dibujo' o 'enmallado')
  const [projectType, setProjectType] = useState(null); 

  // 🔑 FUNCIÓN RENOMBRADA: Inicia el proyecto según el tipo seleccionado
  const startNewProject = (type) => { // Recibe 'dibujo' o 'enmallado'
    setDxfEntities([]);
    setBlockDefinitions({});
    // El modo de dibujo inicial puede variar
    setDrawingMode(type === 'dibujo' ? 'select' : 'pan'); 
    setImportError(false);
    setIsCanvasInitialized(true); 
    setProjectType(type); // 🔑 Establece el tipo de proyecto

    console.log(`Nuevo proyecto: ${type} iniciado.`);
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
    setImportError(false);
    setIsCanvasInitialized(true); 
    setProjectType('dibujo'); // Asume que importar DXF es para un 'dibujo'
    
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
    // 🔑 Renderizado inicial: Lienzo vacío con mensaje
    canvasContent = (
      <p style={{ textAlign: 'center' }}>
        ¡Bienvenido!<br/>
        <span style={{ color: '#00bcd4' }}>Seleccione "Nuevo" en el menú de Diseño.</span>
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
    // Caso: Canvas Listo (isCanvasInitialized es true)

    // 🔑 FIX: Estructura de renderizado explícita por tipo de proyecto
    if (projectType === 'dibujo') {
        canvasContent = (
            <>
                {/* Muestra cuántas entidades se encontraron (si hay) */}
                {dxfEntities.length > 0 && (
                    <p style={{ position: 'absolute', top: 10, left: 10, color: '#333', zIndex: 1, backgroundColor: 'white', padding: '5px' }}>
                        Entidades: {dxfEntities.length}
                    </p>
                )}
                
                {/* Renderiza DxfCanvas para proyectos de 'dibujo' */}
                <DxfCanvas 
                    entities={dxfEntities} 
                    setEntities={setDxfEntities} 
                    blocks={blockDefinitions}
                    drawingMode={drawingMode}
                    setDrawingMode={setDrawingMode}
                    isOrthoActive={isOrthoActive}
                    isSnapActive={isSnapActive}
                    lineColor={lineColor}
                    lineThicknessMm={lineThicknessMm}
                /> 
            </>
        );
    } else if (projectType === 'enmallado') {
        // Renderiza contenido de Enmallado (Placeholder)
         canvasContent = (
             <div style={{ padding: '50px', textAlign: 'center' }}>
                 <h2>Modo Enmallado Activo</h2>
                 <p>Aquí se renderizaría la herramienta de enmallado.</p>
             </div>
        );
    } else {
        // Fallback si projectType es null pero isCanvasInitialized es true (no debería pasar)
        canvasContent = <p>Proyecto iniciado. Seleccione una herramienta.</p>;
    }
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
        onSelectNewProject={startNewProject} // 🔑 NOMBRE DE PROP CORREGIDO
        setDrawingMode={setDrawingMode}
        currentDrawingMode={drawingMode}
        projectType={projectType} // 🔑 PROP para estado
      />
      
      {/* 🔑 NUEVO CONTENEDOR PRINCIPAL: Apila Canvas (se expande) y Barra de Estado (fija) */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
          flexShrink: 0
        }}>
       {/* Estado del proyecto */}
        <span style={{ marginRight: '20px', fontWeight: 'bold' }}>
           Proyecto: {projectType === 'dibujo' ? 'Dibujo CAD' : (projectType === 'enmallado' ? 'Enmallado' : 'Ninguno')}
        </span>
       {/* ... resto de la barra de estado ... */}
          <span style={{ marginRight: '10px' }}>Color:</span>
          {/* 🔑 SELECTOR DE COLOR EN BARRA DE ESTADO */}
          <input
            type="color"
            value={lineColor}
            onChange={(e) => setLineColor(e.target.value)}
            style={{
              width: '24px', 
              height: '24px',
              padding: '0', 
              border: '1px solid white', 
              borderRadius: '4px',
              marginRight: '20px', // Espacio después del selector
              cursor: 'pointer',
              boxSizing: 'content-box',
              // Aseguramos que el fondo del input color sea transparente
              backgroundColor: 'transparent',
            }}
          />
          <span style={{ marginRight: '20px' }}>
            Estado: {drawingMode === 'line' ? 'Dibujando Línea' : (drawingMode === 'select' ? 'Selección' : 'Pan')}
          </span>
         <span style={{ marginRight: '10px' }}>Grosor (mm):</span>
<input
  type="number"
  value={lineThicknessMm}
  onChange={(e) => setLineThicknessMm(parseFloat(e.target.value) || 0.1)}
  min="0.1"
  step="0.1"
  style={{
    width: '60px', 
    padding: '2px 5px',
    marginRight: '20px',
    borderRadius: '3px',
    border: '1px solid #ccc',
    color: '#333'
  }}
/>
          
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
