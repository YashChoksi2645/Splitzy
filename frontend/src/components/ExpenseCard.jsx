import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_ICONS, formatDateBadge, formatMoney } from '../utils/helpers';

export default function ExpenseCard({ expense, onClick, showGroupBadge = false }) {
  const { user } = useAuth();
  const { month, day } = formatDateBadge(expense.date);
  const isPayer = String(expense.paidBy?._id || expense.paidBy) === String(user?.id);
  const mySplit = expense.splits?.find((s) => String(s.userId?._id || s.userId) === String(user?.id));
  const myShare = mySplit ? mySplit.amountOwed : 0;
  const netForMe = isPayer ? expense.totalAmount - myShare : -myShare;

  return (
    <div onClick={onClick} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
      <div className="text-center w-10 shrink-0">
        <p className="text-[10px] text-gray-400 font-semibold">{month}</p>
        <p className="text-lg font-bold text-gray-700">{day}</p>
      </div>
      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-lg shrink-0">
        {CATEGORY_ICONS[expense.category] || '🧾'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{expense.description}</p>
        <p className="text-xs text-gray-500">
          {isPayer ? 'You paid' : `${expense.paidBy?.name || 'Someone'} paid`} {formatMoney(expense.totalAmount, expense.currency)}
          {showGroupBadge && expense.groupId?.name && (
            <span className="ml-2 inline-block bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">{expense.groupId.name}</span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-medium ${netForMe >= 0 ? 'text-mint-600' : 'text-coral-600'}`}>
          {netForMe >= 0 ? 'you lent' : 'you owe'}
        </p>
        <p className={`text-sm font-bold ${netForMe >= 0 ? 'text-mint-600' : 'text-coral-600'}`}>
          {formatMoney(netForMe, expense.currency)}
        </p>
      </div>
    </div>
  );
}
