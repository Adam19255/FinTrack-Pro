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