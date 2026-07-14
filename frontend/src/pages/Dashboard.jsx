import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Avatar from '../components/Avatar';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const load = () => {
    api.get('/users/dashboard-summary').then((res) => setSummary(res.data));
    api.get('/friends').then((res) => setFriends(res.data));
  };

  useEffect(() => { load(); }, []);

  if (!summary) return <div className="p-8 text-gray-400">Loading dashboard…</div>;

  const namesById = Object.fromEntries(friends.map((f) => [f.id, f.name]));
  namesById[user?.id] = 'You';

  const youOweByCurrency = {};
  const youAreOwedByCurrency = {};
  for (const f of summary.youOwe) (youOweByCurrency[f.currency] ||= []).push(f);
  for (const f of summary.youAreOwed) (youAreOwedByCurrency[f.currency] ||= []).push(f);

  const suggestionsFor = (currency) =>
    (youOweByCurrency[currency] || []).map((f) => ({ from: user.id, to: f.id, amount: f.amount }));

  const settleUpByCurrency = summary.currencyBreakdown.map((cb) => ({
    currency: cb.currency,
    simplifiedSettlements: suggestionsFor(cb.currency)
  }));

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">Add an expense</button>
            <button onClick={() => setShowSettleUp(true)} className="btn-secondary">
              Settle up
            </button>
          </div>
        </div>

        {/* One stat card per currency you have balances in - never summed together */}
        <div className="flex flex-wrap gap-4 mb-2">
          {summary.currencyBreakdown.length === 0 && (
            <div className="card p-5 w-full">
              <p className="text-sm text-gray-400">You're all settled up — no outstanding balances 🎉</p>
            </div>
          )}
          {summary.currencyBreakdown.map((cb) => (
            <div key={cb.currency} className="card p-5 min-w-[220px] flex-1">
              <p className="text-xs text-gray-400 font-semibold uppercase mb-2">{cb.currency} balance</p>
              <p className={`text-xl font-bold mb-2 ${cb.netBalance >= 0 ? 'text-mint-600' : 'text-coral-600'}`}>
                {cb.netBalance >= 0 ? '+' : ''}{formatMoney(cb.netBalance, cb.currency)}
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-coral-600">you owe {formatMoney(cb.youOweTotal, cb.currency)}</span>
                <span className="text-mint-600">owed {formatMoney(cb.youAreOwedTotal, cb.currency)}</span>
              </div>
            </div>
          ))}
        </div>

        {summary.multipleCurrencies && (
          <p className="text-xs text-gray-400 mb-4 mt-2">* You have balances in multiple currencies — shown separately above, never combined into one total.</p>
        )}

        <div className="grid grid-cols-2 gap-8 mt-6">
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">You owe</h3>
            {summary.youOwe.length === 0 && <p className="text-sm text-gray-400">You do not owe anything 🎉</p>}
            <div className="space-y-2">
              {summary.youOwe.map((f, i) => (
                <div key={`${f.id}-${f.currency}-${i}`} onClick={() => navigate(`/friends/${f.id}`)} className="card p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition">
                  <Avatar name={f.name} color={f.avatarColor} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{f.name}</p>
                    <p className="text-xs text-coral-600">owes {formatMoney(f.amount, f.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">You are owed</h3>
            {summary.youAreOwed.length === 0 && <p className="text-sm text-gray-400">No one owes you anything</p>}
            <div className="space-y-2">
              {summary.youAreOwed.map((f, i) => (
                <div key={`${f.id}-${f.currency}-${i}`} onClick={() => navigate(`/friends/${f.id}`)} className="card p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition">
                  <Avatar name={f.name} color={f.avatarColor} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{f.name}</p>
                    <p className="text-xs text-mint-600">owes you {formatMoney(f.amount, f.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddExpense && (
        <AddExpenseModal
          currency={user?.defaultCurrency || 'INR'}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => { setShowAddExpense(false); load(); }}
        />
      )}
      {showSettleUp && (
        <SettleUpModal
          byCurrency={settleUpByCurrency}
          namesById={namesById}
          onClose={() => setShowSettleUp(false)}
          onSettled={() => { setShowSettleUp(false); load(); }}
        />
      )}
    </div>
  );
}
