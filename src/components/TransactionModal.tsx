import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { TRANSLATIONS, DEFAULT_CATEGORIES } from '../constants';
import { generateId } from '../services/storageService';
import { normalizeToISO, isoToDDMMYYYY } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  initialData?: Partial<Transaction>;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData, date: normalizeToISO(initialData.date || '') });
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: TransactionType.EXPENSE,
          category: DEFAULT_CATEGORIES.EXPENSE[0],
          description: '',
          amount: 0
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.date && formData.amount && formData.type && formData.category) {
      onSave({
        id: formData.id || generateId(),
        date: isoToDDMMYYYY(formData.date as string),
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        description: formData.description || '', // Allow empty description
        isRecurring: formData.isRecurring || false
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fade-in">
        <h3 className="text-xl font-bold mb-4">
          {formData.id ? t('edit') : t('addIncome') + ' / ' + t('addExpense')}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('type')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value={TransactionType.INCOME} 
                  checked={formData.type === TransactionType.INCOME}
                  onChange={() => setFormData({...formData, type: TransactionType.INCOME, category: DEFAULT_CATEGORIES.INCOME[0]})}
                  className="text-blue-600"
                />
                <span>{t('income')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value={TransactionType.EXPENSE} 
                  checked={formData.type === TransactionType.EXPENSE}
                  onChange={() => setFormData({...formData, type: TransactionType.EXPENSE, category: DEFAULT_CATEGORIES.EXPENSE[0]})}
                  className="text-blue-600"
                />
                <span>{t('expense')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('amount')}</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={formData.amount || ''}
              onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 bg-white dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('date')}</label>
            <input 
              type="date" 
              required
              value={formData.date || ''}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 bg-white dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('category')}</label>
            <select 
              value={formData.category || ''}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 bg-white dark:text-white"
            >
              {(formData.type === TransactionType.INCOME ? DEFAULT_CATEGORIES.INCOME : DEFAULT_CATEGORIES.EXPENSE).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('description')} <span className="text-gray-400 text-xs font-normal">{t('optional')}</span>
            </label>
            <input 
              type="text" 
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 bg-white dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              {t('cancel')}
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};