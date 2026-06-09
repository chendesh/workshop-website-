import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('digiwork_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await authService.getMe();
      const userData = response.data?.user || response.user || response;
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('digiwork_token');
      localStorage.removeItem('digiwork_user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('digiwork_token', newToken);
    localStorage.setItem('digiwork_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const signup = async (data) => {
    const result = await authService.signup(data);
    const { token: newToken, user: userData } = result.data;
    localStorage.setItem('digiwork_token', newToken);
    localStorage.setItem('digiwork_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('digiwork_token');
    localStorage.removeItem('digiwork_user');
    setToken(null);
    setUser(null);
  };

  const isOwner = user?.role === 'owner';
  const isWorker = user?.role === 'worker';

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isOwner,
    isWorker,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
