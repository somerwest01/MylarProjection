import React, { useRef } from 'react';

// MenuPanel es el panel que se despliega (la "caja" de herramientas)
function MenuPanel({ isOpen, activeMenu, onDxfFileSelect, onNewDrawing, setDrawingMode, currentDrawingMode, lineColor, setLineColor }) {
  const panelClass = isOpen ? 'open' : '';
  const fileInputRef = useRef(null);

    // 1. Manejador de la selección de archivo
 const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onDxfFileSelect(e.target.files[0]);
    }
  };
  
  let content = null;
  let title = '';

  if (activeMenu === 'design') {
    title = 'Diseño';
    content = (
      <div>
        {/* Sección de CREACIÓN */}
        <button
          onClick={onNewDrawing} // Llama a la función que limpia el lienzo
          style={{
            padding: '10px 15px',
            backgroundColor: '#059669', // Verde para "Nuevo"
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%', // Ancho completo
            marginBottom: '10px'
          }}
        >
          ➕ Nuevo Dibujo
        </button>

        <hr style={{ margin: '15px 0' }} />
        <h4>Herramientas de Dibujo (Modo: {currentDrawingMode})</h4>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
           {/* 🔑 SELECTOR DE COLOR */}
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Color Línea:
        </label>
        <input
          type="color"
          value={lineColor}
          onChange={(e) => setLineColor(e.target.value)}
          style={{ width: '40px', height: '30px', border: 'none', cursor: 'pointer' }}
        />
        <span style={{ marginLeft: '10px', color: lineColor, fontWeight: 'bold' }}>
        {lineColor}
    </span>
</div>

{/* BOTÓN LÍNEA */}
<button 
    onClick={() => setDrawingMode(currentDrawingMode === 'line' ? 'pan' : 'line')}
    // ... (restos de estilos del botón Línea)
>
    📏 Línea
</button>
        
        {/* Sección de IMPORTACIÓN (existente) */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".dxf" 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          <i className="fa-solid fa-file-import" style={{ marginRight: '5px' }}></i>
          Importar DXF
        </button>
      </div>
    );
  }else if (activeMenu === 'elements') {
    title = 'Elementos';
    content = (
      <div>
        <h4 style={{ marginBottom: '10px' }}>Herramientas de Dibujo (Modo: {currentDrawingMode})</h4>
        
        {/* BOTÓN LÍNEA */}
        <button 
          onClick={() => setDrawingMode(currentDrawingMode === 'line' ? 'pan' : 'line')}
          style={{ 
            padding: '8px', 
            marginRight: '10px',
            // Resaltamos si la herramienta 'line' está activa
            backgroundColor: currentDrawingMode === 'line' ? '#a5f3fc' : 'white', 
            border: currentDrawingMode === 'line' ? '2px solid #06b6d4' : '1px solid #ccc' 
          }}
        >
          📏 Línea
        </button>

        {/* BOTÓN PAN (Por si el usuario quiere volver a mover la vista) */}
        <button 
          onClick={() => setDrawingMode('pan')}
          style={{ 
            padding: '8px', 
            // Resaltamos si la herramienta 'pan' está activa
            backgroundColor: currentDrawingMode === 'pan' ? '#e5e7eb' : 'white',
            border: currentDrawingMode === 'pan' ? '2px solid #6b7280' : '1px solid #ccc' 
          }}
        >
          ✋ Mover Vista (Pan)
        </button>
        
        <hr style={{ margin: '15px 0' }} />

        {/* Otros botones... */}
        <button disabled>Círculo</button>
        <button disabled>Cuadrado</button>
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



