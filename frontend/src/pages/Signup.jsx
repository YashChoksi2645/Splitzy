import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 60;

export default function Signup() {
  const { sendSignupOtp, verifySignupOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const validEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async (e) => {
    e?.preventDefault();
    setError('');
    if (!validEmail(email)) return setError('Enter a valid email address');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await sendSignupOtp({ name, email, password, defaultCurrency });
      setStep('otp');
      setInfo(`We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) return setError('Enter the 6-digit code from your email');

    setLoading(true);
    try {
      await verifySignupOtp({ email, otp: otp.trim() });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify code');
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

        {step === 'details' && (
          <>
            <h1 className="text-lg font-bold text-center mb-6">Create your account</h1>
            <form onSubmit={requestCode} className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Password (6+ characters)"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-brand-400" />
              <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
              {error && <p className="text-coral-600 text-xs">{error}</p>}
              <button disabled={loading} className="btn-primary w-full">{loading ? 'Sending code…' : 'Send verification code'}</button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="text-lg font-bold text-center mb-2">Check your email</h1>
            {info && <p className="text-sm text-gray-500 text-center mb-6">{info}</p>}
            <form onSubmit={verifyCode} className="space-y-3">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit code"
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-center text-2xl tracking-[0.5em] text-gray-900 placeholder-gray-300 placeholder:tracking-normal bg-white outline-none focus:ring-2 focus:ring-brand-400"
              />
              {error && <p className="text-coral-600 text-xs">{error}</p>}
              <button disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify & create account'}</button>
            </form>
            <div className="flex items-center justify-between mt-4 text-sm">
              <button onClick={() => { setStep('details'); setError(''); setInfo(''); }} className="text-gray-500 hover:underline">
                ← Change email
              </button>
              <button
                onClick={requestCode}
                disabled={cooldown > 0 || loading}
                className="text-brand-600 font-medium disabled:text-gray-300"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}

        <p className="text-sm text-center text-gray-500 mt-5">
          Already have an account? <Link to="/login" className="text-brand-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
