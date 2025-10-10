import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MenuPanel from './components/MenuPanel';
import './App.css'; // Importa tus estilos

function App() {
  const [activeMenu, setActiveMenu] = useState('design'); 
  const [isMenuOpen, setIsMenuOpen] = useState(true); 
  // 🆕 Estado para guardar los datos del dibujo DXF
  const [dxfData, setDxfData] = useState(null); 
  const [loading, setLoading] = useState(false);

  // 🆕 Función que maneja el archivo DXF
  const handleDxfFileSelect = (file) => {
    setLoading(true);
    // Usamos FileReader para leer el contenido del archivo
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      
      // ⚠️ ADVERTENCIA: Aquí es donde se usaría la librería DXF.
      // Como no la hemos instalado ni configurado, solo simularemos el proceso.
      
      try {
        // ➡️ PASO REAL (REQUIERE LIBRERÍA INSTALADA)
        // const parser = new DxfParser();
        // const drawing = parser.parseSync(fileContent);
        // setDxfData(drawing);

        // ➡️ PASO SIMULADO POR AHORA:
        console.log(`Archivo ${file.name} cargado. Listo para ser analizado.`);
        setDxfData({ message: `DXF cargado: ${file.name}. Listo para dibujar.` });

      } catch (error) {
        console.error("Error al analizar el archivo DXF:", error);
        alert("Hubo un error al procesar el archivo DXF.");
      } finally {
        setLoading(false);
      }
    };
    
    // Lee el archivo como texto plano
    reader.readAsText(file);
  };

  return (
    // Creamos un área de escucha para detectar cuando el cursor sale
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
        isOpen={isMenuOpen} // Siempre abierto en este ejemplo simple
        activeMenu={activeMenu} 
        onDxfFileSelect={handleDxfFileSelect} // ⬅️ NUEVA PROP
      />

      {/* 3. Área de Trabajo Principal (Canvas / Diseño) */}
      <div className="work-area">
        <div className="canvas-container">
          {loading ? (
            <p>Cargando y analizando dibujo...</p>
          ) : dxfData ? (
            <div>
              <p style={{ color: 'green' }}>{dxfData.message}</p>
              {/* Aquí se integraría el componente <Stage> de Konva para renderizar el dibujo */}
              <p>El dibujo DXF se mostrará aquí.</p>
            </div>
          ) : (
            <p>Lienzo de Diseño (Importa un DXF para empezar)</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;


