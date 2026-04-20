
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
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
      desc: "How your device shares data without ISP access.",
      icon: <Info className="w-4 h-4 text-blue-400" />,
      tag: "KNOWLEDGE",
      content: `
        ### The Mesh Architecture
        Unlike traditional internet where your device talks to a router (ISP), Beacon Mesh turns every phone into a router.
        
        **How it works:**
        1. **Discovery:** Your phone broadcasts its "Beacon" via Bluetooth/Local Wi-Fi.
        2. **Gossip:** When you send a message, it hops from peer to peer until it reaches the destination or covers the area.
        3. **Healing:** If one node leaves, the data automatically finds a new path through other available nodes.
        
        **Benefits:**
        - Unstoppable by government shut-down.
        - Privacy-first (no central logging).
        - Direct device-to-device range (~50-100m).
      `
    },
    {
      title: "Secure Communication",
      desc: "Protocol for identifying verified mesh nodes.",
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      tag: "SECURITY",
      content: `
        ### Identifying Trust
        In a high-risk environment, adversarial nodes may try to spread misinformation.

        **Security Layers:**
        - **Handshake Verification:** Always use the QR scan feature to verify users you physically meet.
        - **Ledger Integrity:** Every message is cryptographically chained. If the status bar turns red, it means someone is trying to "replay" or "forge" history.
        - **Verification Badge:** Blue shield icons represent nodes that have been physically authenticated.
      `
    },
    {
      title: "Offline Protest Routes",
      desc: "Safe corridors updated by coordinators.",
      icon: <Map className="w-4 h-4 text-amber-400" />,
      tag: "URGENT",
      content: `
        ### Tactical Movement
        Movement during outages requires real-time coordination without being tracked.

        **Using the Tactical Map:**
        1. **Nodes:** Green is you. Blue are verified friends. Grey are unknown mesh points.
        2. **Signal Strength:** Check the dBm values. Low values (e.g., -40dBm) mean you are close. High values (e.g., -90dBm) mean you are at the edge of the connection.
        3. **Resource Pins:** Look for the icons on the map for water/medical stations reported by the mesh.
      `
    },
    {
      title: "Medical First-Aid",
      desc: "Emergency procedures for trauma and toxicity.",
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      tag: "CRITICAL",
      content: `
        ### Emergency Protocol
        If you encounter a medical crisis and communication is down:

        **Procedures:**
        - **Tear Gas:** Flush eyes with water/saline. Move to high ground.
        - **Wound Care:** Apply direct pressure. Elevate the limb.
        - **Signal Emergency:** Use the SOS button in the Beacon app. It broadcasts a high-priority "Pulse" to every node in a 1km radius, bypassing normal relay limits.
      `
    }
  ];

  return (
    <>
      <Card className="h-full bg-zinc-950/50 border-white/5 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Field Manual
          </h2>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {resources.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedResource(item)}
                className="p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                 <span className="text-[9px] font-mono font-extrabold text-zinc-500 px-1.5 py-0.5 border border-white/10 rounded uppercase">
                   {item.tag}
                 </span>
                 {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-300 max-w-lg">
          <DialogHeader className="border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              {selectedResource?.icon}
              <DialogTitle className="text-lg font-mono font-bold tracking-tight text-white">
                {selectedResource?.title}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {selectedResource?.content.split('\n').map((line, i) => {
              if (line.trim().startsWith('###')) {
                return (
                  <h4 key={i} className="text-emerald-400 font-bold mt-4 mb-2 uppercase text-xs tracking-widest">
                    {line.replace('###', '').trim()}
                  </h4>
                );
              }
              if (line.trim().startsWith('**')) {
                return (
                  <p key={i} className="text-zinc-200 font-semibold mb-1 text-sm">
                    {line.replace(/\*\*/g, '').trim()}
                  </p>
                );
              }
              if (line.trim().startsWith('-')) {
                return (
                  <div key={i} className="flex gap-2 text-zinc-400 text-xs ml-2 mb-1">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                    <span>{line.replace('-', '').trim()}</span>
                  </div>
                );
              }
              return (
                <p key={i} className="text-zinc-400 text-xs leading-relaxed mb-1">
                  {line.trim()}
                </p>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-[10px] text-zinc-600 font-mono text-center">
              END OF DOCUMENT • BEACON MESH V2.1
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
