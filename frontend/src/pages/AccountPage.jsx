import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

function EditableField({ label, value, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {!editing ? (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{value || <span className="text-gray-400 font-normal">Not set</span>}</span>
          <button onClick={() => setEditing(true)} className="text-brand-600 text-sm font-medium">✏️ Edit</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button disabled={saving} onClick={save} className="text-mint-600 text-sm font-semibold">{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={() => { setEditing(false); setDraft(value || ''); }} className="text-gray-400 text-sm">Cancel</button>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user } = useAuth() || {};
  const [localUser, setLocalUser] = useState(user);
  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency || 'INR');
  const [timezone, setTimezone] = useState(user?.timezone || 'GMT+05:30 Chennai');
  const [language, setLanguage] = useState(user?.language || 'English');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const updateField = async (field, value) => {
    const res = await api.put('/users/me', { [field]: value });
    setLocalUser(res.data);
    localStorage.setItem('splitzy_user', JSON.stringify(res.data));
  };

  const saveSettings = async () => {
    const res = await api.put('/users/me', { defaultCurrency });
    setLocalUser(res.data);
    localStorage.setItem('splitzy_user', JSON.stringify(res.data));
    setSaveMessage('Saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwMessage('');
    try {
      await api.put('/users/me/password', { currentPassword: pwCurrent, newPassword: pwNew });
      setPwMessage('Password updated');
      setPwCurrent('');
      setPwNew('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update password');
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your account</h1>

      <div className="grid grid-cols-[220px_1fr_1fr_260px] gap-8">
        <div>
          <Avatar name={localUser?.name || '?'} size={140} />
          <p className="text-sm text-gray-500 mt-3 mb-1">Change your avatar</p>
          <input type="file" className="text-xs text-gray-500" />
        </div>

        <div>
          <EditableField label="Your name" value={localUser?.name} onSave={(v) => updateField('name', v)} />
          <EditableField label="Your email address" value={localUser?.email} type="email" onSave={(v) => updateField('email', v)} />
          <EditableField label="Your phone number" value={localUser?.phone} onSave={(v) => updateField('phone', v)} />

          <div className="mb-2">
            <p className="text-sm text-gray-500 mb-1">Your password</p>
            <form onSubmit={changePassword} className="space-y-2">
              <input
                type="password" placeholder="Current password" value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-brand-400"
              />
              <input
                type="password" placeholder="New password (6+ characters)" value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button className="text-brand-600 text-sm font-semibold">✏️ Update password</button>
              {pwError && <p className="text-coral-600 text-xs">{pwError}</p>}
              {pwMessage && <p className="text-mint-600 text-xs">{pwMessage}</p>}
            </form>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Your default currency</p>
          <p className="text-xs text-gray-400 mb-1">(for new expenses)</p>
          <select
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white mb-5"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <p className="text-sm text-gray-500 mb-1">Your time zone</p>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white mb-5"
          >
            <option>GMT+05:30 Chennai</option>
            <option>GMT+00:00 London</option>
            <option>GMT-05:00 New York</option>
            <option>GMT-08:00 Los Angeles</option>
          </select>

          <p className="text-sm text-gray-500 mb-1">Language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Spanish</option>
          </select>
        </div>

        <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white h-fit">
          <p className="font-bold mb-1">Get Splitzy Pro!</p>
          <p className="text-sm text-white/90 mb-3">Subscribe for currency conversion, charts, search, and an ad-free experience.</p>
          <button type="button" className="bg-white text-brand-600 font-semibold rounded-lg px-4 py-2 text-sm w-full">Learn more</button>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button onClick={saveSettings} className="btn-primary">Save</button>
        {saveMessage && <span className="text-mint-600 text-sm">{saveMessage}</span>}
      </div>
    </div>
  );
}
