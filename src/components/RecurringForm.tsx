import React, { useState, useEffect } from 'react';
import { RecurringConfig, TransactionType, CategoryData } from '../types';
import { TRANSLATIONS } from '../constants';
import { generateId } from '../services/storageService';
import { Save, X, AlertCircle } from 'lucide-react';

interface Props {
  onSave: (config: RecurringConfig) => void;
  onCancel?: () => void;
  initialData?: RecurringConfig;
  categories: CategoryData;
}

export const RecurringForm: React.FC<Props> = ({ onSave, onCancel, initialData, categories }) => {
  const t = (key: string) => TRANSLATIONS[key];
  
  const [formData, setFormData] = useState<Partial<RecurringConfig>>({
    type: TransactionType.EXPENSE,
    category: '',
    description: '',
    amount: 0,
    dayOfMonth: 1,
    active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Init Category
  useEffect(() => {
    const list = formData.type === TransactionType.INCOME ? categories.income : categories.expense;
    if (!formData.category || !list.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: list[0] || '' }));
    }
  }, [formData.type, categories]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setErrors({});
    } else {
      const list = categories.expense;
      setFormData({
        type: TransactionType.EXPENSE,
        category: list[0] || '',
        description: '',
        amount: 0,
        dayOfMonth: 1,
        active: true
      });
      setErrors({});
    }
  }, [initialData, categories]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('invalidAmount');
    }
    
    if (!formData.dayOfMonth || formData.dayOfMonth < 1 || formData.dayOfMonth > 31) {
      newErrors.dayOfMonth = t('invalidDayOfMonth');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    if (formData.amount && formData.type && formData.category && formData.dayOfMonth) {
      onSave({
        id: formData.id || generateId(),
        type: formData.type,
        category: formData.category,
        description: formData.description || '', // Optional
        amount: Number(formData.amount),
        dayOfMonth: Number(formData.dayOfMonth),
        active: formData.active !== undefined ? formData.active : true,
        lastProcessedDate: formData.lastProcessedDate
      });

      if (!initialData) {
        const list = categories.expense;
        setFormData({
          type: TransactionType.EXPENSE,
          category: list[0] || '',
          description: '',
          amount: 0,
          dayOfMonth: 1,
          active: true
        });
        setErrors({});
      }
    }
  };

  const currentCategories = formData.type === TransactionType.INCOME ? categories.income : categories.expense;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
       <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
        <span>{initialData ? t('edit') : t('recurring')}</span>
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

        {/* Day of Month */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{t('dayOfMonth')} (1-31)</label>
          <input
            type="number"
            min="1"
            max="31"
            required
            value={formData.dayOfMonth || ''}
            onChange={e => {
              setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) });
              if (errors.dayOfMonth) setErrors({...errors, dayOfMonth: ''});
            }}
            className={`w-full px-3 py-2 rounded-lg border ${errors.dayOfMonth ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
          />
          {errors.dayOfMonth && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.dayOfMonth}</p>}
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

         {/* Active / Save */}
         <div className="lg:col-span-1 flex items-center gap-2 pt-7">
            <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm h-[42px]"
          >
            <Save size={18} />
            {initialData ? t('update') : t('save')}
          </button>
        </div>
        
        <div className="lg:col-span-6 flex items-center gap-2 -mt-2">
            <button 
                type="button"
                onClick={() => setFormData({...formData, active: !formData.active})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                style={{direction:"ltr"}}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-1' : 'translate-x-6'}`} />
            </button>
            <span 
              className={`text-sm font-medium cursor-pointer ${formData.active ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setFormData({...formData, active: !formData.active})}
            >
              {formData.active ? t('active') : t('inactive')}
            </span>
        </div>

      </form>
    </div>
  );
};