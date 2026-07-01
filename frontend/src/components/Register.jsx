import { isValidElement, useState } from "react";
import { registerUsuario } from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register ({ onSwitchToLogin, onSuccess}) {
    const { login } = useAuth();
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(contrasena.length < 8){
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        setLoading(true);
        setError(null);
        try{
            const data = await registerUsuario(nombre, correo, contrasena);
            login(data.nombre, data.token);
            onSuccess?.();
        }catch(err){
            setError(err.message);
        }finally{
            setLoading(false);
        }
    };

     return (
        <div className="bg-white rounded-xl shadow-sm p-8 w-full">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">DataMarkViz</h1>
            <p className="text-sm text-gray-500 mb-6">Crea tu cuenta</p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>                        
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="tu@correo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                </div>

                <p className="text-sm text-gray-500 text-center mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={onSwitchToLogin} className="text-blue-600 hover:underline">
                        Iniciar sesión
                    </button>
                </p>
        </div>
       
    );
}

export default Register;