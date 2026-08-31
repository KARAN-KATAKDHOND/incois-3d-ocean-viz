import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check local storage for persistent session
    const savedUser = localStorage.getItem('incois_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (role = 'Operational Forecaster', email = 'forecaster@incois.gov.in') => {
    const userData = {
      name: role === 'Operational Forecaster' ? 'Dr. Karan Katakdhond' : 'Public Observer',
      email,
      role,
      token: 'mock-jwt-token-incois-2025',
    };
    setUser(userData);
    localStorage.setItem('incois_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('incois_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);