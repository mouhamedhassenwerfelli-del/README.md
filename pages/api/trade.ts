import type { NextApiRequest, NextApiResponse } from 'next';
import { createOrder, getAccountBalance, sanitizeKey } from '../../lib/bybit';
import { decisionFromCandles, supportedIntervals, supportedSymbols } from '../../lib/strategy';
import { fetchCandles } from '../../lib/bybit';
import { publishSse } from '../../lib/broadcast';

const getTradeSize = (balance: number) => {
  const size = Math.max(1, Math.floor(balance * 0.015));
  return size.toString();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { symbol, interval } = req.body as { symbol: string; interval: string };

  if (!supportedSymbols.includes(symbol)) {
    res.status(400).json({ error: 'رمز تداول غير مدعوم.' });
    return;
  }

  if (!supportedIntervals.includes(interval)) {
    res.status(400).json({ error: 'الإطار الزمني غير مدعوم.' });
    return;
  }

  try {
    const apiKey = sanitizeKey(process.env.BYBIT_API_KEY);
    const apiSecret = sanitizeKey(process.env.BYBIT_API_SECRET);
    const candles = await fetchCandles(symbol, interval, 100);
    const decision = decisionFromCandles(symbol, interval, candles);
    if (decision.action === 'Hold') {
      publishSse('trade-log', JSON.stringify({ time: new Date().toISOString(), message: decision.reason }));
      res.status(200).json({ action: 'Hold', reason: decision.reason });
      return;
    }

    const balanceResult = await getAccountBalance(apiKey, apiSecret);
    const balance = Number(balanceResult.available_balance ?? '0');
    const qty = getTradeSize(balance);
    const order = await createOrder(apiKey, apiSecret, symbol, decision.action, qty, decision.risk.takeProfit, decision.risk.stopLoss);
    publishSse('trade-log', JSON.stringify({ time: new Date().toISOString(), message: decision.reason }));
    publishSse('trade-log', JSON.stringify({ time: new Date().toISOString(), message: `تم إرسال طلب ${decision.action} للرمز ${symbol} بكمية ${qty}.` }));

    res.status(200).json({
      action: decision.action,
      reason: decision.reason,
      order,
    });
  } catch (error) {
    const message = (error as Error).message;
    publishSse('trade-log', JSON.stringify({ time: new Date().toISOString(), message: `خطأ تنفيذ الصفقة: ${message}` }));
    res.status(500).json({ error: message });
  }
}
