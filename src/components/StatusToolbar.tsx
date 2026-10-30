
import React from 'react';
import { useMesh } from '@/lib/MeshContext';
import { Users, Battery, ShieldCheck, ShieldAlert, Radio, Eye, EyeOff } from 'lucide-react';

export const StatusToolbar = () => {
  const { isConnected, peers, me, ledgerIntegrity, isStealthMode, setStealthMode, directPeerCount } = useMesh();

  return (
    <div className="flex items-center justify-between px-4 md:px-5 h-14 material border-x-0 border-t-0 rounded-none">
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-b from-red-400 to-red-600 flex items-center justify-center shadow-sm">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">Beacon</span>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-medium ${
          isConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
          {isConnected ? 'Connected' : 'Offline'}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Users className="w-3.5 h-3.5" />
          <span>{peers.length} nearby</span>
          {directPeerCount > 0 && (
            <span className="text-blue-400">· {directPeerCount} direct</span>
          )}
        </div>

        <div className={`hidden sm:flex items-center gap-1.5 text-xs ${ledgerIntegrity ? 'text-zinc-400' : 'text-red-400'}`}>
          {ledgerIntegrity
            ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            : <ShieldAlert className="w-3.5 h-3.5" />}
          {ledgerIntegrity ? 'Ledger verified' : 'Ledger tampered'}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setStealthMode(!isStealthMode)}
          title={isStealthMode ? 'Stealth mode on' : 'Stealth mode off'}
          className={`h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isStealthMode ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.06] text-zinc-400 hover:bg-white/10'
          }`}
        >
          {isStealthMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">Stealth</span>
        </button>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="text-zinc-300 font-medium">{me?.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400 tabular-nums">
          <Battery className="w-4 h-4" />
          {Math.round(me?.battery || 0)}%
        </div>
      </div>
    </div>
  );
};
