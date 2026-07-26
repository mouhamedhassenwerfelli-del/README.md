import crypto from 'crypto';

const API_BASE = 'https://api.bybit.com';

export type BybitOrder = {
  order_id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  qty: string;
  order_type: string;
  price: string;
  time_in_force: string;
  take_profit?: string;
  stop_loss?: string;
  order_status: string;
};

export type BybitCandle = {
  open_time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type BybitAccountBalance = {
  available_balance: string;
  equity: string;
  usdt_equity: string;
};

export const getTimestamp = (): string => Date.now().toString();

export const buildSignature = (apiSecret: string, payload: string): string => {
  return crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');
};

export const sanitizeKey = (value: string | undefined): string => (value ?? '').trim();

export const safeFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Bybit API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
};

export const fetchServerTime = async () => {
  try {
    const result = await safeFetch(`${API_BASE}/v5/market/time`);
    const raw = result.result?.time_now;
    if (!raw) return Date.now().toString();
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 0) return Date.now().toString();
    return String(Math.round(seconds * 1000));
  } catch {
    return Date.now().toString();
  }
};

export const getBybitHeaders = async (
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body = ''
) => {
  const timestamp = await fetchServerTime();
  const payload = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const sign = buildSignature(apiSecret, payload);
  return {
    'Content-Type': 'application/json',
    'X-BAPI-API-KEY': sanitizeKey(apiKey),
    'X-BAPI-SIGN': sign,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': '5000',
    'X-BAPI-SIGN-TYPE': '2',
  };
};

export const fetchCandles = async (symbol: string, interval: string, limit = 100) => {
  const url = `${API_BASE}/v5/market/kline?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  const result = await safeFetch(url);
  const list = Array.isArray(result.result?.list) ? result.result.list : [];
  return list.map((item: any) => ({
    open_time: Number(item[0]),
    open: item[1],
    high: item[2],
    low: item[3],
    close: item[4],
    volume: item[5],
  }));
};

export const getAccountBalance = async (apiKey: string, apiSecret: string) => {
  const headers = await getBybitHeaders(apiKey, apiSecret);
  const url = `${API_BASE}/v5/account/wallet/balance`; 
  const body = JSON.stringify({ coin: 'USDT' });
  const result = await safeFetch(url, { method: 'POST', headers, body });
  const account = result.result?.list?.find((item: any) => item.coin === 'USDT');
  return {
    available_balance: account?.available_balance ?? '0',
    equity: account?.equity ?? '0',
    usdt_equity: account?.equity ?? '0',
  };
};

export const createOrder = async (
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: 'Buy' | 'Sell',
  qty: string,
  takeProfit?: string,
  stopLoss?: string
) => {
  const headers = await getBybitHeaders(apiKey, apiSecret);
  const url = `${API_BASE}/v5/order/create`;
  const body = JSON.stringify({
    symbol,
    side,
    order_type: 'Market',
    qty,
    time_in_force: 'PostOnly',
    take_profit: takeProfit,
    stop_loss: stopLoss,
    reduce_only: false,
    close_on_trigger: false,
  });
  const result = await safeFetch(url, { method: 'POST', headers, body });
  return result.result;
};
