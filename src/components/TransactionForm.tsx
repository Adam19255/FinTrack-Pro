import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, CategoryData } from '../types';
import { TRANSLATIONS } from '../constants';
import { generateId } from '../services/storageService';
import { Save, X, AlertCircle } from 'lucide-react';
import { normalizeToISO, isoToDDMMYYYY } from '../utils/dateUtils';

interface Props {
  onSave: (transaction: Transaction) => void;
  onCancel?: () => void;
  initialData?: Transaction;
  categories: CategoryData;
}

export const TransactionForm: React.FC<Props> = ({ onSave, onCancel, initialData, categories }) => {
  const t = (key: string) => TRANSLATIONS[key];
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.EXPENSE,
    category: '', 
    description: '',
    amount: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Effect to set initial category when type changes or categories load
  useEffect(() => {
    const list = formData.type === TransactionType.INCOME ? categories.income : categories.expense;
    if (!formData.category || !list.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: list[0] || '' }));
    }
  }, [formData.type, categories]);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, date: normalizeToISO(initialData.date) });
      setErrors({});
    } else {
      const list = categories.expense;
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: TransactionType.EXPENSE,
        category: list[0] || '',
        description: '',
        amount: 0
      });
      setErrors({});
    }
  }, [initialData, categories]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('invalidAmount');
    }
    
    if (!formData.date) {
      newErrors.date = t('invalidDate');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    if (formData.date && formData.amount && formData.type && formData.category) {
      onSave({
        id: formData.id || generateId(),
        date: isoToDDMMYYYY(formData.date as string),
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        description: formData.description || '',
        isRecurring: formData.isRecurring || false
      });
      
      // Reset form if not editing
      if (!initialData) {
        const list = categories.expense;
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: TransactionType.EXPENSE,
          category: list[0] || '',
          description: '',
          amount: 0
        });
        setErrors({});
      }
    }
  };

  const currentCategories = formData.type === TransactionType.INCOME ? categories.income : categories.expense;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
      <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
        <span>{initialData ? t('edit') : t('quickAdd')}</span>
        {initialData && onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        )}
      </h3>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start">
        {/* Type Selection */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{t('type')}</label>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.INCOME, category: categories.income[0] })}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formData.type === TransactionType.INCOME
                  ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t('income')}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE, category: categories.expense[0] })}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formData.type === TransactionType.EXPENSE
                  ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t('expense')}
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{t('date')}</label>
          <input
            type="date"
            required
            value={formData.date || ''}
            onChange={e => {
              setFormData({ ...formData, date: e.target.value });
              if (errors.date) setErrors({...errors, date: ''});
            }}
            className={`w-full px-3 py-2 rounded-lg border ${errors.date ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.date}</p>}
        </div>

        {/* Category */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{t('category')}</label>
          <select
            value={formData.category || ''}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          >
            {currentCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{t('amount')}</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={formData.amount || ''}
            onChange={e => {
              setFormData({ ...formData, amount: parseFloat(e.target.value) });
              if (errors.amount) setErrors({...errors, amount: ''});
            }}
            className={`w-full px-3 py-2 rounded-lg border ${errors.amount ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.amount}</p>}
        </div>

        {/* Description */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {t('description')} <span className="text-xs text-gray-400 font-normal">{t('optional')}</span>
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Submit Button */}
        <div className="lg:col-span-1 pt-7">
           <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm h-[42px]"
          >
            <Save size={18} />
            {initialData ? t('update') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
};