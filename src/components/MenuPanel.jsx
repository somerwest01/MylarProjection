import React from 'react';

// MenuPanel es el panel que se despliega (la "caja" de herramientas)
function MenuPanel({ isOpen, activeMenu }) {
  const panelClass = isOpen ? 'open' : '';

  // Determina el contenido basado en el menú activo
  let content = null;
  let title = '';

  if (activeMenu === 'design') {
    title = 'Diseño';
    content = (
      <div>
        <p>Aquí irán las plantillas de Diseño.</p>
        <button>Plantilla A</button>
      </div>
    );
  } else if (activeMenu === 'elements') {
    title = 'Elementos';
    content = (
      <div>
        <p>Aquí irán las formas y elementos gráficos.</p>
        <button>Círculo</button>
        <button>Cuadrado</button>
      </div>
    );
  }

  return (
    <div className={`menu-panel-container ${panelClass}`}>
      <div className="menu-content">
        <h2>{title}</h2>
        {content}
      </div>
    </div>
  );
}

export default MenuPanel;
