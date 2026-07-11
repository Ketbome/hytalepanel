import type { Socket } from 'socket.io-client';
import {
  addLog,
  clearLogs,
  extractTimestamp,
  formatTimestamp,
  getLogType,
  hasMoreHistory,
  initialLoadDone,
  isLoadingMore,
  loadedCount,
  logs,
  prependLogs
} from '$lib/stores/console';
import type { LogEntry, LogsHistoryData } from '$lib/types';

function handleLogsHistory(data: LogsHistoryData): void {
  if (data.error) {
    console.error('Failed to load logs:', data.error);
    isLoadingMore.set(false);
    return;
  }

  if (!data.logs || data.logs.length === 0) {
    hasMoreHistory.set(data.hasMore !== false);
    isLoadingMore.set(false);
    return;
  }

  if (data.initial) {
    clearLogs();
  }

  const parsedLogs: LogEntry[] = data.logs
    .map((line) => {
      const ts = extractTimestamp(line);
      const cleaned = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s*/, '').trim();
      return {
        text: cleaned,
        type: getLogType(cleaned),
        timestamp: formatTimestamp(ts)
      };
    })
    .filter((l) => l.text);

  loadedCount.update((c) => c + data.logs.length);

  if (data.hasMore === false) {
    hasMoreHistory.set(false);
  }

  if (data.initial) {
    logs.set(parsedLogs);
    setTimeout(() => initialLoadDone.set(true), 500);
  } else {
    prependLogs(parsedLogs);
  }

  isLoadingMore.set(false);
}

export function registerConsoleEvents(socket: Socket): void {
  socket.on('log', (msg: string) => {
    addLog(msg.trim());
  });

  socket.on('logs:history', handleLogsHistory);
}
