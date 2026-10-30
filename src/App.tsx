import React, { useState } from 'react';
import { MeshProvider } from '@/lib/MeshContext';
import { StatusToolbar } from '@/components/StatusToolbar';
import { BroadcastHub } from '@/components/BroadcastHub';
import { MeshMap } from '@/components/MeshMap';
import { SupportResources } from '@/components/SupportResources';
import { PeersList } from '@/components/PeersList';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Shield, Users } from 'lucide-react';
import { HostModePanel } from '@/components/HostModePanel';

import { useMesh } from '@/lib/MeshContext';

export default function App() {
  return (
    <MeshProvider>
      <AppInner />
    </MeshProvider>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState('broadcast');
  const { isConnected } = useMesh();

  return (
    <>
    <div className={`flex flex-col h-screen bg-black text-zinc-100 font-sans transition-all duration-1000 ${!isConnected ? 'shadow-[inset_0_0_120px_rgba(255,69,58,0.12)]' : ''}`}>
      <StatusToolbar />

        <main className="flex-1 flex overflow-hidden p-3 md:p-5 gap-5">
          {/* Desktop Sidebar - Host / Resources / Security */}
          <div className="hidden lg:flex flex-col w-[300px] shrink-0 gap-5 min-h-0">
             <HostModePanel />
             <div className="flex-1 min-h-0">
               <SupportResources />
             </div>
             <div className="p-4 material rounded-2xl">
                <h3 className="text-[13px] font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Security
                </h3>
                <div className="space-y-2">
                   {[
                     ['Signatures', 'ECDSA P-256'],
                     ['Direct messages', 'ECDH + AES-GCM'],
                     ['Ledger', 'SHA-256 chain'],
                   ].map(([k, v]) => (
                     <div key={k} className="flex justify-between text-xs">
                        <span className="text-zinc-500">{k}</span>
                        <span className="text-zinc-300">{v}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col min-w-0 gap-5 pb-16 lg:pb-0">
             <div className="h-[34vh] lg:h-[42%] shrink-0">
                <MeshMap />
             </div>
             
             <div className="flex-1 flex flex-col min-h-0 material rounded-2xl overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col gap-0">
                  <div className="px-4 pt-3 pb-2 flex items-center justify-center">
                    <TabsList className="bg-white/[0.06] h-8 p-[3px] rounded-[9px] gap-0 w-full max-w-xs">
                      <TabsTrigger 
                        value="broadcast" 
                        className="flex-1 h-full rounded-[7px] text-[13px] font-medium text-zinc-400 data-active:bg-zinc-700/80 data-active:text-white data-active:shadow-sm gap-1.5"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Airwaves
                      </TabsTrigger>
                      <TabsTrigger 
                        value="peers" 
                        className="flex-1 h-full rounded-[7px] text-[13px] font-medium text-zinc-400 data-active:bg-zinc-700/80 data-active:text-white data-active:shadow-sm gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Nearby
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="broadcast" className="h-full m-0 p-0">
                      <BroadcastHub />
                    </TabsContent>
                    <TabsContent value="peers" className="h-full m-0 p-0">
                      <PeersList />
                    </TabsContent>
                  </div>
                </Tabs>
             </div>
          </div>

          {/* Mobile tab bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 pb-2 material border-x-0 border-b-0 flex items-center justify-around px-8 z-50">
             <button className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'broadcast' ? 'text-blue-500' : 'text-zinc-500'}`} onClick={() => setActiveTab('broadcast')}><Radio className="w-5 h-5" />Airwaves</button>
             <button className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'peers' ? 'text-blue-500' : 'text-zinc-500'}`} onClick={() => setActiveTab('peers')}><Users className="w-5 h-5" />Nearby</button>
          </div>
        </main>

        <Toaster theme="dark" position="top-center" expand={false} />
      </div>
    </>
  );
}
