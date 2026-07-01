import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children}) {
    const [usuario, setUsuario] = useState(null);
    const [token, setToken] = useState(null);

    const login = (nombre, jwt) => {
        setUsuario(nombre);
        setToken(jwt);
    };

    const logout = () => {
        setUsuario(null);
        setToken(null);
    };

    return(
        <AuthContext.Provider value={{ usuario, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(){
    return useContext(AuthContext);
}