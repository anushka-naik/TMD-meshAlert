import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wifi, Server, Copy, CheckCheck, Radio } from 'lucide-react';
import { toast } from 'sonner';

interface NetworkInfo {
  ips: string[];
  port: number;
}

/**
 * HostModePanel
 *
 * Displayed when one device is acting as the hub (running the Node.js server).
 * It shows all local network IPs and a QR code so nearby devices can join by
 * scanning — no internet, no configuration needed.
 *
 * Steps for offline LAN mesh:
 *   1. One person starts the app with `npm run dev` (or the built binary).
 *   2. Their device creates / joins a WiFi hotspot.
 *   3. Other devices connect to the same WiFi hotspot.
 *   4. Others scan the QR code shown here — app loads and joins the mesh.
 *   5. Once loaded, the PWA service worker caches the app so it survives
 *      future page loads even if the hub restarts.
 */
export const HostModePanel: React.FC = () => {
  const [netInfo, setNetInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/network-info')
      .then(r => r.json())
      .then((data: NetworkInfo) => {
        setNetInfo(data);
        if (data.ips.length > 0) setSelectedIp(data.ips[0]);
        setLoading(false);
      })
      .catch(() => {
        // Server may not be reachable (pure offline, loaded from cache)
        setLoading(false);
      });
  }, []);

  const copyIp = async (ip: string) => {
    const url = `http://${ip}:${netInfo?.port ?? 3000}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIp(ip);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopiedIp(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const joinUrl = selectedIp ? `http://${selectedIp}:${netInfo?.port ?? 3000}` : null;

  return (
    <div className="p-4 material rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-blue-500" />
        <h3 className="text-[13px] font-semibold text-zinc-100">Host this mesh</h3>
      </div>

      {loading && (
        <p className="text-xs text-zinc-500 animate-pulse">Looking for network interfaces…</p>
      )}

      {!loading && (!netInfo || netInfo.ips.length === 0) && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-300">No local network found.</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Join a Wi-Fi network or start a hotspot, then reload.
          </p>
        </div>
      )}

      {!loading && netInfo && netInfo.ips.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            {joinUrl && (
              <div className="p-1.5 bg-white rounded-xl shrink-0">
                <QRCodeSVG
                  value={joinUrl}
                  size={84}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            )}
            <p className="text-xs text-zinc-400 leading-relaxed">
              Anyone on the same Wi-Fi can scan this to join. No internet needed.
            </p>
          </div>

          {/* IP list */}
          <div className="space-y-1">
            {netInfo.ips.map(ip => {
              const url = `http://${ip}:${netInfo.port}`;
              const isSelected = ip === selectedIp;
              return (
                <div
                  key={ip}
                  role="button"
                  onClick={() => setSelectedIp(ip)}
                  className={`w-full flex items-center justify-between px-3 h-8 rounded-full text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-500/15' : 'bg-white/[0.05] hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Wifi className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-zinc-500'}`} />
                    <span className={`text-xs font-mono truncate ${isSelected ? 'text-blue-300' : 'text-zinc-400'}`}>
                      {url}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); copyIp(ip); }}
                    className="shrink-0 ml-2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Copy URL"
                  >
                    {copiedIp === ip
                      ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              );
            })}
          </div>

          {/* mDNS hint */}
          <p className="text-[11px] text-zinc-500 leading-relaxed flex items-center gap-1.5">
            <Radio className="w-3 h-3 shrink-0" />
            <span>Also at <span className="text-zinc-300">beacon-mesh.local:{netInfo.port}</span></span>
          </p>
        </>
      )}
    </div>
  );
};
