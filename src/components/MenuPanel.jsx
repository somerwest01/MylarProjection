import React, { useRef } from 'react';

// MenuPanel es el panel que se despliega (la "caja" de herramientas)
function MenuPanel({ isOpen, activeMenu, onDxfFileSelect }) {
  const panelClass = isOpen ? 'open' : '';
  const fileInputRef = useRef(null);

    // 1. Manejador de la selección de archivo
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Pasa el archivo al manejador de App.jsx para su análisis
      onDxfFileSelect(file); 
      // Opcional: limpiar el input para poder cargar el mismo archivo dos veces
      event.target.value = null; 
    }
  };
  
  // Determina el contenido basado en el menú activo
  let content = null;
  let title = '';

  if (activeMenu === 'design') {
    title = 'Diseño';
    content = (
      <div>
        <p>Aquí irán las plantillas de Diseño.</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".dxf" 
          onChange={handleFileChange} 
          style={{ display: 'none' }} // Ocultamos el input feo
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <i className="fa-solid fa-file-import" style={{ marginRight: '5px' }}></i>
          Importar DXF
        </button>
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

