import React, { useRef, useState } from 'react';

// Componente helper para los botones de ruteo (Dona/Círculo)
const RoutingButton = ({ name, outerColor, innerColor, mode, currentDrawingMode, setDrawingMode }) => {
    const isActive = currentDrawingMode === mode;

    // Estilo base para el botón
    const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 10px',
        backgroundColor: 'white', 
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        // Sombra azul cuando activo para destacarlo
        boxShadow: isActive ? '0 0 10px rgba(0, 191, 255, 0.7)' : 'none', 
        transform: isActive ? 'scale(1.02)' : 'scale(1)', 
        transition: 'all 0.2s ease-in-out',
        outline: 'none',
        width: '100%',
        marginBottom: '10px',
    };

    // Lógica para el hover y el sombreado visual
    const handleMouseEnter = (e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 191, 255, 0.5)';
    };

    const handleMouseLeave = (e) => {
        if (!isActive) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
        }
    };

    return (
        <button 
            onClick={() => setDrawingMode(isActive ? 'pan' : mode)}
            style={buttonStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Círculo exterior (Dona) */}
            <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: outerColor,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: '10px',
                flexShrink: 0,
            }}>
                {/* Círculo interior */}
                <div style={{
                    // Si innerColor es null/undefined, width y height son 30px, haciendo un círculo sólido
                    width: innerColor && innerColor !== outerColor ? '15px' : '30px', 
                    height: innerColor && innerColor !== outerColor ? '15px' : '30px',
                    borderRadius: '50%',
                    backgroundColor: innerColor || outerColor, // Usa outerColor si innerColor es null (sólido)
                }}></div>
            </div>
            <span style={{ 
                fontWeight: 'bold', 
                color: '#333', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>{name}</span>
        </button>
    );
};


// MenuPanel es el panel que se despliega (la "caja" de herramientas)
function MenuPanel({ isOpen, activeMenu, onDxfFileSelect, onSelectNewProject, setDrawingMode, currentDrawingMode, projectType }) { 
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
            backgroundColor: '#059669', 
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%', 
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
        {/* 🔑 NUEVA SECCIÓN: RUTEO */}
        <h4>Ruteos</h4>
        
        {/* Botón Alambre Suelto (Azul/Amarillo) */}
        <RoutingButton
            name="Alambre suelto"
            outerColor="blue"
            innerColor="yellow"
            mode="looseWire"
            currentDrawingMode={currentDrawingMode}
            setDrawingMode={setDrawingMode}
        />

        {/* 🔑 NUEVO BOTÓN: Ruteo Sólido (Verde Sólido) */}
        <RoutingButton
            name="Ruteo Sólido" 
            outerColor="green" // Círculo exterior verde
            innerColor="green" // Círculo interior verde para un efecto sólido
            mode="solidRouting" // Nuevo modo de dibujo
            currentDrawingMode={currentDrawingMode}
            setDrawingMode={setDrawingMode}
        />
        
        <hr style={{ margin: '15px 0' }} />
        <p>Otros elementos (Pendientes de definir).</p>
        <button disabled>Seleccionar Todo</button>
      </div>
    );
  } else {
    title = 'Menú Desconocido';
    content = <p>Selecciona una opción del panel lateral.</p>;
  }

  return (
    <> 
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
                top: '50px', 
                left: '310px', 
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '10px', 
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', 
                zIndex: 1000,
                padding: '15px',
                minWidth: '220px',
                fontFamily: 'Arial, sans-serif'
              }}
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
