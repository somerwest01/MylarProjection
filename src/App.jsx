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
  const [dxfEntities, setDxfEntities] = useState(null);
  const [blockDefinitions, setBlockDefinitions] = useState({});
  const [loading, setLoading] = useState(false);
  const [drawingMode, setDrawingMode] = useState('pan');

  const handleNewDrawing = () => {
  setDxfEntities([]);
  setBlockDefinitions({});
  setDrawingMode('pan'); 
    
  console.log('Nuevo dibujo iniciado.');
};

  const handleDxfFileSelect = (file) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      
      try {
      const drawing = parseDxfFile(fileContent);
      const { entities: extractedEntities, blocks: extractedBlocks } = extractDxfEntities(drawing);

      setDxfEntities(extractedEntities);
      setBlockDefinitions(extractedBlocks);
      console.log(`Dibujo analizado con ${extractedEntities.length} entidades.`);

      } catch (error) {
        console.error("Error al procesar el archivo:", error.message);
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div 
      className="main-layout"

      onMouseLeave={() => {

      }}

      onMouseEnter={() => {

      }}
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
          {loading ? (
            <p>Cargando y analizando dibujo...</p>
          ) : dxfEntities && dxfEntities.length > 0 ? (
            <>
              {/* Muestra cuántas entidades se encontraron */}
              <p style={{ position: 'absolute', top: 10, left: 10, color: '#333', zIndex: 1, backgroundColor: 'white', padding: '5px' }}>
                  Entidades encontradas: {dxfEntities.length}
              </p>
              
              {/* ⬅️ Pasamos las entidades al componente de dibujo */}
              <DxfCanvas 
                entities={dxfEntities}
                setEntities={setDxfEntities}
                blocks={blockDefinitions}
                drawingMode={drawingMode}
                setDrawingMode={setDrawingMode}
                /> 
            </>
          ) : (
            <p>
              Lienzo de Diseño (Importa un DXF para empezar) 
              {dxfEntities && dxfEntities.length === 0 && (
                <span style={{ color: 'red' }}><br/>¡Advertencia! No se encontraron entidades válidas (LINE, CIRCLE) en el archivo.</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;








