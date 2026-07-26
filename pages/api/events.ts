import type { NextApiRequest, NextApiResponse } from 'next';
import { addSseClient, removeSseClient, publishSse } from '../../lib/broadcast';

const heartbeat = (res: NextApiResponse) => {
  try {
    res.write('event: ping\n');
    res.write('data: {}\n\n');
  } catch {
    removeSseClient(res as any);
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache, no-transform',
    'Content-Type': 'text/event-stream',
  });

  res.write('retry: 10000\n\n');
  addSseClient(res as any);
  publishSse('trade-log', JSON.stringify({ time: new Date().toISOString(), message: 'تم فتح قناة الأحداث الحية.' }));

  const interval = setInterval(() => heartbeat(res), 25000);
  req.on('close', () => {
    clearInterval(interval);
    removeSseClient(res as any);
  });
}
