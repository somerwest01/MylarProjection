import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MenuPanel from './components/MenuPanel';
import './App.css'; // Importa tus estilos

function App() {
  const [activeMenu, setActiveMenu] = useState('design'); 
  const [isMenuOpen, setIsMenuOpen] = useState(true); 



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
      />

      {/* 3. Área de Trabajo Principal (Canvas / Diseño) */}
      <div className="work-area">
        <div className="canvas-container">
          {/* Aquí va el <Stage> de Konva, o el contenido real de tu diseño.
            Por ahora, es un mensaje de placeholder.
          */}
          Lienzo de Diseño (1000px x 600px)
        </div>
      </div>
    </div>
  );
}

export default App;

