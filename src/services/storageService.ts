import { Transaction, RecurringConfig, CategoryData } from '../types';
import { DEFAULT_CATEGORIES, TRANSLATIONS } from '../constants';
import { formatDateToDDMMYYYY, parseToDate } from '../utils/dateUtils';

const STORAGE_KEY_TRANSACTIONS = 'fintrack_transactions';
const STORAGE_KEY_RECURRING = 'fintrack_recurring';
const STORAGE_KEY_CATEGORIES = 'fintrack_categories';

// Helper to check environment
const isElectron = () => !!window.electronAPI;

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  if (isElectron()) {
    const data = await window.electronAPI!.getData(STORAGE_KEY_TRANSACTIONS);
    return data || [];
  } else {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  if (isElectron()) {
    await window.electronAPI!.saveData(STORAGE_KEY_TRANSACTIONS, transactions);
  } else {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  }
};

// Recurring
export const getRecurringConfigs = async (): Promise<RecurringConfig[]> => {
  if (isElectron()) {
    const data = await window.electronAPI!.getData(STORAGE_KEY_RECURRING);
    return data || [];
  } else {
    const data = localStorage.getItem(STORAGE_KEY_RECURRING);
    return data ? JSON.parse(data) : [];
  }
};

export const saveRecurringConfigs = async (configs: RecurringConfig[]) => {
  if (isElectron()) {
    await window.electronAPI!.saveData(STORAGE_KEY_RECURRING, configs);
  } else {
    localStorage.setItem(STORAGE_KEY_RECURRING, JSON.stringify(configs));
  }
};

// Categories
export const getCategories = async (): Promise<CategoryData> => {
  let data: CategoryData | null = null;
  
  if (isElectron()) {
    data = await window.electronAPI!.getData(STORAGE_KEY_CATEGORIES);
  } else {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    data = raw ? JSON.parse(raw) : null;
  }

  if (!data) {
    return {
      income: [...DEFAULT_CATEGORIES.INCOME],
      expense: [...DEFAULT_CATEGORIES.EXPENSE]
    };
  }
  return data;
};

export const saveCategories = async (categories: CategoryData) => {
  if (isElectron()) {
    await window.electronAPI!.saveData(STORAGE_KEY_CATEGORIES, categories);
  } else {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  }
};

// Clear All
export const clearAllData = async () => {
  if (isElectron()) {
    await window.electronAPI!.saveData(STORAGE_KEY_TRANSACTIONS, []);
    await window.electronAPI!.saveData(STORAGE_KEY_RECURRING, []);
    // We optionally keep categories, but let's reset them too if "All" implies factory reset
    await window.electronAPI!.saveData(STORAGE_KEY_CATEGORIES, null); 
  } else {
    localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEY_RECURRING);
    localStorage.removeItem(STORAGE_KEY_CATEGORIES);
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Check for due recurring transactions and add them
export const processRecurringTransactions = (
  transactions: Transaction[], 
  recurring: RecurringConfig[]
): { updatedTransactions: Transaction[], updatedRecurring: RecurringConfig[], addedCount: number } => {
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let newTransactions = [...transactions];
  let newRecurring = [...recurring];
  let addedCount = 0;

  newRecurring = newRecurring.map(config => {
    if (!config.active) return config;

    // Determine if we need to add a transaction for this month
    let shouldAdd = false;
    
    // Logic: check if lastProcessedDate is in a previous month OR null
    if (!config.lastProcessedDate) {
      // Never processed, check if today is past the dayOfMonth
      if (today.getDate() >= config.dayOfMonth) {
        shouldAdd = true;
      }
    } else {
      const lastDate = parseToDate(config.lastProcessedDate);
      // If last processed was previous month (or earlier) AND today is past dayOfMonth
      if (
        (lastDate.getMonth() !== currentMonth || lastDate.getFullYear() !== currentYear) &&
        today.getDate() >= config.dayOfMonth
      ) {
        shouldAdd = true;
      }
    }

    if (shouldAdd) {
      const dateObj = new Date(currentYear, currentMonth, config.dayOfMonth);
      const newDateStr = formatDateToDDMMYYYY(dateObj);
      const newTx: Transaction = {
        id: generateId(),
        date: newDateStr,
        amount: config.amount,
        type: config.type,
        category: config.category,
        description: `${config.description} (${TRANSLATIONS.recurring})`,
        isRecurring: true
      };
      newTransactions.push(newTx);
      addedCount++;
      return { ...config, lastProcessedDate: newTx.date };
    }
    
    return config;
  });

  return { updatedTransactions: newTransactions, updatedRecurring: newRecurring, addedCount };
};