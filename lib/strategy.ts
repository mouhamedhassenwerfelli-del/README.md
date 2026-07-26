import { calculateIndicators } from './indicators';

export type TradeDecision = {
  action: 'Buy' | 'Sell' | 'Hold';
  reason: string;
  risk: {
    takeProfit: string;
    stopLoss: string;
  };
};

export const supportedSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PAXGUSDT'] as const;
export type SupportedSymbol = (typeof supportedSymbols)[number];

export const supportedIntervals = ['5m', '15m', '1h'] as const;
export type SupportedInterval = (typeof supportedIntervals)[number];

export const decisionFromCandles = (
  symbol: SupportedSymbol,
  interval: SupportedInterval,
  candles: { open_time: number; open: string; high: string; low: string; close: string; volume: string }[]
): TradeDecision => {
  const indicators = calculateIndicators(candles);
  const index = candles.length - 1;
  const close = Number(candles[index].close);
  const ema9 = indicators.ema9[index];
  const ema21 = indicators.ema21[index];
  const rsi = indicators.rsi[index];
  const macdHistogram = indicators.macd.histogram[index];
  const upper = indicators.bollinger.upper[index];
  const lower = indicators.bollinger.lower[index];

  const isBullish = close > ema9 && ema9 > ema21 && macdHistogram > 0 && rsi < 70;
  const isBearish = close < ema9 && ema9 < ema21 && macdHistogram < 0 && rsi > 30;
  const crossingAboveMiddle = close > indicators.bollinger.middle[index];
  const crossingBelowMiddle = close < indicators.bollinger.middle[index];

  if (isBullish && crossingAboveMiddle) {
    return {
      action: 'Buy',
      reason: `الاستراتيجية لاكتشاف اتجاه صاعد في ${symbol} على الإطار ${interval}: السعر الحالي ${close.toFixed(2)} أعلى من EMA9 (${ema9.toFixed(2)}) وEMA21 (${ema21.toFixed(2)}), RSI=${rsi.toFixed(1)}, MACD histogram إيجابي, السعر يتداول فوق المتوسط المتوسط للبولينجر.`,
      risk: {
        takeProfit: (close * 1.01).toFixed(4),
        stopLoss: (close * 0.995).toFixed(4),
      },
    };
  }

  if (isBearish && crossingBelowMiddle) {
    return {
      action: 'Sell',
      reason: `الاستراتيجية لاكتشاف اتجاه هابط في ${symbol} على الإطار ${interval}: السعر الحالي ${close.toFixed(2)} أقل من EMA9 (${ema9.toFixed(2)}) وEMA21 (${ema21.toFixed(2)}), RSI=${rsi.toFixed(1)}, MACD histogram سلبي, السعر يتداول تحت المتوسط المتوسط للبولينجر.`,
      risk: {
        takeProfit: (close * 0.99).toFixed(4),
        stopLoss: (close * 1.005).toFixed(4),
      },
    };
  }

  return {
    action: 'Hold',
    reason: `القرار الحالي هو التريث والحفاظ على رأس المال بسبب عدم تطابق شروط الدخول الصارمة أو لتجنب الضوضاء السوقية عند ${symbol} على الإطار ${interval}.`, 
    risk: {
      takeProfit: '0',
      stopLoss: '0',
    },
  };
};
