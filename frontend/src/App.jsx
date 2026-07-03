import { useState, useEffect } from 'react';
import { fetchRendimientos } from './services/api';
import PriceChart from './components/PriceChart';
import PerformanceChart from './components/PerformanceChart';
import SummaryTable from './components/SummaryTable';
import ImpactCard from './components/ImpactCard';
import Login from './components/Login';
import Register from './components/Register';
import { useAuth } from './context/AuthContext';
import { fetchFavoritos, agregarFavorito, eliminarFavorito } from './services/api';

const availableSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
const availableRanges = [
    { value: '1m', label: '1 mes' },
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '1y', label: '1 año' }
];

function App() {
    const {usuario, logout, token} = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [symbol, setSymbol] = useState('AAPL');
    const [range, setRange] = useState('1m');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [favoritos, setFavoritos] = useState([]);
    const [showFavoritos, setShowFavoritos] = useState(false);
    const [errorFavorito, setErrorFavorito] =useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log(` Solicitando: ${symbol} - ${range}`);
        const result = await fetchRendimientos(symbol, range);
        console.log(' Resultado completo:', result);
        console.log(' data:', result.data);
        console.log(' longitud:', result.data?.length);
            
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
        setData(null);
        loadData();
    }, [symbol, range]);

    useEffect(() => {
        if (usuario && token) {
            fetchFavoritos(token).then(data => setFavoritos(data.data));
        } else {
            setFavoritos([]);
        }
    }, [usuario]);

    const handleFavoritoClick = async () => {
        if(!usuario){
            setShowRegister(false);
            setShowAuthModal(true);
            return;
        }
        setErrorFavorito(null);
        try {
            const esFavorito = favoritos.includes(symbol);
            if (esFavorito) {
                await eliminarFavorito(symbol, token);
                setFavoritos(favoritos.filter(f => f !== symbol));
            } else {
                await agregarFavorito(symbol, token);
                setFavoritos([...favoritos, symbol]);
            }
        } catch (err) {
            if(err.message === 'Token inválido'){
                logout();
                setShowAuthModal(true);
            } else {
                setErrorFavorito('No se pudo actualizar favoritos, intente de nuevo');
            }
            console.error(err);
        }
    }

    const handleUserIconClick = () => {
        if(usuario) return;
        setShowRegister(false);
        setShowAuthModal(true);
    }


    return (
        <div className="min-h-screen bg-gray-100">

            {/* Navbar */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">DataMarkViz</h1>
                        <p className="text-sm text-gray-500">Dashboard del Mercado Mexicano</p>
                    </div>
                    
                    {usuario ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Hola, <strong>{usuario}</strong></span>
                            <button onClick={() => setShowFavoritos(!showFavoritos)}
                                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-yellow-500 hover:bg-yellow-50 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                </svg>
                            </button>

                            <button
                                onClick={logout}
                                className="text-sm text-gray-500 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleUserIconClick}
                            className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                        </button>
                    )}
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

                    {/* Botón agregar favorito*/}
                    <button
                        onClick={handleFavoritoClick}
                        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md transition ${
                            favoritos.includes(symbol)
                                ? 'bg-yellow-50 border-yellow-400 text-yellow-600'
                                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"
                            fill={favoritos.includes(symbol) ? 'currentColor' : 'none'}
                            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {favoritos.includes(symbol) ? 'En favoritos' : 'Agregar a favoritos'}
                    </button>
                </div>

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span className="text-sm">{error}</span>
                        <button
                            onClick={loadData}
                            className="ml-auto text-sm text-red-500 underline hover:text-red-700"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

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

                
                {!loading && !error && data && data.length > 0 && (
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
                            <ImpactCard data={data} symbol={symbol}/>
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
                                    Tabla resumen
                                </h2>
                                <SummaryTable data={data} symbol={symbol}/>
                            </div>
                        </div>

                    </div>
                )}


            </main>

            <footer className="text-center py-6 text-xs text-gray-400">
                Datos proporcionados por Twelve Data y Banxico
            </footer>

            {/* Modal de autenticación */}
            {showAuthModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative w-full max-w-sm">
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition z-10"
                        >
                            ✕
                        </button>
                        {showRegister
                            ? <Register onSwitchLogin={() => setShowRegister(false)} onSuccess={() => setShowAuthModal(false)} />
                            : <Login onSwitchToRegister={() => setShowRegister(true)} onSuccess={() => setShowAuthModal(false)} />
                        }
                    </div>
                </div>
            )}

           {showFavoritos && usuario && (
                <div className="fixed top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 w-48 z-40 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">Mis favoritos</h3>
                        <button
                            onClick={() => setShowFavoritos(false)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                      {errorFavorito && (
                            <p className="text-xs text-red-500 mb-2">{errorFavorito}</p>
                        )}
                    {favoritos.length === 0 ? (
                        <p className="text-sm text-gray-400">No tienes favoritos aún.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {favoritos.map(fav => (
                                <li key={fav} className="flex items-center justify-between">
                                    <button
                                        onClick={() => { setSymbol(fav); setShowFavoritos(false); }}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        {fav}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await eliminarFavorito(fav, token);
                                                setFavoritos(favoritos.filter(f => f !== fav));
                                            } catch (err) {
                                                if (err.message === 'Token inválido') {
                                                    logout();
                                                    setShowAuthModal(true);
                                                } else {
                                                    setErrorFavorito('No se pudo eliminar el favorito, intenta de nuevo.');
                                                }
                                            }
                                        }}
                                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
