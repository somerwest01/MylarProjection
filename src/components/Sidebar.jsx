import React from 'react';
import SidebarButton from './SidebarButton';

// Sidebar es el panel delgado de la izquierda
function Sidebar({ activeMenu, setActiveMenu }) {

  const handleMouseEnter = (menuId) => {
    setActiveMenu(menuId);
  };

  // Datos de los botones: Clase de ícono de Font Awesome y nombre.
  const buttons = [
    { 
      id: 'design', 
      name: 'Diseño', 
      iconClass: 'fa-solid fa-paintbrush' // Ícono de pincel/diseño
    },
    { 
      id: 'elements', 
      name: 'Elementos', 
      iconClass: 'fa-solid fa-shapes' // Ícono de formas
    },
    /* ➡️ Agregar más botones aquí (Texto, Subir, etc.) */
  ];

  return (
    <div className="sidebar-container">
      {buttons.map((button) => (
        <SidebarButton
          key={button.id}
          iconClass={button.iconClass}
          name={button.name}
          isActive={activeMenu === button.id}
          // Al pasar el cursor, activa el menú correspondiente
          onMouseEnter={() => handleMouseEnter(button.id)}
          // Al hacer clic, también lo activa por si el cursor se queda fuera
          onClick={() => handleMouseEnter(button.id)}
        />
      ))}
    </div>
  );
}

export default Sidebar;