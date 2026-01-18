
import React from 'react';
import { Escrow, EscrowStatus } from '../types';
import { CURRENCY } from '../constants';

interface Props {
  escrow: Escrow;
  onClick: (id: string) => void;
  isCreator: boolean;
}

export const EscrowCard: React.FC<Props> = ({ escrow, onClick, isCreator }) => {
  const getStatusColor = (status: EscrowStatus) => {
    switch (status) {
      case EscrowStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
      case EscrowStatus.ACCEPTED: return 'bg-blue-100 text-blue-800';
      case EscrowStatus.FUNDED: return 'bg-emerald-100 text-emerald-800';
      case EscrowStatus.COMPLETED: return 'bg-green-100 text-green-800';
      case EscrowStatus.DISPUTED: return 'bg-red-100 text-red-800';
      case EscrowStatus.CANCELLED: return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div 
      onClick={() => onClick(escrow.id)}
      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-slate-800 group-hover:text-green-600 transition truncate pr-4">
          {escrow.title}
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(escrow.status)}`}>
          {escrow.status}
        </span>
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <p className="text-2xl font-bold text-slate-900">
            {CURRENCY}{escrow.amount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isCreator ? `With: ${escrow.partnerEmail}` : `From: Creator`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500 mb-1">Role</p>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
            (isCreator && escrow.creatorRole === 'BUYER') || (!isCreator && escrow.creatorRole === 'SELLER')
              ? 'border-blue-200 text-blue-600'
              : 'border-orange-200 text-orange-600'
          }`}>
            {(isCreator && escrow.creatorRole === 'BUYER') || (!isCreator && escrow.creatorRole === 'SELLER') ? 'Buyer' : 'Seller'}
          </span>
        </div>
      </div>
    </div>
  );
};
