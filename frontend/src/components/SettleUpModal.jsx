import React, { useState } from 'react';
import api from '../api/axios';
import { formatMoney } from '../utils/helpers';

/**
 * byCurrency: [{ currency, simplifiedSettlements: [{from, to, amount}] }, ...]
 *
 * IMPORTANT: this used to only ever show ONE currency (whichever the caller
 * picked before opening the modal), so once that currency was fully settled
 * there was no way to get back to a different currency that still had money
 * outstanding - it just silently looked "done." Now every currency the group/
 * friend/dashboard has balances in gets its own tab inside a single modal, so
 * nothing becomes unreachable after you settle one of them.
 */
export default function SettleUpModal({ groupId = null, byCurrency, namesById, onClose, onSettled }) {
  const currencies = byCurrency.filter((cb) => cb.simplifiedSettlements?.length > 0);
  const allCurrencies = byCurrency.length ? byCurrency : [];
  const [activeCurrency, setActiveCurrency] = useState(
    (currencies[0] || allCurrencies[0])?.currency
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [methods, setMethods] = useState({}); // { "currency-index": 'cash' | 'upi' | 'card' }

  const activeBlock = allCurrencies.find((cb) => cb.currency === activeCurrency);
  const suggestions = activeBlock?.simplifiedSettlements || [];

  const recordSettlement = async (s, idx) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/settlements', {
        groupId,
        payerId: s.from,
        payeeId: s.to,
        amount: s.amount,
        currency: activeCurrency,
        method: methods[`${activeCurrency}-${idx}`] || 'cash'
      });
      onSettled();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record settlement');
    } finally {
      setLoading(false);
    }
  };

  if (allCurrencies.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-gray-900">
        <div className="card w-full max-w-sm p-6">
          <h2 className="text-lg font-bold mb-1">Settle up</h2>
          <p className="text-sm text-gray-500 mb-4">Everyone's all settled up here 🎉</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-gray-900">
      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">Settle up</h2>
        <p className="text-sm text-gray-500 mb-4">Optimized so everyone pays the fewest number of times.</p>

        {allCurrencies.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
            {allCurrencies.map((cb) => (
              <button
                key={cb.currency}
                type="button"
                onClick={() => setActiveCurrency(cb.currency)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition ${
                  activeCurrency === cb.currency ? 'bg-white shadow text-brand-600' : 'text-gray-500'
                }`}
              >
                {cb.currency}
                {cb.simplifiedSettlements?.length === 0 && ' ✓'}
              </button>
            ))}
          </div>
        )}

        {suggestions.length === 0 && (
          <p className="text-sm text-gray-500">All settled up in {activeCurrency} 🎉</p>
        )}

        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2 gap-2">
              <span className="text-sm text-gray-900">
                <b>{namesById[s.from] || 'Someone'}</b> pays <b>{namesById[s.to] || 'Someone'}</b>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{formatMoney(s.amount, activeCurrency)}</span>
                <select
                  value={methods[`${activeCurrency}-${i}`] || 'cash'}
                  onChange={(e) => setMethods({ ...methods, [`${activeCurrency}-${i}`]: e.target.value })}
                  className="text-xs border border-gray-300 rounded-lg px-1 py-1 text-gray-900 bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
                <button
                  disabled={loading}
                  onClick={() => recordSettlement(s, i)}
                  className="text-xs bg-mint-500 hover:bg-mint-600 text-white rounded-lg px-2 py-1"
                >
                  Record
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-coral-600 text-xs mt-3">{error}</p>}
        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
}
