// Service to handle Financial Data Fetching

const BASE_URL_FINNHUB = 'https://finnhub.io/api/v1';
const BASE_URL_FOREX = 'https://api.exchangerate-api.com/v4/latest/USD';

export interface CandleData {
  c: number[]; // Close prices
  h: number[]; // High
  l: number[]; // Low
  o: number[]; // Open
  s: string;   // Status
  t: number[]; // Timestamps
  v: number[]; // Volume
}

// Fetch Current Stock Price from Finnhub
export const fetchStockPrice = async (symbol: string, apiKey: string): Promise<number | null> => {
  if (!apiKey) return null;
  try {
    const response = await fetch(`${BASE_URL_FINNHUB}/quote?symbol=${symbol}&token=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.c; // 'c' is the current price property in Finnhub response
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

// Fetch Historical Candles
export const fetchStockCandles = async (symbol: string, resolution: string, from: number, to: number, apiKey: string): Promise<CandleData | null> => {
  if (!apiKey) return null;
  try {
    const response = await fetch(`${BASE_URL_FINNHUB}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.s === 'ok') {
      return data;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error);
    return null;
  }
};

// Fetch USD to ILS Rate (Free API)
export const fetchExchangeRate = async (): Promise<number | null> => {
  try {
    const response = await fetch(BASE_URL_FOREX);
    if (!response.ok) return null;
    const data = await response.json();
    return data.rates.ILS;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return null;
  }
};