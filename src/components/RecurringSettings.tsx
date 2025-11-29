import React, { useState } from 'react';
import { RecurringConfig, TransactionType, CategoryData } from '../types';
import { TRANSLATIONS } from '../constants';
import { Trash2, Edit2 } from 'lucide-react';
import { RecurringForm } from './RecurringForm';

interface Props {
  recurring: RecurringConfig[];
  onSave: (c: RecurringConfig) => void;
  onDelete: (id: string) => void;
  categories: CategoryData;
}

export const RecurringSettings: React.FC<Props> = ({ recurring, onSave, onDelete, categories }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const [editingConfig, setEditingConfig] = useState<RecurringConfig | undefined>(undefined);

  const handleEdit = (config: RecurringConfig) => {
    setEditingConfig(config);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingConfig(undefined);
  };

  const handleSave = (config: RecurringConfig) => {
    onSave(config);
    setEditingConfig(undefined);
  };
  
  const handleToggleActive = (config: RecurringConfig) => {
    onSave({ ...config, active: !config.active });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('recurring')}</h2>
      </div>

      {/* Inline Form */}
      <RecurringForm 
        onSave={handleSave} 
        onCancel={editingConfig ? handleCancelEdit : undefined}
        initialData={editingConfig}
        categories={categories}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurring.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition-all hover:shadow-md">
            <div>
              <div className="flex justify-between items-start mb-4">
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.type === TransactionType.INCOME 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {t(item.type === TransactionType.INCOME ? 'income' : 'expense')}
                  </span>
                  
                  {/* Quick Toggle Switch */}
                  <button 
                    onClick={() => handleToggleActive(item)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${item.active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                    title={t(item.active ? 'active' : 'inactive')}
                    style={{direction:"ltr"}}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.active ? 'translate-x-1' : 'translate-x-6'}`} />
                  </button>
              </div>
              <h3 className="text-lg font-bold mb-1">{item.description || t('recurring')}</h3>
              <p className="text-sm text-gray-500 mb-4">{item.category}</p>
              
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-gray-500">{t('dayOfMonth')}</p>
                  <p className="font-medium text-lg">{item.dayOfMonth}</p>
                </div>
                 <div className="text-right rtl:text-left">
                  <p className="text-xs text-gray-500">{t('amount')}</p>
                  <p className="font-bold text-xl">{item.amount.toLocaleString()} ₪</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
               <button onClick={() => handleEdit(item)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-500">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500">
                  <Trash2 size={18} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};