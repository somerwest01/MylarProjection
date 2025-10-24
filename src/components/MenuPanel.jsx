import React, { useRef, useState } from 'react';

// MenuPanel es el panel que se despliega (la "caja" de herramientas)
function MenuPanel({ isOpen, activeMenu, onDxfFileSelect, onNewDrawing, setDrawingMode, currentDrawingMode, projectType }) {
  const panelClass = isOpen ? 'open' : '';
  const fileInputRef = useRef(null);

  const [isNewProjectSelectionOpen, setIsNewProjectSelectionOpen] = useState(false);

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

    if (!projectType) {
    content = (
      <div>
        {/* Sección de CREACIÓN */}
        <button
          onClick={() => setIsNewProjectSelectionOpen(true)} 
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
          ➕ Nuevo
        </button>
  </div>
      );
} else if (projectType === 'dibujo') {
      // Lógica para "Nuevo Dibujo" (muestra herramientas de diseño CAD)
      content = (
        <div>
          {/* Botón para reiniciar el Dibujo CAD */}
          <button
            onClick={() => onSelectNewProject('dibujo')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            🔄 Reiniciar Dibujo CAD
          </button>

          <hr style={{ margin: '15px 0' }} />
{/* Sección de IMPORTACIÓN */}
        <h4>Importar</h4>
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
          📤 Importar DXF
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept=".dxf"
        />
{/* Sección de Herramientas de Edición */}
        <hr style={{ margin: '15px 0' }} />
        <h4>Herramientas de Dibujo</h4>
        
{/* BOTÓN LÍNEA */}
<button 
    onClick={() => setDrawingMode(currentDrawingMode === 'line' ? 'pan' : 'line')}
        style={{ 
            padding: '8px', 
            marginRight: '10px',
            backgroundColor: currentDrawingMode === 'line' ? '#a5f3fc' : 'white', 
            border: currentDrawingMode === 'line' ? '2px solid #06b6d4' : '1px solid #ccc' 
          }}
        >
    📏 Línea
</button>
          {/* BOTÓN SELECCIÓN */}
           <button 
              onClick={() => setDrawingMode(currentDrawingMode === 'select' ? 'pan' : 'select')}
                  style={{ 
                      padding: '8px', 
                      backgroundColor: currentDrawingMode === 'select' ? '#a5f3fc' : 'white', 
                      border: currentDrawingMode === 'select' ? '2px solid #06b6d4' : '1px solid #ccc' 
                    }}
                  >
              🖱️ Selección
          </button>
        
        <hr style={{ margin: '15px 0' }} />

        {/* Otros botones... */}
        <button disabled>Círculo</button>
        <button disabled>Cuadrado</button>
      </div>
    );
} else if (projectType === 'enmallado') {
content = (
        <div>
          <button
            onClick={() => onSelectNewProject('enmallado')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            🔄 Reiniciar Enmallado
          </button>
          <hr style={{ margin: '15px 0' }} />
          <h4>Herramientas de Enmallado</h4>
          <p>Herramientas de Enmallado (Pendientes de definir).</p>
        </div>
      );
    }      
  }else if (activeMenu === 'elements') {
    title = 'Elementos';
    content = (
      <div>
        <p>Esta sección mostrará los elementos existentes en el dibujo.</p>
        <button disabled>Seleccionar Todo</button>
      </div>
    );
  } else {
    title = 'Menú Desconocido';
    content = <p>Selecciona una opción del panel lateral.</p>;
  }

  return (
<div className={`menu-panel-container ${panelClass}`}>
      <div className="menu-content">
        <h2>{title}</h2>
        <div style={{ minHeight: '10px' }}></div>
        {content}
      </div>
    </div>
{/* 🔑 Sub-Menú de Selección de Proyecto Flotante */}
      {isNewProjectSelectionOpen && (
        <div
          style={{
            position: 'absolute',
            // Posicionamiento moderno a la derecha del panel
            top: '50px', 
            left: '310px', // 50px (Sidebar) + 250px (MenuPanel) + 10px de margen
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '10px', // Bordes redondos
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', // Sombreado
            zIndex: 1000,
            padding: '15px',
            minWidth: '220px',
            fontFamily: 'Arial, sans-serif'
          }}
          // Se cierra automáticamente al mover el ratón fuera
          onMouseLeave={() => setIsNewProjectSelectionOpen(false)} 
        >
          <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' }}>Seleccione Tipo de Proyecto</h4>
          
          {/* OPCIÓN 1: Nuevo Dibujo */}
          <button
            onClick={() => {
              onSelectNewProject('dibujo');
              setIsNewProjectSelectionOpen(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              marginBottom: '10px',
              backgroundColor: '#e3f2fd',
              color: '#1e88e5',
              border: '1px solid #1e88e5',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'left'
            }}
          >
            📐 Nuevo Dibujo (Proyección Física)
          </button>
          
          {/* OPCIÓN 2: Nuevo Enmallado */}
          <button
            onClick={() => {
              onSelectNewProject('enmallado');
              setIsNewProjectSelectionOpen(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              backgroundColor: '#ffe0b2',
              color: '#fb8c00',
              border: '1px solid #fb8c00',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'left'
            }}
          >
            🌐 Nuevo Enmallado (Ayuda Visual)
          </button>
          
        </div>
      )}
    </>
  );
}

export default MenuPanel;




