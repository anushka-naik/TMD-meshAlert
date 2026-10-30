
import React, { useState } from 'react';
import { Shield, FileText, Map, AlertCircle, Info, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const SupportResources = () => {
  const [selectedResource, setSelectedResource] = useState<null | typeof resources[0]>(null);

  const resources = [
    {
      title: "Mesh Networking 101",
      desc: "How messages travel without an ISP.",
      icon: <Info className="w-4 h-4 text-blue-400" />,
      tag: "Basics",
      content: `
        ### The Mesh Architecture
        Unlike traditional internet where your device talks to a router (ISP), Beacon Mesh turns every phone into a router.
        
        **How it works:**
        1. **Discovery:** Devices on the same Wi-Fi or hotspot find each other through the host.
        2. **Direct links:** Once connected, devices open WebRTC channels and talk to each other directly.
        3. **Sync:** When a device reconnects, it pulls the history it missed from its peers.
        
        **Benefits:**
        - Works when the internet is down.
        - Privacy-first (no central logging).
        - Range is your local Wi-Fi or hotspot.
      `
    },
    {
      title: "Secure Communication",
      desc: "Verifying who you're talking to.",
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      tag: "Security",
      content: `
        ### Identifying Trust
        In a high-risk environment, adversarial nodes may try to spread misinformation.

        **Security Layers:**
        - **Handshake Verification:** Always use the QR scan feature to verify users you physically meet.
        - **Ledger Integrity:** Every message is cryptographically chained. If the toolbar shows "Ledger tampered", it means someone is trying to "replay" or "forge" history.
        - **Verified peers:** Green dots and badges mark people you've verified by scanning their QR code.
      `
    },
    {
      title: "Reading the Map",
      desc: "Nodes, signal strength and resource pins.",
      icon: <Map className="w-4 h-4 text-amber-400" />,
      tag: "Map",
      content: `
        ### Reading the Map
        The map shows who is in range and what has been reported nearby.

        **What you're looking at:**
        1. **Nodes:** Blue is you. Green are peers you've verified. Grey are unverified peers.
        2. **Signal Strength:** Check the dBm values. Low values (e.g., -40dBm) mean you are close. High values (e.g., -90dBm) mean you are at the edge of the connection.
        3. **Resource Pins:** Look for the icons on the map for water/medical stations reported by the mesh.
      `
    },
    {
      title: "Medical First Aid",
      desc: "Tear gas, wounds, and sending an SOS.",
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      tag: "First aid",
      content: `
        ### Emergency Protocol
        If you encounter a medical crisis and communication is down:

        **Procedures:**
        - **Tear Gas:** Flush eyes with water/saline. Move to high ground.
        - **Wound Care:** Apply direct pressure. Elevate the limb.
        - **Signal Emergency:** Use the SOS button in the Beacon app. It sends a signed alert to everyone on the #emergency channel.
      `
    }
  ];

  return (
    <>
      <div className="h-full material rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[13px] font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            Field Guide
          </h2>
        </div>
        <ScrollArea className="flex-1 min-h-0 px-2 pb-2">
          <div className="space-y-0.5">
            {resources.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedResource(item)}
                className="px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer group flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-zinc-200">{item.title}</h3>
                  <p className="text-xs text-zinc-500 truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        <DialogContent className="bg-zinc-900 ring-1 ring-white/10 rounded-3xl text-zinc-300 max-w-lg">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3">
              {selectedResource?.icon}
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                {selectedResource?.title}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
            {selectedResource?.content.split('\n').map((line, i) => {
              if (line.trim().startsWith('###')) {
                return (
                  <h4 key={i} className="text-zinc-100 font-semibold mt-2 mb-1 text-[15px]">
                    {line.replace('###', '').trim()}
                  </h4>
                );
              }
              if (line.trim().startsWith('**')) {
                return (
                  <p key={i} className="text-zinc-200 font-semibold mb-1 text-[13px]">
                    {line.replace(/\*\*/g, '').trim()}
                  </p>
                );
              }
              if (line.trim().startsWith('-')) {
                return (
                  <div key={i} className="flex gap-2 text-zinc-300 text-[13px] ml-1 mb-1">
                    <div className="w-1 h-1 bg-zinc-500 rounded-full mt-2 shrink-0" />
                    <span>{line.replace('-', '').trim()}</span>
                  </div>
                );
              }
              return (
                <p key={i} className="text-zinc-400 text-[13px] leading-relaxed mb-1">
                  {line.trim()}
                </p>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
