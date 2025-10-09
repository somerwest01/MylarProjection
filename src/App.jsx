import React, { useState } from 'react';
import './index.css'; 

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-container">
      <h1>¡Hola, esta es mi nueva aplicación!</h1>
      <p>Empieza a construir tus funcionalidades aquí.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Contador: {count}
      </button>

      {/* ➡️ Sugerencia: Importa tus componentes aquí.
        <MiComponenteDeNavegacion />
        <MiComponenteDeCalculo /> 
      */}
    </div>
  );
}

export default App;
