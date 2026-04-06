import PriceChart from './components/PriceChart';
import { useState, useEffect } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('Cargando...');

  useEffect(() => {
    // Llamar al backend para verificar conexión
    fetch('http://127.0.0.1:8000/api/health')
      .then(response => response.json())
      .then(data => setBackendStatus(data.message))
      .catch(error => setBackendStatus('Error: ' + error.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          DataMarkViz - Dashboard del Mercado Mexicano
        </h1>
        
        {/* Indicador de conexión con el backend */}
        <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
          <p className="text-gray-700">
            Backend: <span className="font-semibold">{backendStatus}</span>
          </p>
        </div>
        
        {/* Gráfica */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <PriceChart />
        </div>
      </div>
    </div>
  );
}

export default App;