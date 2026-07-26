import type { ServerResponse } from 'http';

const clients: Set<ServerResponse> = new Set();

export const addSseClient = (res: ServerResponse) => {
  clients.add(res);
};

export const removeSseClient = (res: ServerResponse) => {
  clients.delete(res);
};

export const publishSse = (event: string, data: string) => {
  for (const res of clients) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
};
