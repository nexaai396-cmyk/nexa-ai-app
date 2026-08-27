import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { pushLog } from '@/lib/logs';
import { useLogs } from '@/lib/useLogs';
import type { LogLevel, SystemLog } from '@/lib/types';
import { Terminal, Trash2, Loader2, Circle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

function levelIcon(level: LogLevel) {
  switch (level) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-error" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-brand-cyan" />;
  }
}

function levelColor(level: LogLevel) {
  switch (level) {
    case 'success':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'error':
      return 'text-error';
    default:
      return 'text-brand-cyan';
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LiveLogs({ height = 'h-72' }: { height?: string }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { logs, setLogs } = useLogs(80);
  const [clearing, setClearing] = useState(false);

  async function clearAll() {
    if (!userId) return;
    setClearing(true);
    const { error } = await supabase.from('nexa_system_logs').delete().eq('user_id', userId);
    setClearing(false);
    if (!error) setLogs([]);
    else pushLog(userId, 'error', 'logs.clear', 'Failed to clear logs', { error: error.message });
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-cyan" />
          <h3 className="font-semibold text-sm">Live System Logs</h3>
          <span className="flex items-center gap-1 text-[10px] text-success font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> realtime
          </span>
        </div>
        <button
          onClick={clearAll}
          disabled={clearing}
          className="text-xs text-ink-300 hover:text-error flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-error/10 transition"
        >
          {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Clear
        </button>
      </div>

      <div className={`${height} overflow-y-auto rounded-lg bg-ink-900/70 border border-white/5 p-3 font-mono text-xs space-y-1.5`}>
        {logs.length === 0 ? (
          <div className="text-ink-300 flex items-center gap-2 py-8 justify-center">
            <Terminal className="w-4 h-4" /> Awaiting execution events…
          </div>
        ) : (
          logs.map((log: SystemLog) => (
            <div key={log.id} className="flex gap-2 items-start animate-fade-up">
              <span className="text-ink-400 shrink-0">{fmtTime(log.created_at)}</span>
              {levelIcon(log.level)}
              <span className={`shrink-0 font-semibold ${levelColor(log.level)}`}>[{log.event}]</span>
              <span className="text-ink-100 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
