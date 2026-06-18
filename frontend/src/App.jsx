import { useState, useEffect } from 'react';
import { fetchRendimientos } from './services/api';
import PriceChart from './components/PriceChart';
import PerformanceChart from './components/PerformanceChart';
import SummaryTable from './components/SummaryTable';
import ImpactCard from './components/ImpactCard';

const availableSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
const availableRanges = [
    { value: '1m', label: '1 mes' },
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '1y', label: '1 año' }
];

function App() {
    const [symbol, setSymbol] = useState('AAPL');
    const [range, setRange] = useState('1m');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchRendimientos(symbol, range);
            if (result.status === 'ok') {
                setData(result.data);
                setLastUpdate(new Date().toLocaleString());
            } else {
                setError('Error al cargar los datos');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [symbol, range]);

    return (
        <div className="min-h-screen bg-gray-100">

            {/* Navbar */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">DataMarkViz</h1>
                        <p className="text-sm text-gray-500">Dashboard del Mercado Mexicano</p>
                    </div>
                    {/* Ícono de usuario, aquí irá el menú de sesión*/}
                    <button className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

                {/* Título del activo */}
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                    {symbol} — {availableRanges.find(r => r.value === range)?.label}
                </h2>

                {/* Controles */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rango de fechas</label>
                        <div className="flex gap-2">
                            {availableRanges.map(r => (
                                <button
                                    key={r.value}
                                    onClick={() => setRange(r.value)}
                                    className={`px-3 py-1.5 text-sm rounded-md border transition ${
                                        range === r.value
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activo</label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {availableSymbols.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Botón agregar favorito — funcional en Sprint 3 */}
                    <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        Agregar a favoritos
                    </button>
                </div>

                {/* Layout principal - 2 columnas */}
                {/*carga*/}
                {loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Columna izquierda — skeleton de la gráfica precios*/}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <div className="animate-pulse flex flex-col gap-3">
                                    <div className="h-5 bg-gray-200 rounded w-48 mx-auto" />
                                    <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
                                    <div className="bg-gray-200 rounded w-full" style={{ height: '360px' }} />
                                </div>
                            </div>
                        </div>
                    
                        
                        {/* Columna izquierda — skeleton de la gráfica rendimientos*/}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <div className="animate-pulse flex flex-col gap-3">
                                    <div className="h-5 bg-gray-200 rounded w-48 mx-auto" />
                                    <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
                                    <div className="bg-gray-200 rounded w-full" style={{ height: '360px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                
                {!loading && !error && data && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Columna izquierda — gráficas */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <PriceChart data={data} symbol={symbol} />
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <PerformanceChart data={data} symbol={symbol}/>
                            </div>
                        </div>

                        {/* Columna derecha — tarjeta + tabla*/}
                        <div className="flex flex-col gap-6">
                            
                        </div>

                    </div>
                )}


            </main>

            <footer className="text-center py-6 text-xs text-gray-400">
                Datos proporcionados por Twelve Data y Banxico
            </footer>
        </div>
    );
}

export default App;
