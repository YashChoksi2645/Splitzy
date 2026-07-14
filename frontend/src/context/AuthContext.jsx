import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('splitzy_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('splitzy_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => {
        const normalized = res.data.id ? res.data : { ...res.data, id: res.data._id };
        setUser(normalized);
        localStorage.setItem('splitzy_user', JSON.stringify(normalized));
      })
      .catch(() => {
        localStorage.removeItem('splitzy_token');
        localStorage.removeItem('splitzy_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('splitzy_token', res.data.token);
    localStorage.setItem('splitzy_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('splitzy_token', res.data.token);
    localStorage.setItem('splitzy_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  // Step 1 of the new signup flow: just sends the code, doesn't log anyone in yet.
  const sendSignupOtp = async (payload) => {
    await api.post('/auth/send-otp', payload);
  };

  // Step 2: confirms the code and actually creates the account + logs in.
  const verifySignupOtp = async ({ email, otp }) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    localStorage.setItem('splitzy_token', res.data.token);
    localStorage.setItem('splitzy_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('splitzy_token');
    localStorage.removeItem('splitzy_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, sendSignupOtp, verifySignupOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
