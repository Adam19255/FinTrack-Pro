import React, { useState } from 'react';
import { CategoryData, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Trash2, Plus, Tag, X, GripVertical } from 'lucide-react';

interface Props {
  categories: CategoryData;
  onUpdate: (categories: CategoryData) => void;
}

export const CategoryManager: React.FC<Props> = ({ categories, onUpdate }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const [newCategory, setNewCategory] = useState('');
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [error, setError] = useState('');
  
  // Drag and Drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const currentList = activeTab === TransactionType.INCOME ? categories.income : categories.expense;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    if (currentList.includes(newCategory.trim())) {
      setError(t('categoryExists'));
      return;
    }

    const updatedList = [...currentList, newCategory.trim()];
    const updatedCategories = {
      ...categories,
      [activeTab === TransactionType.INCOME ? 'income' : 'expense']: updatedList
    };

    onUpdate(updatedCategories);
    setNewCategory('');
    setError('');
  };

  const handleDelete = (category: string) => {
    const updatedList = currentList.filter(c => c !== category);
    const updatedCategories = {
      ...categories,
      [activeTab === TransactionType.INCOME ? 'income' : 'expense']: updatedList
    };
    onUpdate(updatedCategories);
  };

  // Drag Handlers
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    // Reorder list
    const updatedList = [...currentList];
    const item = updatedList.splice(draggedItemIndex, 1)[0];
    updatedList.splice(index, 0, item);

    // Optimistic update for UI smoothness (optional, or wait for drop)
    const updatedCategories = {
      ...categories,
      [activeTab === TransactionType.INCOME ? 'income' : 'expense']: updatedList
    };
    onUpdate(updatedCategories);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Tag className="text-blue-600" />
        {t('manageCategories')}
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
        <button
          onClick={() => { setActiveTab(TransactionType.EXPENSE); setError(''); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === TransactionType.EXPENSE
              ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {t('expense')}
        </button>
        <button
          onClick={() => { setActiveTab(TransactionType.INCOME); setError(''); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === TransactionType.INCOME
              ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {t('income')}
        </button>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => { setNewCategory(e.target.value); setError(''); }}
            placeholder={t('newCategory')}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={!newCategory.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus size={20} />
          {t('add')}
        </button>
      </form>
      
      <p className="text-xs text-gray-400 mb-2">{t('dragToReorder')}</p>

      {/* List with Drag and Drop */}
      <div className="flex flex-col gap-2">
        {currentList.map((cat, index) => (
          <div 
            key={cat} 
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 cursor-move transition-all ${draggedItemIndex === index ? 'opacity-50 border-blue-400 border-dashed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <GripVertical size={16} className="text-gray-400" />
              <span className="font-medium">{cat}</span>
            </div>
            <button
              onClick={() => handleDelete(cat)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {currentList.length === 0 && (
          <p className="text-gray-500 italic text-sm text-center py-4">{t('noData')}</p>
        )}
      </div>
    </div>
  );
};