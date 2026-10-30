
import React, { useMemo, useState, useEffect } from 'react';
import { useMesh } from '@/lib/MeshContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Battery, Signal, ShieldCheck, MapPin, Info } from 'lucide-react';
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
      case 'water': return '#64d2ff';
      case 'food': return '#ff9f0a';
      case 'medical': return '#ff453a';
      case 'shelter': return '#bf5af2';
      default: return '#30d158';
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0e0e10] ring-1 ring-inset ring-white/[0.08] rounded-2xl overflow-hidden pattern-grid group/map">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-[15px] font-semibold text-zinc-100">Mesh</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{activeNodes.length} {activeNodes.length === 1 ? 'device' : 'devices'} in range</p>
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {selectedMapItem && (
          <button
            onClick={resetView}
            className="h-7 px-3 rounded-full material text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Reset view
          </button>
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
        <svg className="w-full h-full" viewBox="22 22 56 56" preserveAspectRatio="xMidYMid meet">
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
                      stroke={node.id === me?.id || node2.id === me?.id ? `rgba(10, 132, 255, ${opacity + 0.15})` : `rgba(255, 255, 255, ${opacity * 0.6})`}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strength < 0.3 ? "0.5 0.5" : "none"}
                    />
                    {/* Animated data pulse on strong connections */}
                    {strength > 0.6 && (
                      <motion.circle
                        r="0.25"
                        fill="#64d2ff"
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
                fill="rgba(255, 255, 255, 0.03)"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="0.2"
                strokeDasharray="1 1"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <circle
                cx={cluster.center.x}
                cy={cluster.center.y}
                r="2.5"
                fill="rgba(44, 44, 46, 0.95)"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="0.3"
              />
              <text
                x={cluster.center.x}
                y={cluster.center.y + 0.5}
                className="text-[2px] fill-zinc-100 font-semibold"
                textAnchor="middle"
              >
                {cluster.count}
              </text>
              <text
                x={cluster.center.x}
                y={cluster.center.y + 3.5}
                className="text-[1.5px] fill-zinc-600 text-center opacity-0 group-hover/cluster:opacity-100 transition-opacity"
                textAnchor="middle"
              >
                Group
              </text>
              
              {/* Show lines to individual nodes in the cluster on hover */}
              {cluster.nodes.map(n => (
                <line
                  key={`cluster-link-${n.id}`}
                  x1={cluster.center.x}
                  y1={cluster.center.y}
                  x2={n.location.x}
                  y2={n.location.y}
                  stroke="rgba(255, 255, 255, 0.2)"
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
                fill={node.id === me?.id ? 'rgba(10, 132, 255, 0.2)' : node.isVerified ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.08)'}
                className={selectedMapItem?.id === node.id ? "" : "animate-pulse"}
              />
              <circle
                cx={node.location.x}
                cy={node.location.y}
                r={node.id === me?.id ? "0.9" : "0.7"}
                fill={node.id === me?.id ? '#0a84ff' : (node.isVerified ? '#30d158' : '#8e8e93')}
                stroke="#fff"
                strokeWidth={node.id === me?.id ? "0.3" : "0.15"}
              />
              {node.id !== me?.id && (
                <text
                  x={node.location.x + 1.8}
                  y={node.location.y + 0.6}
                  className="text-[1.8px] fill-zinc-500 pointer-events-none"
                >
                  {node.name}
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
                label: ghost.name,
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
                label: `${res.type?.[0].toUpperCase()}${res.type?.slice(1)}`,
                details: res
              })}
            >
              <circle
                cx={res.location.x - 2.6}
                cy={res.location.y - 2.6}
                r={selectedMapItem?.id === res.id ? "1.3" : "1"}
                fill={getResourceColor(res.type || '')}
                stroke="#0e0e10"
                strokeWidth="0.3"
              />
              <text
                x={res.location.x - 4}
                y={res.location.y - 2.1}
                textAnchor="end"
                className="text-[1.5px] font-semibold pointer-events-none capitalize"
                fill={getResourceColor(res.type || '')}
              >
                {res.type}
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
            className="absolute bottom-5 left-1/2 -translate-x-1/2 w-72 material rounded-2xl p-4 shadow-2xl z-30"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedMapItem.type === 'resource' ? 'bg-emerald-500/15' : selectedMapItem.type === 'ghost' ? 'bg-white/[0.06]' : selectedMapItem.id === me?.id ? 'bg-blue-500/15' : 'bg-white/[0.08]'
                }`}>
                  {selectedMapItem.type === 'peer' && <ShieldCheck className={`w-4 h-4 ${selectedMapItem.details.isVerified ? 'text-emerald-400' : selectedMapItem.id === me?.id ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {selectedMapItem.type === 'resource' && <MapPin className="w-4 h-4 text-emerald-400" />}
                  {selectedMapItem.type === 'ghost' && <Info className="w-4 h-4 text-zinc-500" />}
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-zinc-100 leading-tight">
                    {selectedMapItem.id === me?.id ? `${selectedMapItem.label} (you)` : selectedMapItem.label}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedMapItem.type === 'peer' && (selectedMapItem.details.isVerified ? 'Verified peer' : selectedMapItem.id === me?.id ? 'This device' : 'Unverified peer')}
                    {selectedMapItem.type === 'resource' && `Reported by ${selectedMapItem.details.sender}`}
                    {selectedMapItem.type === 'ghost' && 'Out of range'}
                  </p>
                </div>
              </div>
              <button onClick={resetView} className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/15 flex items-center justify-center">
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            </div>

            {selectedMapItem.type === 'peer' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="rounded-xl bg-white/[0.05] px-3 py-2">
                  <span className="text-[11px] text-zinc-500">Battery</span>
                  <div className="flex items-center gap-1 text-[13px] text-zinc-200 tabular-nums">
                    <Battery className="w-3.5 h-3.5 text-emerald-500" />
                    {Math.round(selectedMapItem.details.battery)}%
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.05] px-3 py-2">
                  <span className="text-[11px] text-zinc-500">Signal</span>
                  <div className="flex items-center gap-1 text-[13px] text-zinc-200 tabular-nums">
                    <Signal className="w-3.5 h-3.5 text-blue-500" />
                    {Math.round(selectedMapItem.details.rssi || 0)} dBm
                  </div>
                </div>
              </div>
            )}
            {selectedMapItem.type === 'ghost' && (
              <p className="mt-3 text-xs text-zinc-400">
                Last seen {new Date(selectedMapItem.details.lastSeen).toLocaleTimeString()}
              </p>
            )}
            {selectedMapItem.type === 'peer' && selectedMapItem.id !== me?.id && (
              <button
                className="mt-3 w-full h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium transition-colors"
                onClick={() => {
                  toast.info("Message from the Nearby tab", {
                    description: `Open Nearby and tap ${selectedMapItem.label} to send a direct message.`
                  });
                }}
              >
                Message
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-[11px] text-zinc-500 pointer-events-none">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />You</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Verified</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-500" />Peer</span>
      </div>

      {/* Connection Failure Overlay */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 px-6 py-5 material rounded-2xl">
              <Signal className="w-7 h-7 text-red-500 animate-pulse" />
              <div className="text-center">
                <h3 className="text-[14px] font-semibold text-zinc-100">Hub unreachable</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Direct peer links stay open. Reconnecting…</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
