import { useState } from "react";
import { loginUsuario } from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login ({ onSwitchToRegister, onSuccess}) {
    const { login } = useAuth();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try{
            const data = await loginUsuario(correo, contrasena);
            login(data.nombre, data.token);
            onSuccess?.();
        } catch(err){
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
         <div className="bg-white rounded-xl shadow-sm p-8 w-full">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">DataMarkViz</h1>
                <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-4 py-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="tu@correo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value.replace(/\s/g, ''))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </div>

                <p className="text-sm text-gray-500 text-center mt-6">
                    ¿No tienes cuenta?{' '}
                    <button onClick={onSwitchToRegister} className="text-blue-600 hover:underline">
                        Regístrate
                    </button>
                </p>
        </div>
    );
}

export default Login;