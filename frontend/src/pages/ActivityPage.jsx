import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import AddExpenseModal from '../components/AddExpenseModal';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  expense_added: '🧾',
  expense_updated: '✏️',
  expense_deleted: '🗑️',
  settlement: '💸',
  group_created: '👥',
  group_updated: '⚙️',
  group_deleted: '🗑️',
  member_added: '➕'
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [notice, setNotice] = useState('');

  const load = () => {
    api.get('/activity').then((res) => setActivities(res.data));
  };

  useEffect(() => { load(); }, []);

  const openExpense = async (expenseId) => {
    if (!expenseId) return;
    setNotice('');
    try {
      const res = await api.get(`/expenses/${expenseId}`);
      setSelectedExpense(res.data);
    } catch {
      setNotice('This expense no longer exists (it may have been deleted).');
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Recent activity</h1>
      {notice && <p className="text-xs text-gray-400 mb-3">{notice}</p>}
      <div className="card">
        {activities.length === 0 && <p className="p-6 text-sm text-gray-400">Nothing here yet.</p>}
        {activities.map((a) => (
          <div
            key={a._id}
            onClick={() => openExpense(a.expenseId)}
            className={`flex items-start gap-3 p-4 border-b border-gray-100 last:border-0 ${a.expenseId ? 'cursor-pointer hover:bg-gray-50' : ''}`}
          >
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-lg shrink-0">
              {ICONS[a.type] || '📌'}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800">{a.message}</p>
              <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onEdit={(exp) => { setSelectedExpense(null); setEditingExpense(exp); }}
          onDeleted={() => { setSelectedExpense(null); load(); }}
        />
      )}
      {editingExpense && (
        <AddExpenseModal
          expenseToEdit={editingExpense}
          currency={user?.defaultCurrency || 'INR'}
          onClose={() => setEditingExpense(null)}
          onCreated={() => { setEditingExpense(null); load(); }}
        />
      )}
    </div>
  );
}
