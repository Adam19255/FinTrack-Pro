import React, { useState, useMemo, useEffect } from 'react';
import { InvestmentTransaction, AssetType, Transaction, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { generateId } from '../services/storageService';
import { fetchStockPrice, fetchExchangeRate, fetchStockCandles } from '../services/financeService';
import { Plus, TrendingUp, ChevronDown, ChevronUp, History, Edit2, Wallet, RefreshCw, Trash2, Settings, Key, LineChart as ChartIcon, Landmark } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isoToDDMMYYYY, formatDateToDDMMYYYY, parseToDate } from '../utils/dateUtils';

interface Props {
  investments: InvestmentTransaction[];
  transactions: Transaction[]; 
  onSave: (investment: InvestmentTransaction) => void;
  onDelete: (id: string) => void;
  onSaveTransaction: (transaction: Transaction) => void;
}

interface GroupedAsset {
  symbol: string;
  name?: string;
  assetType: AssetType;
  quantity: number;
  avgBuyPrice: number; // In USD
  totalInvested: number; // In USD
  currentPrice?: number; // In USD
  transactions: InvestmentTransaction[];
}

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export const Investments: React.FC<Props> = ({ investments, transactions, onSave, onDelete, onSaveTransaction }) => {
  const t = (key: string) => TRANSLATIONS[key];
  const { showToast } = useToast();
  
  // Settings State
  const [exchangeRate, setExchangeRate] = useState<number>(3.65);
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'ILS'>('USD');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finnhub_api_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Chart State
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [benchmarkSymbol, setBenchmarkSymbol] = useState('SPY');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InvestmentTransaction>>({
    type: 'BUY',
    assetType: AssetType.STOCK,
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
  });

  // Funds Modal State
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [fundsAmount, setFundsAmount] = useState<string>('');
  const [fundsDate, setFundsDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Sell Modal State
  const [sellModalSymbol, setSellModalSymbol] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');

  // Expanded groups state
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  // Init Data
  useEffect(() => {
    const loadRates = async () => {
      const rate = await fetchExchangeRate();
      if (rate) setExchangeRate(rate);
    };
    loadRates();
  }, []);

  // Update chart when time range or investments change
  useEffect(() => {
    if (apiKey && investments.length > 0) {
      generateChartData();
    }
  }, [timeRange, benchmarkSymbol, investments, apiKey]);

  const handleSaveApiKey = () => {
    localStorage.setItem('finnhub_api_key', apiKey);
    setIsSettingsOpen(false);
    showToast(t('actionSuccess'), 'success');
  };

  const refreshPrices = async () => {
    if (!apiKey) {
      showToast('Please set API Key first', 'error');
      return;
    }
    setIsLoadingPrices(true);
    const symbols = new Set(investments.filter(i => i.assetType === AssetType.STOCK).map(i => i.symbol));
    const newPrices: Record<string, number> = {};
    
    for (const sym of symbols) {
      const price = await fetchStockPrice(sym, apiKey);
      if (price !== null) {
        newPrices[sym] = price;
      }
    }
    setPrices(prev => ({ ...prev, ...newPrices }));
    setIsLoadingPrices(false);
    showToast(t('actionSuccess'), 'success');
  };

  const generateChartData = async () => {
    setIsLoadingChart(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      let startTime = now;
      let resolution = 'D';

      switch (timeRange) {
        case '1D': startTime = now - 86400; resolution = '60'; break; // Intraday usually requires premium or low res
        case '5D': startTime = now - (5 * 86400); resolution = '60'; break;
        case '1M': startTime = now - (30 * 86400); resolution = 'D'; break;
        case '6M': startTime = now - (180 * 86400); resolution = 'D'; break;
        case 'YTD': startTime = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000); resolution = 'D'; break;
        case '1Y': startTime = now - (365 * 86400); resolution = 'D'; break;
        case '3Y': startTime = now - (3 * 365 * 86400); resolution = 'D'; break;
        case '5Y': startTime = now - (5 * 365 * 86400); resolution = 'W'; break;
        case 'ALL': startTime = now - (10 * 365 * 86400); resolution = 'W'; break; // Cap at 10 years
      }

      // 1. Get Benchmark Data
      const benchmarkData = await fetchStockCandles(benchmarkSymbol, resolution, startTime, now, apiKey);
      
      // 2. Get Data for all owned stocks
      const uniqueSymbols = Array.from(new Set(investments.filter(i => i.assetType === AssetType.STOCK).map(i => i.symbol)));
      const stockDataMap: Record<string, any> = {};
      
      await Promise.all(uniqueSymbols.map(async (sym) => {
        const data = await fetchStockCandles(sym, resolution, startTime, now, apiKey);
        if (data) stockDataMap[sym] = data;
      }));

      // 3. Reconstruct Portfolio History
      if (!benchmarkData || !benchmarkData.t) {
        setIsLoadingChart(false);
        return;
      }

      const historyPoints: any[] = [];
      const timestamps = benchmarkData.t;

      timestamps.forEach((ts, index) => {
        const date = new Date(ts * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        // Calculate Portfolio Value at this timestamp
        let portfolioValue = 0;
        let totalInvested = 0;

        uniqueSymbols.forEach(sym => {
          // Get price at this time
          const candles = stockDataMap[sym];
          let price = 0;
          if (candles) {
             // Find closest candle index
             // Since timestamps might not match exactly across stocks, we assume daily align
             // Simplification: Use the price at the same index if available, or closest previous
             price = candles.c[index] || (index > 0 ? candles.c[index-1] : 0);
          }

          // Calculate quantity held at this date
              const txs = investments.filter(i => i.symbol === sym && parseToDate(i.date).getTime() <= date.getTime());
          const qty = txs.reduce((acc, curr) => curr.type === 'BUY' ? acc + curr.quantity : acc - curr.quantity, 0);
          
          if (qty > 0 && price > 0) {
            portfolioValue += qty * price;
          }
        });

        // Calculate Invested Capital at this date (Cash Flow)
        // This is needed to calculate Return %
          const historicTxs = investments.filter(i => parseToDate(i.date).getTime() <= date.getTime());
        historicTxs.forEach(tx => {
           const val = tx.quantity * tx.pricePerUnit * (tx.currency === 'ILS' ? (1/exchangeRate) : 1);
           if (tx.type === 'BUY') totalInvested += val;
           else totalInvested -= val;
        });

        // Calculate Percentages
        // Portfolio % Return = ((Current Value - Invested) / Invested) * 100
        const portfolioReturn = totalInvested > 0 ? ((portfolioValue - totalInvested) / totalInvested) * 100 : 0;
        
        // Benchmark % Return (normalized to start of chart or start of data)
        const benchmarkStartPrice = benchmarkData.c[0];
        const benchmarkReturn = ((benchmarkData.c[index] - benchmarkStartPrice) / benchmarkStartPrice) * 100;

        historyPoints.push({
          date: dateStr,
          portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
          benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
          portfolioValue: parseFloat(portfolioValue.toFixed(2))
        });
      });

      setChartData(historyPoints);

    } catch (e) {
      console.error("Error generating chart", e);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Helper: Convert to Display Currency
  const formatMoney = (amountInUSD: number) => {
    if (displayCurrency === 'USD') {
      return `$${amountInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `₪${(amountInUSD * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // 1. Calculate Available Budget
  const budgetStats = useMemo(() => {
    const totalAllocatedILS = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.category === 'השקעה')
      .reduce((sum, t) => sum + t.amount, 0);

    let totalInvestedILS = 0;
    
    investments.forEach(inv => {
      const txTotal = inv.quantity * inv.pricePerUnit;
      const txTotalILS = inv.currency === 'ILS' ? txTotal : txTotal * exchangeRate;

      if (inv.type === 'BUY') {
        totalInvestedILS += txTotalILS;
      } else {
        totalInvestedILS -= txTotalILS;
      }
    });

    return {
      allocated: totalAllocatedILS,
      invested: totalInvestedILS,
      available: totalAllocatedILS - totalInvestedILS
    };
  }, [transactions, investments, exchangeRate]);

  // 2. Grouping Logic (Portfolio)
  const portfolio = useMemo(() => {
    const groups: Record<string, GroupedAsset> = {};

    const sortedInvestments = [...investments].sort((a, b) => parseToDate(a.date).getTime() - parseToDate(b.date).getTime());

    sortedInvestments.forEach(tx => {
      if (!groups[tx.symbol]) {
        groups[tx.symbol] = {
          symbol: tx.symbol,
          name: tx.name,
          assetType: tx.assetType,
          quantity: 0,
          avgBuyPrice: 0,
          totalInvested: 0, 
          transactions: []
        };
      }

      const group = groups[tx.symbol];
      group.transactions.push(tx);

      // Normalize to USD
      const priceInUSD = tx.currency === 'USD' ? tx.pricePerUnit : tx.pricePerUnit / exchangeRate;

      if (tx.type === 'BUY') {
        const currentTotalValueUSD = group.quantity * group.avgBuyPrice;
        const newTxValueUSD = tx.quantity * priceInUSD;
        
        const totalQty = group.quantity + tx.quantity;
        group.quantity = totalQty;
        
        if (totalQty > 0) {
            group.avgBuyPrice = (currentTotalValueUSD + newTxValueUSD) / totalQty;
        }
        
        group.totalInvested += newTxValueUSD;
      } else {
        const costBasisSoldUSD = tx.quantity * group.avgBuyPrice;
        group.totalInvested -= costBasisSoldUSD;
        group.quantity -= tx.quantity;
      }
    });

    // Attach current price if exists
    Object.values(groups).forEach(g => {
        if (prices[g.symbol]) {
            g.currentPrice = prices[g.symbol];
        }
    });

    return Object.values(groups); 
  }, [investments, exchangeRate, prices]);

  // Group by Asset Type
  const assetsByType = useMemo(() => {
    const byType: Record<string, GroupedAsset[]> = {
      [AssetType.STOCK]: [],
      [AssetType.REAL_ESTATE]: [],
      [AssetType.CRYPTO]: [],
      [AssetType.OTHER]: []
    };

    portfolio.forEach(asset => {
      if (byType[asset.assetType]) {
        byType[asset.assetType].push(asset);
      }
    });
    return byType;
  }, [portfolio]);


  const handleEditTransaction = (tx: InvestmentTransaction) => {
    setFormData(tx);
    setIsFormOpen(true);
  };

  const handleQuickBuy = (asset: GroupedAsset) => {
    setFormData({
      type: 'BUY',
      assetType: asset.assetType,
      symbol: asset.symbol,
      name: asset.name,
      currency: 'USD', // Default to USD or could attempt to infer last currency
      date: isoToDDMMYYYY(new Date().toISOString().split('T')[0]),
      quantity: 0,
      pricePerUnit: 0
    });
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
      if(window.confirm(t('deleteItemConfirm'))) {
          onDelete(id);
      }
  };

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (fundsAmount && Number(fundsAmount) > 0) {
        onSaveTransaction({
            id: generateId(),
            date: isoToDDMMYYYY(fundsDate),
            amount: Number(fundsAmount),
            type: TransactionType.EXPENSE,
            category: 'השקעה',
            description: t('depositToInvestments'),
            isRecurring: false
        });
        setIsFundsModalOpen(false);
        setFundsAmount('');
        showToast(t('actionSuccess'), 'success');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.symbol && formData.quantity && formData.pricePerUnit && formData.date && formData.type && formData.assetType) {
      onSave({
        id: formData.id || generateId(),
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        type: formData.type,
        assetType: formData.assetType,
        quantity: Number(formData.quantity),
        pricePerUnit: Number(formData.pricePerUnit),
        currency: formData.currency || 'USD',
        date: isoToDDMMYYYY(formData.date as string)
      });
      setIsFormOpen(false);
      // Reset
      setFormData({
        type: 'BUY',
        assetType: AssetType.STOCK,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        name: '',
        quantity: 0,
        pricePerUnit: 0
      });
      showToast(t('actionSuccess'), 'success');
    }
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellModalSymbol && sellQuantity && sellPrice) {
        const asset = portfolio.find(p => p.symbol === sellModalSymbol);
        
        onSave({
            id: generateId(),
            symbol: sellModalSymbol,
            type: 'SELL',
            assetType: asset?.assetType || AssetType.STOCK,
            quantity: Number(sellQuantity),
            pricePerUnit: Number(sellPrice),
            currency: displayCurrency, 
            date: formatDateToDDMMYYYY(new Date())
        });
        setSellModalSymbol(null);
        setSellQuantity('');
        setSellPrice('');
        showToast(t('actionSuccess'), 'success');
    }
  };

  const toggleExpand = (symbol: string) => {
    const newSet = new Set(expandedSymbols);
    if (newSet.has(symbol)) newSet.delete(symbol);
    else newSet.add(symbol);
    setExpandedSymbols(newSet);
  };

  const AssetGroup = ({ type, title, assets }: { type: AssetType, title: string, assets: GroupedAsset[] }) => {
    if (assets.length === 0) return null;

    // Calculate Group Total Value
    const groupMarketValueUSD = assets.reduce((sum, asset) => {
        const price = asset.currentPrice || asset.avgBuyPrice;
        return sum + (asset.quantity * price);
    }, 0);

    const groupTotalCostUSD = assets.reduce((sum, asset) => sum + (asset.quantity * asset.avgBuyPrice), 0);
    const groupReturn = groupTotalCostUSD > 0 ? ((groupMarketValueUSD - groupTotalCostUSD) / groupTotalCostUSD) * 100 : 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
            {type === AssetType.STOCK && <TrendingUp className="text-blue-500" />}
            {type === AssetType.REAL_ESTATE && <TrendingUp className="text-green-500" />} 
            {type === AssetType.CRYPTO && <TrendingUp className="text-purple-500" />}
            {title}
            </h3>
            
            <div className="flex items-center gap-4">
                <div className={`text-sm font-medium px-3 py-1 rounded-lg ${groupReturn >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    <span className="mr-2">{t('totalReturn')}:</span>
                    <span className="font-bold" style={{direction: 'ltr'}}>{groupReturn.toFixed(2)}%</span>
                </div>
                <div className="text-sm font-medium bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                    <span className="text-gray-500 dark:text-gray-400 mr-2">{t('marketValue')}:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{formatMoney(groupMarketValueUSD)}</span>
                </div>
            </div>
        </div>
        
        <div className="space-y-4">
          {assets.map(asset => {
             const marketValueUSD = asset.quantity * (asset.currentPrice || asset.avgBuyPrice);
             const costBasisUSD = asset.quantity * asset.avgBuyPrice;
             const totalReturn = marketValueUSD - costBasisUSD;
             const returnPct = costBasisUSD > 0 ? (totalReturn / costBasisUSD) * 100 : 0;

             return (
            <div key={asset.symbol} className="border dark:border-gray-700 rounded-xl overflow-hidden">
               {/* Header Row */}
               <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(asset.symbol)}>
                     <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        {expandedSymbols.has(asset.symbol) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                     </button>
                     <div>
                        <h4 className="font-bold text-lg">{asset.symbol}</h4>
                        {asset.name && <p className="text-sm text-gray-500">{asset.name}</p>}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                     <div>
                        <p className="text-xs text-gray-500">{t('shares')}</p>
                        <p className="font-medium">{asset.quantity.toLocaleString(undefined, {maximumFractionDigits: 6})}</p>
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">{t('avgPrice')}</p>
                        <p className="font-medium">{formatMoney(asset.avgBuyPrice)}</p>
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">{t('currentPrice')}</p>
                        <p className="font-medium">
                            {asset.currentPrice ? formatMoney(asset.currentPrice) : '-'}
                        </p>
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">{t('marketValue')}</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">
                            {formatMoney(marketValueUSD)}
                        </p>
                     </div>
                     <div className="flex flex-col items-end">
                        <p className={`text-sm font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{direction: 'ltr'}}>
                            {totalReturn >= 0 ? '+' : ''}{formatMoney(totalReturn)}
                        </p>
                        <p className={`text-xs ${returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{direction: 'ltr'}}>
                            {returnPct.toFixed(2)}%
                        </p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handleQuickBuy(asset)}
                        className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        title={t('buy')}
                    >
                        <Plus size={16} />
                    </button>
                    {asset.quantity > 0 && (
                        <button 
                        onClick={() => setSellModalSymbol(asset.symbol)}
                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                        {t('sell')}
                    </button>
                    )}
                  </div>
               </div>

               {/* History / Transactions Dropdown */}
               {expandedSymbols.has(asset.symbol) && (
                 <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h5 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-500">
                        <History size={14} />
                        {t('history')}
                    </h5>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left rtl:text-right">
                            <thead className="text-gray-500 bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-3 py-2">{t('date')}</th>
                                    <th className="px-3 py-2">{t('actions')}</th>
                                    <th className="px-3 py-2">{t('quantity')}</th>
                                    <th className="px-3 py-2">{t('pricePerUnit')}</th>
                                    <th className="px-3 py-2">{t('total')}</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {asset.transactions.sort((a,b) => parseToDate(b.date).getTime() - parseToDate(a.date).getTime()).map(tx => (
                                    <tr key={tx.id}>
                                        <td className="px-3 py-2">{tx.date}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {tx.type === 'BUY' ? t('bought') : t('sold')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{tx.quantity.toLocaleString(undefined, {maximumFractionDigits: 6})}</td>
                                        <td className="px-3 py-2">
                                            {tx.currency === 'USD' ? '$' : '₪'}{tx.pricePerUnit.toLocaleString(undefined, {maximumFractionDigits: 4})}
                                        </td>
                                        <td className="px-3 py-2 font-medium">
                                            {tx.currency === 'USD' ? '$' : '₪'}{(tx.quantity * tx.pricePerUnit).toLocaleString(undefined, {maximumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-2 text-right rtl:text-left flex gap-1 justify-end">
                                            <button onClick={() => handleEditTransaction(tx)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
               )}
            </div>
          )})}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-bold">{t('investments')}</h2>
            
            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                
                {/* API Settings Toggle */}
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
                    title={t('settings')}
                >
                    <Settings size={18} />
                    {!apiKey && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>

                {/* Exchange Rate Input */}
                <div className="flex items-center gap-2 px-2 border-r dark:border-gray-700">
                    <label className="text-xs text-gray-500 font-medium">{t('exchangeRate')}</label>
                    <input 
                        type="number" 
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                        step="0.01"
                        className="w-16 bg-gray-50 dark:bg-gray-700 rounded px-1 py-0.5 text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Display Currency Toggle */}
                <div className="flex items-center gap-2 px-2 border-r dark:border-gray-700">
                    <span className="text-xs text-gray-500 font-medium">{t('displayCurrency')}</span>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                        <button 
                            onClick={() => setDisplayCurrency('USD')}
                            className={`px-2 py-0.5 text-xs rounded font-bold transition-all ${displayCurrency === 'USD' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            $
                        </button>
                        <button 
                            onClick={() => setDisplayCurrency('ILS')}
                            className={`px-2 py-0.5 text-xs rounded font-bold transition-all ${displayCurrency === 'ILS' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            ₪
                        </button>
                    </div>
                </div>

                <button 
                    onClick={refreshPrices}
                    disabled={isLoadingPrices}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={t('refreshData')}
                >
                    <RefreshCw size={18} className={isLoadingPrices ? 'animate-spin' : ''} />
                </button>

                <button 
                    onClick={() => setIsFundsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm"
                >
                    <Landmark size={18} />
                    {t('addFunds')}
                </button>

                <button 
                  onClick={() => {
                    setFormData({
                      type: 'BUY',
                      assetType: AssetType.STOCK,
                      currency: 'USD',
                      date: new Date().toISOString().split('T')[0],
                      symbol: '',
                      name: '',
                      quantity: 0,
                      pricePerUnit: 0
                    });
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm"
                >
                  <Plus size={18} />
                  {t('addInvestment')}
                </button>
            </div>
        </div>

        {/* API Settings Panel */}
        {isSettingsOpen && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-fade-in">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Key size={16} />
                    {t('apiKey')}
                </h4>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t('apiKeyPlaceholder')}
                        className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-sm"
                    />
                    <button onClick={handleSaveApiKey} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">{t('save')}</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Get your free API key from <a href="https://finnhub.io" target="_blank" rel="noreferrer" className="text-blue-500 underline">finnhub.io</a> to enable real-time stock prices.</p>
            </div>
        )}

        {/* Budget / Available Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Wallet size={20} className="text-blue-500" />
                    <span className="text-sm font-medium">{t('allocatedBudget')}</span>
                </div>
                <p className="text-2xl font-bold">{budgetStats.allocated.toLocaleString()} ₪</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <TrendingUp size={20} className="text-purple-500" />
                    <span className="text-sm font-medium">{t('totalInvested')}</span>
                </div>
                <p className="text-2xl font-bold">{budgetStats.invested.toLocaleString()} ₪</p>
            </div>

            <div className={`rounded-2xl p-6 shadow-sm border flex flex-col justify-between
                ${budgetStats.available >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}
            `}>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium ${budgetStats.available >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {t('availableToInvest')}
                    </span>
                </div>
                <p className={`text-2xl font-bold ${budgetStats.available >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} style={{direction: 'ltr', alignSelf: 'flex-start'}}>
                    ₪ {budgetStats.available.toLocaleString()} 
                </p>
            </div>
        </div>

        {/* CHART SECTION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <ChartIcon size={20} className="text-blue-500" />
                    <h3 className="text-lg font-bold">{t('portfolioPerformance')}</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <span className="text-xs text-gray-500 px-2">{t('benchmark')}</span>
                        <select 
                            value={benchmarkSymbol} 
                            onChange={(e) => setBenchmarkSymbol(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none text-gray-700 dark:text-gray-200 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-200"
                        >
                            <option value="SPY">S&P 500 (SPY)</option>
                            <option value="QQQ">Nasdaq (QQQ)</option>
                            <option value="DIA">Dow Jones (DIA)</option>
                            <option value="VOO">Vanguard S&P 500 (VOO)</option>
                            <option value="VT">Vanguard Total World (VT)</option>
                            <option value="VTI">Vanguard Total Stock (VTI)</option>
                            <option value="IVV">iShares Core S&P 500 (IVV)</option>
                            <option value="IWM">Russell 2000 (IWM)</option>
                            <option value="ARKK">ARK Innovation (ARKK)</option>
                            <option value="SMH">Semiconductor (SMH)</option>
                        </select>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
                        {['1D', '5D', '1M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r as TimeRange)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                    timeRange === r 
                                    ? 'bg-white dark:bg-gray-600 shadow text-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {t(`range${r}`) || r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-72 w-full">
                {isLoadingChart ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin mb-2" />
                    </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getDate()}/${d.getMonth()+1}`;
                                }}
                                fontSize={12}
                                stroke="#9ca3af"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                fontSize={12}
                                stroke="#9ca3af"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e5e7eb',
                                    color: '#1f2937'
                                }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                formatter={(val: number) => [`${val.toFixed(2)}%`, '']}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="portfolioReturn" 
                                name={t('portfolio')} 
                                stroke="#3b82f6" 
                                strokeWidth={2} 
                                dot={false} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="benchmarkReturn" 
                                name={benchmarkSymbol} 
                                stroke="#9ca3af" 
                                strokeWidth={2} 
                                strokeDasharray="5 5" 
                                dot={false} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        {apiKey ? t('noData') : "Enter API Key to view chart"}
                    </div>
                )}
            </div>
        </div>

        {/* Sell Modal */}
        {sellModalSymbol && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
               <h3 className="text-xl font-bold mb-4">{t('sell')} {sellModalSymbol}</h3>
               <form onSubmit={handleSellSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">{t('quantity')}</label>
                    <input 
                        type="number" 
                        required
                        step="0.00000001"
                        value={sellQuantity}
                        onChange={e => setSellQuantity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">{t('pricePerUnit')}</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            required
                            step="0.00000001"
                            value={sellPrice}
                            onChange={e => setSellPrice(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="absolute right-3 top-2 text-gray-400 text-sm font-bold">{displayCurrency === 'USD' ? '$' : '₪'}</span>
                    </div>
                 </div>
                 <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setSellModalSymbol(null)} className="px-4 py-2 text-gray-500">{t('cancel')}</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('sell')}</button>
                 </div>
               </form>
             </div>
           </div>
        )}

        {/* Add Funds Modal */}
        {isFundsModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                 <Landmark size={22} className="text-green-600" />
                 {t('addFunds')}
               </h3>
               <form onSubmit={handleAddFunds} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">{t('amount')} (₪)</label>
                    <input 
                        type="number" 
                        required
                        step="0.01"
                        min="0.01"
                        value={fundsAmount}
                        onChange={e => setFundsAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        placeholder="0.00"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">{t('date')}</label>
                    <input 
                        type="date" 
                        required
                        value={fundsDate}
                        onChange={e => setFundsDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    />
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsFundsModalOpen(false)} className="px-4 py-2 text-gray-500">{t('cancel')}</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">{t('save')}</button>
                 </div>
               </form>
             </div>
           </div>
        )}

        {/* Add/Edit Modal */}
        {isFormOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fade-in">
               <h3 className="text-xl font-bold mb-4">{formData.id ? t('edit') : t('addInvestment')}</h3>
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('type')}</label>
                        <select 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        >
                            <option value="BUY">{t('buy')}</option>
                            <option value="SELL">{t('sell')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('assetType')}</label>
                        <select 
                            value={formData.assetType} 
                            onChange={e => setFormData({...formData, assetType: e.target.value as any})}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        >
                            <option value={AssetType.STOCK}>{t('stock')}</option>
                            <option value={AssetType.REAL_ESTATE}>{t('realEstate')}</option>
                            <option value={AssetType.CRYPTO}>{t('crypto')}</option>
                            <option value={AssetType.OTHER}>{t('other')}</option>
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium mb-1">{t('symbol')}</label>
                    <input 
                        type="text" 
                        required
                        placeholder={t('symbolPlaceholder')}
                        value={formData.symbol || ''}
                        onChange={e => setFormData({...formData, symbol: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('quantity')}</label>
                        <input 
                            type="number" 
                            step="0.00000001"
                            required
                            value={formData.quantity || ''}
                            onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('pricePerUnit')}</label>
                        <input 
                            type="number" 
                            step="0.00000001"
                            required
                            value={formData.pricePerUnit || ''}
                            onChange={e => setFormData({...formData, pricePerUnit: parseFloat(e.target.value)})}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('currency')}</label>
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, currency: 'USD'})}
                                className={`flex-1 py-1 text-xs font-bold rounded ${formData.currency === 'USD' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                $ USD
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, currency: 'ILS'})}
                                className={`flex-1 py-1 text-xs font-bold rounded ${formData.currency === 'ILS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                            >
                                ₪ ILS
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('date')}</label>
                        <input 
                            type="date" 
                            required
                            value={formData.date || ''}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => {
                      setIsFormOpen(false);
                      setFormData({
                        type: 'BUY',
                        assetType: AssetType.STOCK,
                        currency: 'USD',
                        date: new Date().toISOString().split('T')[0],
                        symbol: '',
                        name: '',
                        quantity: 0,
                        pricePerUnit: 0
                      });
                    }} className="px-4 py-2 text-gray-500">{t('cancel')}</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('save')}</button>
                 </div>
               </form>
             </div>
           </div>
        )}

        {/* Asset Groups */}
        <AssetGroup type={AssetType.STOCK} title={t('stock')} assets={assetsByType[AssetType.STOCK]} />
        <AssetGroup type={AssetType.REAL_ESTATE} title={t('realEstate')} assets={assetsByType[AssetType.REAL_ESTATE]} />
        <AssetGroup type={AssetType.CRYPTO} title={t('crypto')} assets={assetsByType[AssetType.CRYPTO]} />
        <AssetGroup type={AssetType.OTHER} title={t('other')} assets={assetsByType[AssetType.OTHER]} />
        
        {portfolio.length === 0 && (
            <div className="text-center py-20 text-gray-500">
                <p>{t('noData')}</p>
            </div>
        )}
    </div>
  );
};