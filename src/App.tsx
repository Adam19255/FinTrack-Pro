import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { RecurringSettings } from './components/RecurringSettings';
import { Insights } from './components/Insights';
import { CategoryManager } from './components/CategoryManager';
import { Investments } from './components/Investments';
import { Transaction, RecurringConfig, CategoryData, Theme, InvestmentTransaction } from './types';
import { 
  getTransactions, saveTransactions, 
  getRecurringConfigs, saveRecurringConfigs, 
  getCategories, saveCategories,
  getInvestments, saveInvestments,
  processRecurringTransactions, clearAllData
} from './services/storageService';
import { TRANSLATIONS, DEFAULT_CATEGORIES } from './constants';
import { ToastProvider, useToast } from './context/ToastContext';

// Create a wrapper component to use the toast hook
const AppContent: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringConfig[]>([]);
  const [categories, setCategories] = useState<CategoryData>({ income: [], expense: [] });
  const [investments, setInvestments] = useState<InvestmentTransaction[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const t = (key: string) => TRANSLATIONS[key];

  // Initialization
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedTransactions = await getTransactions();
        const loadedRecurring = await getRecurringConfigs();
        const loadedCategories = await getCategories();
        const loadedInvestments = await getInvestments();
        
        const { updatedTransactions, updatedRecurring, addedCount } = processRecurringTransactions(
          loadedTransactions,
          loadedRecurring
        );

        if (addedCount > 0) {
          await saveTransactions(updatedTransactions);
          await saveRecurringConfigs(updatedRecurring);
        }

        setTransactions(updatedTransactions);
        setRecurring(updatedRecurring);
        setCategories(loadedCategories);
        setInvestments(loadedInvestments);
      } catch (error) {
        console.error("Failed to load data", error);
        setCategories({
          income: [...DEFAULT_CATEGORIES.INCOME],
          expense: [...DEFAULT_CATEGORIES.EXPENSE]
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSaveTransaction = async (tx: Transaction) => {
    const newTransactions = transactions.some(t => t.id === tx.id)
      ? transactions.map(t => t.id === tx.id ? tx : t)
      : [...transactions, tx];
    
    setTransactions(newTransactions);
    await saveTransactions(newTransactions);
    showToast(t('actionSuccess'), 'success');
  };

  const handleDeleteTransaction = async (id: string) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    setTransactions(newTransactions);
    await saveTransactions(newTransactions);
    showToast(t('actionSuccess'), 'success');
  };

  const handleSaveRecurring = async (conf: RecurringConfig) => {
    const newRecurring = recurring.some(r => r.id === conf.id)
      ? recurring.map(r => r.id === conf.id ? conf : r)
      : [...recurring, conf];
    
    setRecurring(newRecurring);
    await saveRecurringConfigs(newRecurring);
    showToast(t('actionSuccess'), 'success');
  };

  const handleDeleteRecurring = async (id: string) => {
    const newRecurring = recurring.filter(r => r.id !== id);
    setRecurring(newRecurring);
    await saveRecurringConfigs(newRecurring);
    showToast(t('actionSuccess'), 'success');
  };

  const handleUpdateCategories = async (newCategories: CategoryData) => {
    setCategories(newCategories);
    await saveCategories(newCategories);
    showToast(t('actionSuccess'), 'success');
  };

  const handleSaveInvestment = async (inv: InvestmentTransaction) => {
    const exists = investments.some(i => i.id === inv.id);
    let newInvestments;
    
    if (exists) {
        newInvestments = investments.map(i => i.id === inv.id ? inv : i);
    } else {
        newInvestments = [...investments, inv];
    }
    
    setInvestments(newInvestments);
    await saveInvestments(newInvestments);
  };

  const handleDeleteInvestment = async (id: string) => {
    const newInvestments = investments.filter(i => i.id !== id);
    setInvestments(newInvestments);
    await saveInvestments(newInvestments);
    showToast(t('actionSuccess'), 'success');
  };

  const handleClearAll = async () => {
    await clearAllData();
    setTransactions([]);
    setRecurring([]);
    setInvestments([]);
    const defaults = {
        income: [...DEFAULT_CATEGORIES.INCOME],
        expense: [...DEFAULT_CATEGORIES.EXPENSE]
    };
    setCategories(defaults);
    await saveCategories(defaults);
    showToast(t('dataCleared'), 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
        {TRANSLATIONS.loading}
      </div>
    );
  }

  return (
    <Router>
      <Layout theme={theme} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={
            <Dashboard 
              transactions={transactions} 
              onSave={handleSaveTransaction}
              categories={categories}
            />
          } />
          <Route path="/transactions" element={
            <TransactionList 
              transactions={transactions} 
              onSave={handleSaveTransaction} 
              onDelete={handleDeleteTransaction}
              onClearAll={handleClearAll}
              categories={categories}
            />
          } />
          <Route path="/recurring" element={
            <RecurringSettings 
              recurring={recurring} 
              onSave={handleSaveRecurring} 
              onDelete={handleDeleteRecurring}
              categories={categories}
            />
          } />
          <Route path="/categories" element={
             <CategoryManager 
               categories={categories}
               onUpdate={handleUpdateCategories}
             />
          } />
          <Route path="/investments" element={
            <Investments 
              investments={investments}
              transactions={transactions}
              onSave={handleSaveInvestment}
              onDelete={handleDeleteInvestment}
              onSaveTransaction={handleSaveTransaction}
            />
          } />
          <Route path="/insights" element={<Insights transactions={transactions} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;