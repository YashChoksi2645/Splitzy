import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-400 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">S</div>
          <span className="font-bold text-xl">Splitzy</span>
        </div>
        <h1 className="text-lg font-bold text-center mb-6">Welcome back</h1>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={email} onChange={(e) => setEmail(e.target.value)}
            type="email" required placeholder="Email"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
          />
          <input
            value={password} onChange={(e) => setPassword(e.target.value)}
            type="password" required placeholder="Password"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400"
          />
          {error && <p className="text-coral-600 text-xs">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-5">
          New here? <Link to="/signup" className="text-brand-600 font-semibold">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
