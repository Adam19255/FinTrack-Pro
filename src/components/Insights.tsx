import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

export const Insights: React.FC<Props> = ({ transactions }) => {
  const t = (key: string) => TRANSLATIONS[key];

  const stats = useMemo(() => {
    if (transactions.length === 0) return null;

    // Get unique months
    const months = new Set(transactions.map(t => t.date.substring(0, 7)));
    const monthCount = Math.max(months.size, 1);

    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    
    // Find top expenses (Irregular/High)
    const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
    const topExpenses = sortedExpenses.slice(0, 5);

    // Calculate category totals
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

    // Savings rate
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    return {
      avgIncome: totalIncome / monthCount,
      avgExpense: totalExpense / monthCount,
      topExpenses,
      topCategory,
      savingsRate,
      projectedYearlySavings: (savings / monthCount) * 12
    };
  }, [transactions]);

  if (!stats) {
    return (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
        <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="text-blue-500" />
          {t('insights')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('analysisPeriod')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Averages */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-500" size={20} />
            {t('averageMonthlyIncome')}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.avgIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪</p>
          <p className="text-sm text-gray-500 mt-2">{t('yearlyProjection')}: {(stats.avgIncome * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingDown className="text-red-500" size={20} />
            {t('averageMonthlyExpense')}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.avgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪</p>
          <p className="text-sm text-gray-500 mt-2">{t('yearlyProjection')}: {(stats.avgExpense * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪</p>
        </div>

        {/* Savings Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <PieChart className="text-purple-500" size={20} />
            {t('savingsRate')}
          </h3>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-bold ${stats.savingsRate >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{direction:"ltr"}}>
              {stats.savingsRate.toFixed(1)}%
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-2" style={{direction:"ltr", textAlign:"end"}}>
            {stats.projectedYearlySavings > 0 ? '+' : ''} ₪ {stats.projectedYearlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}  / {t('yearly')}
          </p>
        </div>

         {/* Top Category */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <PieChart className="text-orange-500" size={20} />
            {t('topCategory')}
          </h3>
          {stats.topCategory ? (
            <div>
              <p className="text-3xl font-bold">{stats.topCategory[0]}</p>
              <p className="text-sm text-gray-500 mt-2" >
                {stats.topCategory[1].toLocaleString()} ₪ {t('total')}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">{t('noData')}</p>
          )}
        </div>
      </div>

      {/* Irregular / High Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="text-yellow-500" size={20} />
          {t('highestExpense')} / {t('irregularExpenses')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('category')}</th>
                <th className="px-4 py-3">{t('description')}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{t('amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.topExpenses.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">{t.date}</td>
                  <td className="px-4 py-3">{t.category}</td>
                  <td className="px-4 py-3">{t.description}</td>
                  <td className="px-4 py-3 font-bold text-red-600 text-right rtl:text-left">
                    {t.amount.toLocaleString()} ₪
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};