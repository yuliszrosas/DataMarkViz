const API_BASE_URL = 'http://127.0.0.1:8000';

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

