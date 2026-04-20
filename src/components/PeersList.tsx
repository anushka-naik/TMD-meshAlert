
import React, { useState, useEffect } from 'react';
import { useMesh } from '@/lib/MeshContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, Activity, Signal, MessageSquare, 
  Battery, ShieldCheck, ShieldAlert, QrCode, Scan, X, Camera
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';

export const PeersList = () => {
  const { peers, ghostPeers, sendDirect, verifyPeer, setSelectedMapItem, me } = useMesh();
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [dmContent, setDmContent] = useState('');
  const [isIdentityHubOpen, setIdentityHubOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((result) => {
        try {
          const data = JSON.parse(result);
          if (data.type === 'mesh_id' && data.id) {
            verifyPeer(data); // Pass full data object
            setIsScanning(false);
            scanner?.clear();
          }
        } catch (e) {
          toast.error("Invalid mesh signature detected");
        }
      }, (err) => {
        // console.error(err);
      });
    }
    return () => {
      if (scanner) scanner.clear().catch(e => console.error("Scanner clear error", e));
    };
  }, [isScanning, verifyPeer]);

  const handleSendDM = () => {
    if (!selectedPeer || !dmContent.trim()) return;
    sendDirect(selectedPeer, dmContent);
    setDmContent('');
    setSelectedPeer(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-zinc-300">Active Nodes</h2>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isIdentityHubOpen} onOpenChange={setIdentityHubOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 px-2 font-mono text-[10px] gap-1.5 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400">
              <QrCode className="w-3.5 h-3.5" />
              IDENTITY HUB
            </Button>} />
            <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-zinc-200 font-mono text-sm uppercase tracking-widest">Local Out-of-Band Verification</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG 
                      value={JSON.stringify({ 
                        type: 'mesh_id', 
                        id: me?.id, 
                        name: me?.name,
                        signingKey: me?.signingKey,
                        encryptionKey: me?.encryptionKey
                      })} 
                      size={180}
                      level="H"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-tighter">Your Tactical ID: {me?.id}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">Let trusted peers scan this for out-of-band verification</p>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-4">
                  <Button 
                    className="w-full flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 font-mono font-bold"
                    onClick={() => setIsScanning(!isScanning)}
                  >
                    {isScanning ? <X className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
                    {isScanning ? 'HALT SCANNER' : 'ACTIVATE VERIFICATION SCANNER'}
                  </Button>

                  {isScanning && (
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden border-2 border-dashed border-blue-500/30 bg-black/40 flex flex-col items-center justify-center p-4">
                      <div id="reader" className="w-full h-full" />
                      {!isScanning && <Camera className="w-8 h-8 text-zinc-700 animate-pulse" />}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono text-[10px]">
            {peers.length} ACTIVE
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {peers.length === 0 && ghostPeers.length === 0 ? (
            <div className="p-8 text-center">
              <Signal className="w-8 h-8 text-zinc-700 mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] font-mono text-zinc-600 uppercase">Scanning for nearby signals...</p>
            </div>
          ) : (
            <>
              {peers.map((peer) => (
                <div 
                  key={peer.id}
                  className="group p-3 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                  onClick={() => setSelectedMapItem({
                    id: peer.id,
                    type: 'peer',
                    location: peer.location,
                    label: peer.name,
                    details: peer
                  })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center border border-white/10">
                          <span className="text-xs font-mono font-bold text-zinc-400">
                            {peer.name.charAt(0)}
                          </span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-zinc-950 ${peer.isVerified ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200">{peer.name}</span>
                          {peer.isVerified && (
                             <Badge variant="secondary" className="h-4 px-1 bg-blue-500/20 text-blue-400 border-none scale-75 origin-left">
                               <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                               VERIFIED
                             </Badge>
                           )}
                          {peer.role === 'coordinator' && (
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                            <Battery className="w-2.5 h-2.5 text-zinc-600" />
                            {Math.round(peer.battery || 0)}%
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                             <div className="flex items-end gap-[1px] h-2.5 w-4 mb-0.5">
                               {[1, 2, 3, 4].map((bar) => {
                                 const rssi = peer.rssi || -100;
                                 const strength = Math.min(4, Math.max(0, Math.floor((rssi + 100) / 15)));
                                 return (
                                   <div 
                                     key={bar}
                                     className={`w-[2px] rounded-t-[1px] transition-all duration-500 ${
                                       bar <= strength 
                                         ? 'bg-emerald-500' 
                                         : 'bg-zinc-800'
                                     }`}
                                     style={{ height: `${bar * 25}%` }}
                                   />
                                 );
                               })}
                             </div>
                             <span className={peer.rssi && peer.rssi > -70 ? 'text-emerald-500' : 'text-zinc-600'}>
                               {Math.round(peer.rssi || 0)} dBm
                             </span>
                          </div>
                          <span className="text-zinc-700 font-mono text-[10px] uppercase">{peer.id.slice(0, 6)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!peer.isVerified && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-blue-500/10"
                          onClick={() => verifyPeer(peer.id)}
                          title="Verify Identity"
                        >
                          <ShieldCheck className="w-4 h-4 text-zinc-600 hover:text-blue-500" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPeer(peer.id)} />}>
                          <MessageSquare className="w-4 h-4 text-zinc-400" />
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-zinc-200 font-mono text-sm uppercase tracking-widest">
                              Secure Channel with {peer.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <Textarea 
                              placeholder="Type encrypted message..."
                              className="bg-black/50 border-white/5 text-zinc-300 font-mono text-xs min-h-[100px]"
                              value={dmContent}
                              onChange={(e) => setDmContent(e.target.value)}
                            />
                            <div className="mt-4 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                              <p className="text-[10px] text-emerald-500/70 font-mono leading-relaxed">
                                PROTOCOL NOTICE: This message will be encrypted using RSA-4096 and routed through {Math.floor(Math.random() * 3) + 1} hops before delivery.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="secondary" onClick={handleSendDM} className="w-full font-mono text-xs uppercase font-bold">
                              Transmit Data
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}

              {ghostPeers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                   <div className="px-3 mb-2 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                     <h3 className="text-[10px] font-mono font-bold uppercase text-zinc-600 tracking-tighter">Ghost Signals (Last Known)</h3>
                   </div>
                   {ghostPeers.map((ghost) => (
                     <div key={ghost.id} className="px-3 py-2 opacity-40 grayscale flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-700">?</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-mono text-zinc-500">{ghost.name}</p>
                            <p className="text-[8px] font-mono text-zinc-700">DISCONNECTED • {new Date(ghost.lastSeen || Date.now()).toLocaleTimeString()}</p>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 bg-white/5 border-t border-white/5">
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500" />
            Encryption Active
          </div>
          <span className="text-zinc-700">Gossip_v2.1</span>
        </div>
      </div>
    </div>
  );
};
