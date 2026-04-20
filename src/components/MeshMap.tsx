
import React, { useMemo, useState, useEffect } from 'react';
import { useMesh } from '@/lib/MeshContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Battery, Signal, ShieldCheck, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapItem } from '@/lib/mesh-types';
import { toast } from 'sonner';

export const MeshMap = () => {
  const { peers, ghostPeers, me, messages, selectedMapItem, setSelectedMapItem, isConnected } = useMesh();
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });

  // Extract resource points from messages with fading logic
  const resources = useMemo(() => {
    return messages
      .filter(m => m.metadata?.resourceType && m.metadata?.location)
      .map(m => {
        const ageMs = Date.now() - m.timestamp;
        const opacity = Math.max(0.1, 1 - (ageMs / 3600000)); // Fades out over 1 hour
        return {
          id: m.id,
          type: m.metadata?.resourceType,
          location: m.metadata?.location!,
          sender: m.senderName,
          timestamp: m.timestamp,
          opacity
        };
      })
      .filter(r => r.opacity > 0);
  }, [messages]);

  // Combined node positions for visualization
  const activeNodes = useMemo(() => {
    if (!me) return peers;
    return [me, ...peers];
  }, [peers, me]);

  // Simple Distance-based Clustering for dense areas
  // If nodes are within threshold, group them for cleaner HUD
  const { clusters, individualNodes } = useMemo(() => {
    const threshold = 6; // units
    const processed = new Set<string>();
    const clusters: { id: string, center: { x: number, y: number }, count: number, nodes: any[] }[] = [];
    const individual: any[] = [];

    activeNodes.forEach((node, i) => {
      if (processed.has(node.id)) return;
      
      const clusterNodes = [node];
      processed.add(node.id);

      for (let j = i + 1; j < activeNodes.length; j++) {
        const other = activeNodes[j];
        if (processed.has(other.id)) continue;
        
        const dist = Math.hypot(node.location.x - other.location.x, node.location.y - other.location.y);
        if (dist < threshold) {
          clusterNodes.push(other);
          processed.add(other.id);
        }
      }

      if (clusterNodes.length > 1) {
        const centerX = clusterNodes.reduce((sum, n) => sum + n.location.x, 0) / clusterNodes.length;
        const centerY = clusterNodes.reduce((sum, n) => sum + n.location.y, 0) / clusterNodes.length;
        clusters.push({
          id: `cluster-${clusterNodes[0].id}`,
          center: { x: centerX, y: centerY },
          count: clusterNodes.length,
          nodes: clusterNodes
        });
      } else {
        individual.push(node);
      }
    });

    return { clusters, individualNodes: individual };
  }, [activeNodes]);

  const handleCenterOn = (item: MapItem) => {
    // Zoom in slightly and center
    setViewState({
      x: 50 - item.location.x * 1.5,
      y: 50 - item.location.y * 1.5,
      scale: 1.5
    });
  };

  // React to selection from outside (e.g. Peers list)
  useEffect(() => {
    if (selectedMapItem) {
      handleCenterOn(selectedMapItem);
    }
  }, [selectedMapItem]);

  const resetView = () => {
    setViewState({ x: 0, y: 0, scale: 1 });
    setSelectedMapItem(null);
  };

  const getResourceColor = (type: string) => {
    switch(type) {
      case 'water': return '#3b82f6';
      case 'food': return '#f59e0b';
      case 'medical': return '#ef4444';
      case 'shelter': return '#a855f7';
      default: return '#10b981';
    }
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 border border-white/5 rounded-xl overflow-hidden pattern-grid group/map">
      <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent opacity-50 pointer-events-none" />
      
      {/* Top Left Labels */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-[10px] font-mono text-emerald-500/60 uppercase font-bold tracking-[0.2em]">Local Mesh Scan</h3>
        <p className="text-[9px] font-mono text-zinc-600 mt-0.5 italic">Range: 250m simulated</p>
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {selectedMapItem && (
          <Button 
            variant="outline" 
            size="xs" 
            onClick={resetView}
            className="h-6 bg-zinc-900/80 border-white/10 text-[9px] font-mono uppercase tracking-tighter"
          >
            Reset View
          </Button>
        )}
      </div>

      <motion.div 
        className="w-full h-full origin-center"
        animate={{ 
          x: viewState.x, 
          y: viewState.y,
          scale: viewState.scale 
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
      >
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* LOS Indicators between all active nodes */}
          {activeNodes.map((node, i) => (
            activeNodes.slice(i + 1).map((node2) => {
              const dist = Math.hypot(node.location.x - node2.location.x, node.location.y - node2.location.y);
              // Simulated LOS threshold based on RSSI
              const maxRange = 35;
              if (dist < maxRange) { 
                const strength = Math.max(0, 1 - (dist / maxRange));
                const strokeWidth = 0.15 + (strength * 0.35);
                const opacity = 0.1 + (strength * 0.4);
                const id = `line-${node.id}-${node2.id}`;
                
                return (
                  <g key={id}>
                    <line
                      x1={node.location.x}
                      y1={node.location.y}
                      x2={node2.location.x}
                      y2={node2.location.y}
                      stroke={node.id === me?.id || node2.id === me?.id ? "rgba(59, 130, 246, 0.3)" : `rgba(16, 185, 129, ${opacity})`}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strength < 0.3 ? "0.5 0.5" : "none"}
                    />
                    {/* Animated data pulse on strong connections */}
                    {strength > 0.6 && (
                      <motion.circle
                        r="0.2"
                        fill="#10b981"
                        animate={{
                          cx: [node.location.x, node2.location.x],
                          cy: [node.location.y, node2.location.y]
                        }}
                        transition={{
                          duration: 2 + (1 - strength) * 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                  </g>
                );
              }
              return null;
            })
          ))}
          
          {/* Clustered Node Groups */}
          {clusters.map((cluster) => (
            <g key={cluster.id} className="cursor-pointer group/cluster">
              <motion.circle
                cx={cluster.center.x}
                cy={cluster.center.y}
                r="4"
                fill="rgba(16, 185, 129, 0.05)"
                stroke="rgba(16, 185, 129, 0.2)"
                strokeWidth="0.2"
                strokeDasharray="1 1"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <circle
                cx={cluster.center.x}
                cy={cluster.center.y}
                r="2.5"
                fill="rgba(24, 24, 27, 0.8)"
                stroke="rgba(16, 185, 129, 0.4)"
                strokeWidth="0.3"
              />
              <text
                x={cluster.center.x}
                y={cluster.center.y + 0.5}
                className="text-[2px] font-mono fill-emerald-500 font-bold"
                textAnchor="middle"
              >
                {cluster.count}
              </text>
              <text
                x={cluster.center.x}
                y={cluster.center.y + 3.5}
                className="text-[1.5px] font-mono fill-zinc-600 uppercase text-center opacity-0 group-hover/cluster:opacity-100 transition-opacity"
                textAnchor="middle"
              >
                Sync Group
              </text>
              
              {/* Show lines to individual nodes in the cluster on hover */}
              {cluster.nodes.map(n => (
                <line
                  key={`cluster-link-${n.id}`}
                  x1={cluster.center.x}
                  y1={cluster.center.y}
                  x2={n.location.x}
                  y2={n.location.y}
                  stroke="rgba(16, 185, 129, 0.2)"
                  strokeWidth="0.1"
                  className="opacity-0 group-hover/cluster:opacity-100 transition-opacity"
                />
              ))}
            </g>
          ))}

          {/* Individual Nodes */}
          {individualNodes.map((node) => (
            <g 
              key={node.id} 
              className="cursor-pointer transition-opacity hover:opacity-100"
              onClick={() => setSelectedMapItem({
                id: node.id,
                type: 'peer',
                location: node.location,
                label: node.name,
                details: node
              })}
            >
              <circle
                cx={node.location.x}
                cy={node.location.y}
                r={selectedMapItem?.id === node.id ? "3" : "2"}
                fill={node.id === me?.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}
                className={selectedMapItem?.id === node.id ? "" : "animate-pulse"}
              />
              <circle
                cx={node.location.x}
                cy={node.location.y}
                r="0.5"
                fill={node.id === me?.id ? '#10b981' : (node.isVerified ? '#3b82f6' : '#52525b')}
              />
              {node.id !== me?.id && (
                <text
                  x={node.location.x + 1}
                  y={node.location.y}
                  className="text-[2px] font-mono fill-zinc-600 pointer-events-none"
                >
                  {Math.round(node.rssi || 0)}dBm
                </text>
              )}
            </g>
          ))}

          {/* Ghost Nodes */}
          {ghostPeers.map((ghost) => (
            <g 
              key={ghost.id} 
              opacity="0.3" 
              className="cursor-pointer hover:opacity-60"
              onClick={() => setSelectedMapItem({
                id: ghost.id,
                type: 'ghost',
                location: ghost.location,
                label: `LAST SEEN: ${ghost.name}`,
                details: ghost
              })}
            >
              <line 
                x1={ghost.location.x - 0.5} y1={ghost.location.y - 0.5} 
                x2={ghost.location.x + 0.5} y2={ghost.location.y + 0.5} 
                stroke="#52525b" strokeWidth="0.2" 
              />
              <line 
                x1={ghost.location.x + 0.5} y1={ghost.location.y - 0.5} 
                x2={ghost.location.x - 0.5} y2={ghost.location.y + 0.5} 
                stroke="#52525b" strokeWidth="0.2" 
              />
            </g>
          ))}

          {/* Resources */}
          {resources.map((res) => (
            <g 
              key={res.id} 
              opacity={res.opacity} 
              className="cursor-pointer hover:opacity-100"
              onClick={() => setSelectedMapItem({
                id: res.id,
                type: 'resource',
                location: res.location,
                label: `${res.type?.toUpperCase()} POINT`,
                details: res
              })}
            >
              <rect 
                x={res.location.x - 1} 
                y={res.location.y - 1} 
                width={selectedMapItem?.id === res.id ? "3" : "2"}
                height={selectedMapItem?.id === res.id ? "3" : "2"}
                rx="0.5"
                fill={getResourceColor(res.type || '')}
                className={selectedMapItem?.id === res.id ? "" : "animate-bounce"}
                style={selectedMapItem?.id === res.id ? {} : { animationDuration: '3s' }}
              />
              <text
                x={res.location.x - 1}
                y={res.location.y - 1.5}
                className="text-[2px] font-mono uppercase font-bold pointer-events-none"
                fill={getResourceColor(res.type || '')}
              >
                {res.id === selectedMapItem?.id ? '' : res.type}
              </text>
            </g>
          ))}
        </svg>
      </motion.div>

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {selectedMapItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl z-30"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {selectedMapItem.type === 'peer' && <ShieldCheck className={`w-4 h-4 ${selectedMapItem.details.isVerified ? 'text-blue-400' : 'text-zinc-500'}`} />}
                {selectedMapItem.type === 'resource' && <MapPin className="w-4 h-4 text-emerald-400" />}
                {selectedMapItem.type === 'ghost' && <Info className="w-4 h-4 text-zinc-500" />}
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <h4 className="text-xs font-mono font-bold text-zinc-100 uppercase">
                      {selectedMapItem.label}
                    </h4>
                    {selectedMapItem.type === 'peer' && selectedMapItem.details.isVerified && (
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                  <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase">
                    ID: {selectedMapItem.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button onClick={resetView} className="p-1 hover:bg-white/5 rounded">
                <X className="w-3 h-3 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
              {selectedMapItem.type === 'peer' && (
                <>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Battery</span>
                    <div className="flex items-center gap-1">
                      <Battery className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-[10px] font-mono text-zinc-300">{Math.round(selectedMapItem.details.battery)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Signal</span>
                    <div className="flex items-center gap-1">
                      <Signal className="w-2.5 h-2.5 text-blue-500" />
                      <span className="text-[10px] font-mono text-zinc-300">{Math.round(selectedMapItem.details.rssi || 0)} dBm</span>
                    </div>
                  </div>
                </>
              )}
              {selectedMapItem.type === 'resource' && (
                <>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Type</span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">{selectedMapItem.details.type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Reported By</span>
                    <span className="text-[10px] font-mono text-zinc-300">{selectedMapItem.details.sender}</span>
                  </div>
                </>
              )}
              {selectedMapItem.type === 'ghost' && (
                <>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Status</span>
                    <span className="text-[10px] font-mono text-red-500 uppercase font-bold">Signal Lost</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Last Contact</span>
                    <span className="text-[10px] font-mono text-zinc-300">{new Date(selectedMapItem.details.lastSeen).toLocaleTimeString()}</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-3 flex justify-between items-center">
               <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-tighter">
                COORD: {Math.round(selectedMapItem.location.x)}, {Math.round(selectedMapItem.location.y)}
               </span>
               {selectedMapItem.type === 'peer' && selectedMapItem.id !== me?.id && (
                 <Button 
                   variant="secondary" 
                   size="xs" 
                   className="h-6 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-mono text-[9px] uppercase font-bold"
                   onClick={() => {
                     // Since we can't easily open the Dialog from here without refs, 
                     // we can at least provide a hint or just rely on the Peers list.
                     // However, to satisfy "chat box option is gone", we should ensure visibility.
                     toast.info("Secure Channel Available", {
                       description: `Select ${selectedMapItem.label} in the 'Nearby Nodes' tab to transmit data.`
                     });
                   }}
                 >
                   Open Secure Link
                 </Button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peer Overlays */}
      <div className="absolute bottom-4 right-4 text-right space-y-1 pointer-events-none opacity-40">
        {peers.slice(0, 3).map(p => (
           <div key={p.id} className="text-[9px] font-mono text-zinc-500">
             NODE_{p.id.toUpperCase()} CONNECTED
           </div>
        ))}
      </div>

      {/* Decorative scanning line */}
      <motion.div 
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[1px] bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-0 pointer-events-none"
      />

      {/* Connection Failure Overlay */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-950/20 backdrop-blur-[1px] pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 p-4 border border-red-500/30 bg-black/60 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Signal className="w-8 h-8 text-red-500 animate-pulse" />
              <div className="text-center">
                <h3 className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">Signal Lost</h3>
                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase">Attempting Mesh Re-entry...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
