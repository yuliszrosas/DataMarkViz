const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

//Obtener rendimientos
export const fetchRendimientos =  async (symbol, range) => {
    try{
        const response = await fetch (`${API_BASE_URL}/api/rendimientos?symbol=${symbol}&range=${range}`);

        if(!response.ok){
            throw new Error('Error al cargar datos');
        }
        
        const data = await response.json();
        return data;
    }catch(error){
        console.error('Error: ', error);
        throw error;
    }
};

//Obtener solo precios para comparar y depurar
export const fetchPrecios = async (symbol, range) => {
    try{
        const response = await fetch (`${API_BASE_URL}/api/precios?symbol=${symbol}&range=${range}`);

        if(!response.ok){
            throw new Error('Error al cargar los precios');
        }
        
        const data = await response.json();
        return data;
    }catch(error){
        console.error('Error: ', error);
        throw error;
    }
}; 

//Obtener tipo de cambio
export const fetchTipoCambio = async (range) => {
    try{
        const response = await fetch (`${API_BASE_URL}/api/tipo-cambio?range=${range}`);

        if(!response.ok){
            throw new Error('Error al cargar el tipo de cambio');
        }
        
        const data = await response.json();
        return data;
    }catch(error){
        console.error('Error: ', error);
        throw error;
    }
};

//Registro de usuario
export const registerUsuario = async (nombre, correo, contrasena) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json' },
            body: JSON.stringify({nombre, correo, contrasena})
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.message || 'Error al registrarse');
        return data;

    }catch(error){
        console.error('Error: ', error);
        throw error;
    }
};

//Login de usuario
export const loginUsuario = async (correo, contrasena) => {
    try{
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({correo, contrasena})
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.message || 'Error al iniciar sesión');
        return data;
    }catch(error){
        console.error('Error: ', error);
        throw error;
    }
};

//Obtener favoritos
export const fetchFavoritos = async (token) => {
    const response = await fetch (`${API_BASE_URL}/api/favoritos`, {
        headers: {'Authorization': `Bearer ${token}`}
    });
   
    const data = await response.json();
    if(!response.ok) throw new Error(data.message || 'Error al obtener favoritos');
    return data;
};

//Agregar favorito
export const agregarFavorito = async (simbolo, token) => {
    const response = await fetch (`${API_BASE_URL}/api/favoritos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ simbolo })
    });
    
    const data = await response.json();
    if(!response.ok) throw new Error(data.message || 'Error al agregar favoritos');
    return data;
};

//Eliminar favorito
export const eliminarFavorito = async (simbolo, token) => {
    const response = await fetch(`${API_BASE_URL}/api/favoritos/${simbolo}`, {
        method: 'DELETE',
        headers: {'Authorization': `Bearer ${token}`}
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.message || 'Error al eliminar favorito');
    return data;
}