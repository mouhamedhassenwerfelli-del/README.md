export type IndicatorResult = {
  ema9: number[];
  ema21: number[];
  ema50: number[];
  rsi: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bollinger: { upper: number[]; lower: number[]; middle: number[] };
};

const toNumber = (value: string | number): number => {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? num : 0;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const ema = (values: number[], period: number): number[] => {
  const result: number[] = [];
  const k = 2 / (period + 1);
  values.forEach((value, index) => {
    if (index === 0) {
      result.push(value);
      return;
    }
    const prevEma = result[index - 1] ?? value;
    result.push(prevEma + k * (value - prevEma));
  });
  return result;
};

export const rsi = (values: number[], period = 14): number[] => {
  const result: number[] = [];
  let gainSum = 0;
  let lossSum = 0;

  values.forEach((value, index) => {
    if (index === 0) {
      result.push(0);
      return;
    }

    const delta = value - values[index - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);

    if (index <= period) {
      gainSum += gain;
      lossSum += loss;
      result.push(0);
      return;
    }

    if (index === period + 1) {
      gainSum = (gainSum + gain) / period;
      lossSum = (lossSum + loss) / period;
    } else {
      gainSum = (gainSum * (period - 1) + gain) / period;
      lossSum = (lossSum * (period - 1) + loss) / period;
    }

    const rs = lossSum === 0 ? 100 : gainSum / lossSum;
    result.push(100 - 100 / (1 + rs));
  });

  return result.map((value) => Number.isFinite(value) ? value : 0);
};

export const macd = (values: number[], fast = 12, slow = 26, signal = 9) => {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, index) => emaFast[index] - emaSlow[index]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((value, index) => value - signalLine[index]);
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
};

export const bollingerBands = (values: number[], period = 20, multiplier = 2) => {
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const slice = values.slice(Math.max(0, index - period + 1), index + 1);
    const mean = average(slice);
    const variance = average(slice.map((value) => Math.pow(value - mean, 2)));
    const stdev = Math.sqrt(variance);
    upper.push(mean + multiplier * stdev);
    lower.push(mean - multiplier * stdev);
    middle.push(mean);
  }

  return { upper, lower, middle };
};

export const calculateIndicators = (candles: { close: string }[]) => {
  const closes = candles.map((c) => toNumber(c.close));
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const rsiValues = rsi(closes, 14);
  const macdValues = macd(closes, 12, 26, 9);
  const bollinger = bollingerBands(closes, 20, 2);

  return {
    ema9,
    ema21,
    ema50,
    rsi: rsiValues,
    macd: macdValues,
    bollinger,
  } as IndicatorResult;
};
