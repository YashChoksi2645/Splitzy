import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import AddFriendModal from './AddFriendModal';
import CreateGroupModal from './CreateGroupModal';
import NotificationsBell from './NotificationsBell';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [filter, setFilter] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const loadSidebarData = () => {
    api.get('/groups').then((res) => setGroups(res.data)).catch(() => {});
    api.get('/friends').then((res) => setFriends(res.data)).catch(() => {});
  };

  useEffect(() => { loadSidebarData(); }, []);

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside className="w-full h-full bg-gradient-to-b from-brand-700 to-brand-600 text-white flex flex-col">
      <div className="p-5 flex items-center gap-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold">S</div>
        <span className="font-bold text-lg tracking-tight">Splitzy</span>
      </div>

      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <Avatar name={user?.name || '?'} color="#ffffff33" size={40} />
        <div className="min-w-0 flex-1">
          <button onClick={() => navigate('/account')} className="font-semibold truncate text-left hover:underline">
            {user?.name}
          </button>
          <button onClick={() => { logout(); navigate('/login'); }} className="block text-xs text-white/70 hover:text-white">
            Log out
          </button>
        </div>
        <NotificationsBell />
      </div>

      <div className="p-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          className="w-full rounded-lg bg-white/10 placeholder-white/60 text-sm px-3 py-2 outline-none focus:bg-white/20 transition"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        <div className="space-y-1">
          <NavLink to="/dashboard" className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/activity" className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            🕒 Recent activity
          </NavLink>
          <NavLink to="/all-expenses" className={({isActive}) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            📄 All expenses
          </NavLink>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs uppercase tracking-wider text-white/60 font-semibold">Groups</span>
            <button onClick={() => setShowCreateGroup(true)} className="text-white/70 hover:text-white text-sm font-bold">+</button>
          </div>
          <div className="space-y-0.5">
            {groups.map((g) => (
              <NavLink key={g._id} to={`/groups/${g._id}`} className={({isActive}) => `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                <span className="w-2 h-2 rounded-full bg-mint-500"></span>
                <span className="truncate">{g.name}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs uppercase tracking-wider text-white/60 font-semibold">Friends</span>
            <button onClick={() => setShowAddFriend(true)} className="text-white/70 hover:text-white text-sm font-bold">+</button>
          </div>
          <div className="space-y-0.5">
            {filteredFriends.map((f) => (
              <NavLink key={f.id} to={`/friends/${f.id}`} className={({isActive}) => `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                <span className="w-2 h-2 rounded-full bg-white/50"></span>
                <span className="truncate">{f.name}</span>
              </NavLink>
            ))}
            {filteredFriends.length === 0 && (
              <p className="px-3 text-xs text-white/50">No friends yet — add one above.</p>
            )}
          </div>
        </div>
      </nav>

      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} onAdded={() => { setShowAddFriend(false); loadSidebarData(); }} />
      )}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={(g) => { setShowCreateGroup(false); loadSidebarData(); navigate(`/groups/${g._id}`); }} />
      )}
    </aside>
  );
}
