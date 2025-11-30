import React, { useState } from 'react';
import { Transaction, TransactionType, CategoryData } from '../types';
import { TRANSLATIONS } from '../constants';
import { Trash2, Edit2, Search, Download, Trash, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../services/exportService';
import { TransactionForm } from './TransactionForm';
import { parseToDate } from '../utils/dateUtils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  transactions: Transaction[];
  onSave: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  categories: CategoryData;
}

type SortKey = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export const TransactionList: React.FC<Props> = ({ transactions, onSave, onDelete, onClearAll, categories }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Advanced Filters - Default to Current Month for performance
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1).toISOString().split('T')[0];

  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
    key: 'date', 
    direction: 'desc' 
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTransaction(undefined);
  };

  const handleSave = (transaction: Transaction) => {
    onSave(transaction);
    setEditingTransaction(undefined);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const resetFilters = () => {
    setFilterType('ALL');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setSelectedCategory('ALL');
    setSearchTerm('');
    setSortConfig({ key: 'date', direction: 'desc' });
  };

  const allCategories = [...categories.income, ...categories.expense];

  // Filtering Logic
  const filteredTransactions = transactions
    .filter(tr => {
      if (filterType !== 'ALL' && tr.type !== filterType) return false;
      if (selectedCategory !== 'ALL' && tr.category !== selectedCategory) return false;

      const search = searchTerm.toLowerCase();
      if (searchTerm && !tr.description.toLowerCase().includes(search) && !tr.category.toLowerCase().includes(search)) return false;

      // Date Filtering
      if (dateRange.start && parseToDate(tr.date).getTime() < new Date(dateRange.start).getTime()) return false;
      if (dateRange.end && parseToDate(tr.date).getTime() > new Date(dateRange.end).getTime()) return false;

      if (amountRange.min && tr.amount < Number(amountRange.min)) return false;
      if (amountRange.max && tr.amount > Number(amountRange.max)) return false;

      return true;
    });

  // Sorting Logic applied after filtering
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortConfig.key) {
      case 'date':
        comparison = parseToDate(a.date).getTime() - parseToDate(b.date).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-500" /> : <ArrowDown size={14} className="text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">{t('transactions')}</h2>
        <div className="flex flex-wrap gap-2">
           <button onClick={() => exportToExcel(sortedTransactions)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm text-sm">
            <Download size={16} /> Excel
          </button>
          <button onClick={() => exportToPDF(sortedTransactions)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm text-sm">
            <Download size={16} /> PDF
          </button>
          <button 
            type="button"
            onClick={() => setIsConfirmOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-sm text-sm"
          >
            <Trash size={16} /> {t('clearAll')}
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={onClearAll}
        title={t('confirmDeleteTitle')}
        message={t('clearAllConfirm')}
      />

      {/* Inline Form for Adding/Editing */}
      <TransactionForm 
        onSave={handleSave} 
        onCancel={editingTransaction ? handleCancelEdit : undefined}
        initialData={editingTransaction} 
        categories={categories}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Filters Section */}
        <div className="p-4 border-b dark:border-gray-700 space-y-4">
          
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rtl:right-3 rtl:left-auto" size={18} />
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Type Toggles */}
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-md text-sm ${filterType === 'ALL' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
              >
                All
              </button>
              <button 
                 onClick={() => setFilterType(TransactionType.INCOME)}
                 className={`px-3 py-1.5 rounded-md text-sm ${filterType === TransactionType.INCOME ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {t('income')}
              </button>
              <button 
                 onClick={() => setFilterType(TransactionType.EXPENSE)}
                 className={`px-3 py-1.5 rounded-md text-sm ${filterType === TransactionType.EXPENSE ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {t('expense')}
              </button>
            </div>
          </div>

          {/* Advanced Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="flex flex-col">
               <label className="text-xs text-gray-400 mb-1">{t('startDate')}</label>
               <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
                />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">{t('endDate')}</label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">{t('minAmount')}</label>
              <input 
                type="number" 
                placeholder="0"
                value={amountRange.min}
                onChange={e => setAmountRange({ ...amountRange, min: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">{t('maxAmount')}</label>
              <input 
                type="number" 
                placeholder="∞"
                value={amountRange.max}
                onChange={e => setAmountRange({ ...amountRange, max: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">{t('category')}</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
              >
                <option value="ALL">{t('allCategories')}</option>
                {allCategories.sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={resetFilters} 
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <XCircle size={16} /> {t('resetFilters')}
            </button>
            <span className="text-xs text-gray-400 flex-1 text-left rtl:text-right px-2">
              {filteredTransactions.length} {t('transactions')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th 
                  className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    {t('date')}
                    <SortIcon column="date" />
                  </div>
                </th>
                <th className="px-6 py-4 font-medium">{t('type')}</th>
                <th 
                  className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group select-none"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    {t('category')}
                    <SortIcon column="category" />
                  </div>
                </th>
                <th className="px-6 py-4 font-medium">{t('description')}</th>
                <th 
                  className="px-6 py-4 font-medium text-right rtl:text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group select-none"
                  onClick={() => handleSort('amount')}
                >
                   <div className="flex items-center justify-end gap-1">
                    {t('amount')}
                    <SortIcon column="amount" />
                  </div>
                </th>
                <th className="px-6 py-4 font-medium text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedTransactions.map(tr => (
                <tr key={tr.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${editingTransaction?.id === tr.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap" >{tr.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tr.type === TransactionType.INCOME 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {t(tr.type === TransactionType.INCOME ? 'income' : 'expense')}
                    </span>
                  </td>
                  <td className="px-6 py-4">{tr.category}</td>
                  <td className="px-6 py-4">{tr.description}</td>
                  <td className={`px-6 py-4 text-right rtl:text-left font-semibold ${tr.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                     {tr.amount.toLocaleString()} {tr.type === TransactionType.INCOME ? '+' : '-'} ₪ 
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => handleEdit(tr)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-blue-500">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(tr.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};