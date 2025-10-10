import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MenuPanel from './components/MenuPanel';
import './App.css'; // Importa tus estilos

function App() {
  // Estado para controlar qué menú está activo (null, 'design', o 'elements')
  const [activeMenu, setActiveMenu] = useState('design'); // Inicia con Diseño abierto por defecto
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Controla si el panel debe estar visible

  // Función para manejar cuando el mouse sale de la zona del menú
  // NOTA: Esto es complicado de hacer con precisión sin librerías, 
  // por ahora, simplemente cambiamos el menú con el hover del botón.
  // Podríamos usar un temporizador si el usuario sale del panel completo.

  return (
    // Creamos un área de escucha para detectar cuando el cursor sale
    <div 
      className="main-layout"
      // Si el mouse sale de toda el área de control, cierra el panel
      onMouseLeave={() => {
        // Opción: Cerrar el menú si el cursor abandona la Sidebar y el MenuPanel
        // setIsMenuOpen(false); 
      }}
      // Si el mouse vuelve, podemos abrirlo con el menú activo
      onMouseEnter={() => {
        // Opción: Abrir el menú si vuelve el cursor
        // setIsMenuOpen(true); 
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
      <div 
        style={{ flexGrow: 1, padding: '20px', backgroundColor: '#fff', borderLeft: '1px solid #ddd' }}
      >
        <h1>Área de Diseño y Canvas</h1>
        <p>Aquí irá el canvas de tu aplicación.</p>
      </div>
    </div>
  );
}

export default App;
