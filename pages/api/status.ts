import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccountBalance, getBybitHeaders, sanitizeKey } from '../../lib/bybit';

const getConnectionState = async () => {
  try {
    const apiKey = process.env.BYBIT_API_KEY ?? '';
    const apiSecret = process.env.BYBIT_API_SECRET ?? '';
    if (!apiKey || !apiSecret) {
      return { connected: false, error: 'مفتاح API أو السر مفقود.' };
    }
    await getBybitHeaders(apiKey, apiSecret);
    return { connected: true };
  } catch (error) {
    return { connected: false, error: (error as Error).message };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const connection = await getConnectionState();
  if (!connection.connected) {
    res.status(200).json({
      connected: false,
      error: connection.error,
      balance: '0',
      equity: '0',
      available_balance: '0',
      pnl: '0',
      activeOrders: [],
    });
    return;
  }

  try {
    const apiKey = sanitizeKey(process.env.BYBIT_API_KEY);
    const apiSecret = sanitizeKey(process.env.BYBIT_API_SECRET);
    const balance = await getAccountBalance(apiKey, apiSecret);
    res.status(200).json({
      connected: true,
      balance: balance.available_balance,
      equity: balance.equity,
      available_balance: balance.available_balance,
      pnl: '0',
      activeOrders: [],
    });
  } catch (error) {
    res.status(200).json({
      connected: false,
      error: (error as Error).message,
      balance: '0',
      equity: '0',
      available_balance: '0',
      pnl: '0',
      activeOrders: [],
    });
  }
}
