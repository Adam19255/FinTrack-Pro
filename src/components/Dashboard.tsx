import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, CategoryData } from '../types';
import { TRANSLATIONS, DEFAULT_CHART_COLORS } from '../constants';
import { parseToDate, pad } from '../utils/dateUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Calendar, Filter, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { TransactionForm } from './TransactionForm';

interface DashboardProps {
  transactions: Transaction[];
  onSave: (t: Transaction) => void;
  categories: CategoryData;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, onSave, categories }) => {
  const t = (key: string) => TRANSLATIONS[key];
  
  // Date Filter State
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  // -1 represents "All Months" (Yearly View)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); 

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => parseToDate(t.date).getFullYear()));
    years.add(currentDate.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Filter transactions for Summary and Pie Chart based on selection
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = parseToDate(t.date);
      const yearMatch = d.getFullYear() === selectedYear;
      const monthMatch = selectedMonth === -1 || d.getMonth() === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Global Averages Calculation
  const averages = useMemo(() => {
    if (transactions.length === 0) return { income: 0, expense: 0 };
    
    const uniqueMonths = new Set(transactions.map(t => {
      const d = parseToDate(t.date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    }));
    const monthCount = Math.max(uniqueMonths.size, 1);

    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income: totalIncome / monthCount,
      expense: totalExpense / monthCount
    };
  }, [transactions]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // Data for Bar Chart (Trend for selected year)
  const monthlyTrendData = useMemo(() => {
    const data: Record<number, { name: string; income: number; expense: number }> = {};
    // Initialize 12 months
    for (let i = 0; i < 12; i++) {
      data[i] = { 
        name: new Date(selectedYear, i, 1).toLocaleDateString('he-IL', { month: 'short' }), 
        income: 0, 
        expense: 0 
      };
    }

    transactions
      .filter(t => parseToDate(t.date).getFullYear() === selectedYear)
      .forEach(t => {
        const month = parseToDate(t.date).getMonth();
        if (t.type === TransactionType.INCOME) data[month].income += t.amount;
        else data[month].expense += t.amount;
      });

    return Object.values(data);
  }, [transactions, selectedYear]);

  // Projection Data Logic
  const projectionData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return monthlyTrendData.map((data, index) => {
      // If we are looking at a past year, there is no projection, just actuals.
      if (selectedYear < currentYear) {
         return {
          name: data.name,
          actualIncome: data.income,
          actualExpense: data.expense,
          projectedIncome: 0,
          projectedExpense: 0
        };
      }
      
      // If we are looking at future year, it is all projection
      if (selectedYear > currentYear) {
         return {
          name: data.name,
          actualIncome: 0,
          actualExpense: 0,
          projectedIncome: averages.income,
          projectedExpense: averages.expense
        };
      }

      // Current year: split by month
      const isFuture = index > currentMonth;
      
      return {
        name: data.name,
        actualIncome: isFuture ? 0 : data.income,
        actualExpense: isFuture ? 0 : data.expense,
        projectedIncome: isFuture ? averages.income : 0,
        projectedExpense: isFuture ? averages.expense : 0
      };
    });
  }, [monthlyTrendData, averages, selectedYear]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort descending
  }, [filteredTransactions]);

  const Card = ({ title, amount, icon: Icon, colorClass, subtitle, isAlert }: any) => (
    <div className={`rounded-2xl p-6 shadow-sm border flex flex-col justify-between h-full transition-all
      ${isAlert 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
      }
    `}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-medium ${isAlert ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>{title}</p>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
        </div>
      </div>
      <div>
        <h3 className={`text-2xl font-bold tracking-tight ${isAlert ? 'text-red-700 dark:text-red-400' : ''}`} style={{direction: "ltr", textAlign: "end"}}>
          ₪ {amount.toLocaleString()}
        </h3>
        {subtitle && <p className={`text-xs mt-1 ${isAlert ? 'text-red-500 dark:text-red-300' : 'text-gray-400'}`}>{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">{t('welcome')}</h2>
          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
             <Calendar size={16} />
             {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1 border-l dark:border-gray-700">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('filter')}</span>
          </div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <option value={-1}>{t('allMonths')}</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleDateString('he-IL', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inline Add Transaction Form */}
      <TransactionForm onSave={onSave} categories={categories} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Balance Card (Dynamic) */}
        <Card 
          title={t('currentBalance')}
          amount={summary.balance}
          icon={summary.balance < 0 ? AlertTriangle : CheckCircle}
          colorClass={summary.balance < 0 ? "bg-red-500 text-red-600" : "bg-green-500 text-green-600"}
          subtitle={summary.balance < 0 ? t('overdraft') : t('positiveBalance')}
          isAlert={summary.balance < 0}
        />
        <Card 
          title={t('totalIncome')} 
          amount={summary.income} 
          icon={TrendingUp} 
          colorClass="bg-green-500 text-green-600" 
          subtitle={selectedMonth === -1 ? `${t('total')} ${selectedYear} ` : undefined}
        />
        <Card 
          title={t('totalExpenses')} 
          amount={summary.expense} 
          icon={TrendingDown} 
          colorClass="bg-red-500 text-red-600" 
          subtitle={selectedMonth === -1 ? `${t('total')} ${selectedYear}` : undefined}
        />
         <Card 
          title={t('averageMonthlyIncome')} 
          amount={averages.income} 
          icon={Wallet} 
          colorClass="bg-blue-500 text-blue-600" 
          subtitle={t('allMonths')}
        />
        <Card 
          title={t('averageMonthlyExpense')} 
          amount={averages.expense} 
          icon={Wallet} 
          colorClass="bg-orange-500 text-orange-600" 
          subtitle={t('allMonths')}
        />
      </div>

      {/* Yearly Trend Chart - Full Width */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp size={20} className="text-gray-500" />
            {t('monthlyTrend')} ({selectedYear})
          </h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  color: '#1f2937', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#1f2937' }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="income" name={t('income')} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="expense" name={t('expense')} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Pie Chart & Category Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold">
               {t('categoryBreakdown')}
               <span className="text-sm font-normal text-gray-500 ml-2 rtl:mr-2">
                 ({selectedMonth === -1 ? t('allYears').replace('Years', 'Months') : new Date(0, selectedMonth).toLocaleDateString('he-IL', { month: 'long' })})
               </span>
             </h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      color: '#1f2937', 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: '#1f2937' }}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400">
                <p>{t('noData')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Categories List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <h3 className="text-lg font-bold mb-4">{t('topCategory')}</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {categoryData.length > 0 ? (
              categoryData.slice(0, 6).map((item, index) => {
                const percentage = summary.expense > 0 ? (item.value / summary.expense) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length] }}></div>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{item.value.toLocaleString()} ₪</span>
                  </div>
                );
              })
            ) : (
               <div className="text-center text-gray-400 py-10">
                <p>{t('noData')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

       {/* Projection Chart */}
       <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart2 size={20} className="text-purple-500" />
            {t('yearlyProjection')} ({selectedYear})
          </h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  color: '#1f2937', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: '#1f2937' }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
              <Bar dataKey="actualIncome" stackId="income" fill="#10b981" name={t('income')} radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="projectedIncome" stackId="income" fill="#6ee7b7" name={t('projectedIncome')} radius={[4, 4, 0, 0]} barSize={20} />
              
              <Bar dataKey="actualExpense" stackId="expense" fill="#ef4444" name={t('expense')} radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="projectedExpense" stackId="expense" fill="#fca5a5" name={t('projectedExpense')} radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};