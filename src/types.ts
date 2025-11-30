export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Frequency {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface Transaction {
  id: string;
  date: string; // string in DD-MM-YYYY format
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  isRecurring?: boolean;
}

export interface RecurringConfig {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  dayOfMonth: number; // 1-31
  lastProcessedDate?: string;
  active: boolean;
}

export interface CategoryData {
  income: string[];
  expense: string[];
}

// Investment Types
export enum AssetType {
  STOCK = 'STOCK',
  REAL_ESTATE = 'REAL_ESTATE',
  CRYPTO = 'CRYPTO',
  OTHER = 'OTHER'
}

export interface InvestmentTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'BUY' | 'SELL';
  assetType: AssetType;
  symbol: string; // e.g., AAPL or "Main St Apt"
  name?: string;
  quantity: number;
  pricePerUnit: number; // Price per share
  currency: 'USD' | 'ILS'; // Original currency
  fees?: number;
}

export interface AppState {
  transactions: Transaction[];
  recurring: RecurringConfig[];
  categories: CategoryData;
}

export type Theme = 'light' | 'dark';

export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
}

// Electron Interface
export interface IElectronAPI {
  saveData: (key: string, data: any) => Promise<boolean>;
  getData: (key: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}