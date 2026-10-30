
import React, { useState, useEffect } from 'react';
import { useMesh } from '@/lib/MeshContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, Activity, Signal, MessageSquare, 
  Battery, ShieldCheck, ShieldAlert, QrCode, Scan, X, Camera, Lock
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pb-3 flex items-center justify-between border-b border-white/[0.06]">
        <span className="text-[13px] text-zinc-400">
          {peers.length} {peers.length === 1 ? 'device' : 'devices'} nearby
        </span>
        <Dialog open={isIdentityHubOpen} onOpenChange={setIdentityHubOpen}>
          <DialogTrigger render={<button className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors" />}>
            <QrCode className="w-3.5 h-3.5" />
            Verify
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 ring-1 ring-white/10 rounded-3xl sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 text-lg font-semibold text-center">Verify in person</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-2xl">
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
                  <p className="text-[14px] font-semibold text-zinc-100">{me?.name}</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[260px]">
                    Have someone you trust scan this. It shares your public keys so your messages can be verified and encrypted.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
                  onClick={() => setIsScanning(!isScanning)}
                >
                  {isScanning ? <X className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
                  {isScanning ? 'Stop scanning' : 'Scan their code'}
                </button>

                {isScanning && (
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/40 flex flex-col items-center justify-center p-4">
                    <div id="reader" className="w-full h-full" />
                    {!isScanning && <Camera className="w-8 h-8 text-zinc-700 animate-pulse" />}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {peers.length === 0 && ghostPeers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-2">
                <Signal className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-[13px] text-zinc-500">Looking for nearby devices…</p>
            </div>
          ) : (
            <>
              {peers.map((peer) => (
                <div 
                  key={peer.id}
                  className="group px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
                  onClick={() => setSelectedMapItem({
                    id: peer.id,
                    type: 'peer',
                    location: peer.location,
                    label: peer.name,
                    details: peer
                  })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-700 flex items-center justify-center">
                          <span className="text-[14px] font-semibold text-white">
                            {peer.name.charAt(0)}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-900 ${peer.isVerified ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-medium text-zinc-100">{peer.name}</span>
                          {peer.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          {peer.role === 'coordinator' && (
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 tabular-nums">
                          <div className="flex items-center gap-1.5">
                             <div className="flex items-end gap-[2px] h-2.5">
                               {[1, 2, 3, 4].map((bar) => {
                                 const rssi = peer.rssi || -100;
                                 const strength = Math.min(4, Math.max(0, Math.floor((rssi + 100) / 15)));
                                 return (
                                   <div 
                                     key={bar}
                                     className={`w-[3px] rounded-[1px] transition-all duration-500 ${
                                       bar <= strength ? 'bg-zinc-300' : 'bg-zinc-700'
                                     }`}
                                     style={{ height: `${bar * 25}%` }}
                                   />
                                 );
                               })}
                             </div>
                             {Math.round(peer.rssi || 0)} dBm
                          </div>
                          <div className="flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5" />
                            {Math.round(peer.battery || 0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!peer.isVerified && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-emerald-500/10"
                          onClick={() => verifyPeer(peer.id)}
                          title="Mark as verified"
                        >
                          <ShieldCheck className="w-4 h-4 text-zinc-400" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-blue-500/15 hover:bg-blue-500/25" onClick={() => setSelectedPeer(peer.id)} />}>
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 ring-1 ring-white/10 rounded-3xl sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-zinc-100 text-lg font-semibold">
                              Message {peer.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-2">
                            <Textarea 
                              placeholder="Write a message"
                              className="bg-white/[0.06] border-transparent rounded-2xl text-zinc-100 text-[14px] min-h-[110px] px-3.5 py-3"
                              value={dmContent}
                              onChange={(e) => setDmContent(e.target.value)}
                            />
                            <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500 leading-relaxed">
                              <Lock className="w-3.5 h-3.5 shrink-0 mt-px" />
                              {peer.isVerified
                                ? 'End-to-end encrypted with a key only you and this person share.'
                                : 'Verify this person to end-to-end encrypt your messages.'}
                            </p>
                          </div>
                          <DialogFooter>
                            <button onClick={handleSendDM} className="w-full h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors">
                              Send
                            </button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}

              {ghostPeers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                   <h3 className="px-3 mb-1 text-xs font-medium text-zinc-500">Recently out of range</h3>
                   {ghostPeers.map((ghost) => (
                     <div key={ghost.id} className="px-3 py-2 opacity-60 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <span className="text-xs text-zinc-500">{ghost.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-[13px] text-zinc-400">{ghost.name}</p>
                          <p className="text-[11px] text-zinc-600">Last seen {new Date(ghost.lastSeen || Date.now()).toLocaleTimeString()}</p>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
