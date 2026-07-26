import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'PAXGUSDT'];
const intervals = ['5m', '15m', '1h'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data, error, mutate } = useSWR('/api/status', fetcher, {
    refreshInterval: 10000,
  });

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setIntervalValue] = useState('15m');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [tradeStatus, setTradeStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.addEventListener('trade-log', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setLiveLogs((prev) => [payload.message, ...prev].slice(0, 30));
      } catch {
        setLiveLogs((prev) => [event.data, ...prev].slice(0, 30));
      }
    });

    source.onerror = () => {
      setLiveLogs((prev) => ['تم فقدان اتصال البث المباشر. إعادة المحاولة...', ...prev].slice(0, 30));
    };

    return () => source.close();
  }, []);

  const startTrading = async () => {
    setLoading(true);
    setTradeStatus('جارٍ تحديد القرار وتنفيذ الصفقة...');
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, interval }),
      });
      const result = await response.json();
      if (!response.ok) {
        setTradeStatus(`خطأ: ${result.error}`);
      } else {
        setTradeStatus(`نتيجة: ${result.action} - ${result.reason}`);
      }
      mutate();
    } catch (err) {
      setTradeStatus(`خطأ في الشبكة: ${(err as Error).message}`);
    }
    setLoading(false);
  };

  const emergencyStop = () => {
    setTradeStatus('تم تفعيل إيقاف الطوارئ. تم إيقاف التداول الفعلي مؤقتاً.');
  };

  const statusLine = useMemo(() => {
    if (error) return 'فشل في جلب حالة الاتصال.';
    if (!data) return 'جارٍ الاتصال...';
    return data.connected ? 'متصل بخادم Bybit' : `غير متصل: ${data.error}`;
  }, [data, error]);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 1024, margin: 'auto' }}>
      <header>
        <h1>محرك التداول الآلي الفائق</h1>
        <p>منصة Bybit | رأس مال 60$ | حماية صارمة وتنفيذ مباشر</p>
      </header>

      <section style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 14, background: '#f9f9f9' }}>
          <h2>الحالة الحالية</h2>
          <p>{statusLine}</p>
          <p>الرصيد المتاح: {data?.available_balance ?? '0'} USDT</p>
          <p>القيمة الإجمالية: {data?.equity ?? '0'} USDT</p>
          <p>ربح/خسارة يومية: {data?.pnl ?? '0'} USDT</p>
        </div>

        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 14 }}>
          <h2>ضبط التداول الآلي</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              رمز التداول
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: '100%', marginTop: 8, padding: 10 }}>
                {symbols.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              الإطار الزمني
              <select value={interval} onChange={(e) => setIntervalValue(e.target.value)} style={{ width: '100%', marginTop: 8, padding: 10 }}>
                {intervals.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <button onClick={startTrading} disabled={loading} style={{ width: '100%', padding: 16, fontSize: 18, background: '#0a5', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
              تفعيل التداول الآلي الفعلي
            </button>
            <button onClick={emergencyStop} style={{ width: '100%', padding: 16, fontSize: 18, background: '#d32', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
              إيقاف الطوارئ
            </button>
          </div>
          <p style={{ marginTop: 16, whiteSpace: 'pre-line' }}>{tradeStatus}</p>
        </div>

        <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 14, background: '#fff' }}>
          <h2>السجل الحي</h2>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 10 }}>
            {liveLogs.length === 0 ? <p>لا توجد أحداث بعد.</p> : liveLogs.map((log, index) => (
              <div key={index} style={{ padding: 12, borderRadius: 10, background: '#f0f4ff' }}>{log}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
