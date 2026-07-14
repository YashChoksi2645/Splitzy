import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

export default function NotificationsBell() {
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const load = () => {
    api.get('/friends/requests').then((res) => setRequests(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const respond = async (friendshipId, action) => {
    await api.post(`/friends/${friendshipId}/${action}`);
    load();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white"
      >
        🔔
        {requests.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-coral-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {requests.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 max-w-[85vw] bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Friend requests</p>
          </div>
          {requests.length === 0 && <p className="px-4 py-4 text-sm text-gray-400">No pending requests</p>}
          {requests.map((r) => (
            <div key={r.friendshipId} className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 last:border-0">
              <Avatar name={r.user.name} color={r.user.avatarColor} size={30} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{r.user.name}</p>
                <p className="text-xs text-gray-500 truncate">{r.user.email}</p>
              </div>
              <button onClick={() => respond(r.friendshipId, 'accept')} className="text-xs bg-mint-500 hover:bg-mint-600 text-white rounded-lg px-2 py-1">Accept</button>
              <button onClick={() => respond(r.friendshipId, 'reject')} className="text-xs text-gray-400 hover:text-coral-600 px-1">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
