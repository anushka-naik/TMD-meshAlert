
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMesh } from '@/lib/MeshContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Radio, Send, AlertTriangle, MapPin, ShieldCheck,
  Droplets, Utensils, HeartPulse, Home, Reply, X, CornerDownRight, Clock, Lock,
  Hash, Plus, Check
} from 'lucide-react';
import { CommunityNotes } from '@/components/CommunityNotes';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Channel definitions ───────────────────────────────────────────────────────

interface Channel {
  id: string;
  label: string;
  color: string; // tailwind color token
}

const BASE_CHANNELS: Channel[] = [
  { id: 'general',   label: 'general',   color: 'blue'  },
  { id: 'emergency', label: 'emergency', color: 'red'   },
  { id: 'medical',   label: 'medical',   color: 'rose'  },
  { id: 'logistics', label: 'logistics', color: 'amber' },
];

const CHANNEL_COLORS: Record<string, string> = {
  emerald: 'text-emerald-400 bg-emerald-500/15',
  red: 'text-red-400 bg-red-500/15',
  rose: 'text-rose-400 bg-rose-500/15',
  amber: 'text-amber-400 bg-amber-500/15',
  blue: 'text-blue-400 bg-blue-500/15',
  purple: 'text-purple-400 bg-purple-500/15',
  cyan: 'text-cyan-400 bg-cyan-500/15',
};

// Cycles through accent colors for user-created channels
const CUSTOM_COLORS = ['blue', 'purple', 'cyan', 'amber'];

function getChannelStyle(color: string, active: boolean) {
  const base = CHANNEL_COLORS[color] ?? CHANNEL_COLORS['blue'];
  if (active) return base;
  return `text-zinc-400 bg-white/[0.06] hover:bg-white/10 hover:text-zinc-200`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BroadcastHub = () => {
  const { messages, broadcast, sendDirect, me } = useMesh();

  // ── Channel state ──────────────────────────────────────────────────────────

  const [customChannels, setCustomChannels] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem('mesh_custom_channels');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const newChannelInputRef = useRef<HTMLInputElement>(null);

  // All channels = base + custom + any discovered from incoming messages
  const discoveredChannels = useMemo(() => {
    const known = new Set([...BASE_CHANNELS, ...customChannels].map(c => c.id));
    const discovered: Channel[] = [];
    for (const msg of messages) {
      const ch = msg.metadata?.channel;
      if (ch && !known.has(ch)) {
        known.add(ch);
        discovered.push({ id: ch, label: ch, color: 'blue' });
      }
    }
    return discovered;
  }, [messages, customChannels]);

  const allChannels = useMemo(
    () => [...BASE_CHANNELS, ...customChannels, ...discoveredChannels],
    [customChannels, discoveredChannels]
  );

  // Persist custom channels
  useEffect(() => {
    localStorage.setItem('mesh_custom_channels', JSON.stringify(customChannels));
  }, [customChannels]);

  // Track unread counts when messages arrive for inactive channels
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length <= prevMessageCount.current) {
      prevMessageCount.current = messages.length;
      return;
    }
    const newMsgs = messages.slice(prevMessageCount.current);
    prevMessageCount.current = messages.length;

    const delta: Record<string, number> = {};
    for (const msg of newMsgs) {
      if (msg.type === 'direct') continue;
      const ch = msg.metadata?.channel ?? 'general';
      if (ch !== activeChannelId) {
        delta[ch] = (delta[ch] ?? 0) + 1;
      }
    }
    if (Object.keys(delta).length > 0) {
      setUnread(prev => {
        const next = { ...prev };
        for (const [id, count] of Object.entries(delta)) next[id] = (next[id] ?? 0) + count;
        return next;
      });
    }
  }, [messages, activeChannelId]);

  const switchChannel = (id: string) => {
    setActiveChannelId(id);
    setUnread(prev => ({ ...prev, [id]: 0 }));
  };

  const commitNewChannel = () => {
    const slug = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!slug) { setIsCreating(false); setNewChannelName(''); return; }
    if (allChannels.find(c => c.id === slug)) {
      toast.error('Channel already exists');
      return;
    }
    const color = CUSTOM_COLORS[customChannels.length % CUSTOM_COLORS.length];
    const newCh: Channel = { id: slug, label: slug, color };
    setCustomChannels(prev => [...prev, newCh]);
    setIsCreating(false);
    setNewChannelName('');
    switchChannel(slug);
    toast.success(`Channel #${slug} created`);
  };

  useEffect(() => {
    if (isCreating) newChannelInputRef.current?.focus();
  }, [isCreating]);

  // ── Message state ──────────────────────────────────────────────────────────

  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, sender: string, content: string, senderId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages for the active channel
  const channelMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.type === 'direct') return true; // DMs always show
      const ch = msg.metadata?.channel ?? 'general';
      return ch === activeChannelId;
    });
  }, [messages, activeChannelId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [channelMessages]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!content.trim()) return;
    if (replyingTo && replyingTo.senderId) {
      sendDirect(replyingTo.senderId, content, { id: replyingTo.id, content: replyingTo.content });
      setReplyingTo(null);
    } else {
      broadcast(content, 'broadcast', { channel: activeChannelId });
    }
    setContent('');
  };

  const handleAlert = () => {
    if (!content.trim()) return;
    broadcast(content, 'alert', { channel: activeChannelId });
    setContent('');
  };

  const sendEmergency = () => {
    broadcast("SOS — I need help at my current location.", "alert", { channel: 'emergency' });
    toast.error("SOS sent", {
      description: "Your alert went out to everyone on the mesh.",
      duration: 5000,
    });
  };

  const reportResource = (type: 'water' | 'food' | 'medical' | 'shelter') => {
    if (!me) return;
    const label = type[0].toUpperCase() + type.slice(1);
    const info = `${label} available here — reported by ${me.name}.`;
    broadcast(info, "broadcast", {
      resourceType: type,
      location: me.location,
      intensity: 100,
      channel: activeChannelId,
    });
    toast.success(`${label} reported`, {
      description: "Pinned on the map for everyone nearby."
    });
  };

  // ── Active channel metadata ────────────────────────────────────────────────

  const activeChannel = allChannels.find(c => c.id === activeChannelId) ?? BASE_CHANNELS[0];
  const placeholder = activeChannelId === 'general'
    ? 'Message everyone nearby'
    : `Message #${activeChannel.label}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Channel strip + actions ────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center gap-1.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
          {allChannels.map(ch => {
            const isActive = ch.id === activeChannelId;
            const count = unread[ch.id] ?? 0;
            return (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch.id)}
                className={`relative flex items-center gap-0.5 px-3 h-7 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${getChannelStyle(ch.color, isActive)}`}
              >
                <Hash className="w-3 h-3 shrink-0 opacity-70" />
                {ch.label}
                {count > 0 && !isActive && (
                  <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Create channel */}
          <AnimatePresence>
            {isCreating ? (
              <motion.div
                key="input"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-1 overflow-hidden shrink-0"
              >
                <div className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-white/10">
                  <Hash className="w-3 h-3 text-zinc-400 shrink-0" />
                  <input
                    ref={newChannelInputRef}
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitNewChannel();
                      if (e.key === 'Escape') { setIsCreating(false); setNewChannelName(''); }
                    }}
                    placeholder="channel-name"
                    className="w-28 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none"
                    maxLength={20}
                  />
                  <button onClick={commitNewChannel} className="text-blue-400 hover:text-blue-300 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setIsCreating(false); setNewChannelName(''); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="plus"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors shrink-0"
                title="New channel"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto pl-2 flex items-center gap-2 shrink-0">
          <Popover>
            <PopoverTrigger render={<button className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium bg-white/[0.06] text-zinc-300 hover:bg-white/10 transition-colors" />}>
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Report</span>
            </PopoverTrigger>
            <PopoverContent className="w-56 material rounded-2xl p-2 shadow-2xl">
              <p className="text-xs text-zinc-500 mb-1.5 px-2 pt-1">Mark a resource at your location</p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  ['water', 'Water', Droplets, 'text-blue-500'],
                  ['food', 'Food', Utensils, 'text-amber-500'],
                  ['medical', 'Medical', HeartPulse, 'text-red-500'],
                  ['shelter', 'Shelter', Home, 'text-purple-500'],
                ] as const).map(([type, label, Icon, color]) => (
                  <button
                    key={type}
                    onClick={() => reportResource(type)}
                    className="h-9 px-2.5 rounded-xl flex items-center gap-2 text-[13px] text-zinc-200 hover:bg-white/[0.08] transition-colors"
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button
            className="h-7 px-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors shadow-[0_0_16px_rgba(255,69,58,0.35)]"
            onClick={sendEmergency}
          >
            SOS
          </button>
        </div>
      </div>

      {/* ── Message list ───────────────────────────────────────────────────── */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-4 py-3">
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {channelMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-2"
              >
                <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-zinc-500" />
                </div>
                <p className="text-[13px] text-zinc-500">Nothing on #{activeChannelId} yet</p>
              </motion.div>
            )}
            {channelMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-3.5 py-3 rounded-2xl group/msg transition-colors ${
                  msg.type === 'alert'
                    ? 'bg-red-500/[0.12] ring-1 ring-inset ring-red-500/25'
                    : msg.type === 'direct'
                    ? 'bg-blue-500/[0.12] ring-1 ring-inset ring-blue-500/20'
                    : 'bg-white/[0.05]'
                }`}
              >
                {msg.metadata?.replyToId && (
                  <div className="mb-2 pl-2.5 border-l-2 border-blue-500/60 flex items-start gap-1.5">
                    <CornerDownRight className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400 truncate">
                      {msg.metadata.replyToContent || 'Original message unavailable'}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[13px] font-semibold truncate ${
                      msg.type === 'alert' ? 'text-red-400' : msg.type === 'direct' ? 'text-blue-400' : 'text-zinc-100'
                    }`}>
                      {msg.senderName}
                      {msg.type === 'direct' && !msg.metadata?.isIncoming && ` → ${msg.metadata?.recipientName}`}
                    </span>
                    <div className="flex items-center gap-1 group/hash">
                      {msg.signature && (
                        <span title="Signed with sender's ECDSA key" className="flex items-center gap-0.5 text-[11px] text-emerald-500">
                          <ShieldCheck className="w-3 h-3" />
                          Signed
                        </span>
                      )}
                      {msg.metadata?.isEncrypted && (
                        <span className="flex items-center gap-0.5 text-[11px] text-blue-400">
                          <Lock className="w-3 h-3" />
                          Encrypted
                        </span>
                      )}
                      {msg.isPending && (
                        <span className="flex items-center gap-0.5 text-[11px] text-amber-400">
                          <Clock className="w-3 h-3" />
                          Queued
                        </span>
                      )}
                      {msg.hash && (
                        <span className="text-[11px] font-mono text-zinc-600 hidden group-hover/msg:inline leading-none ml-1">
                          {msg.hash.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {format(msg.timestamp, 'h:mm a')}
                    </span>
                    {msg.type === 'direct' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                        onClick={() => setReplyingTo({ id: msg.id, sender: msg.senderName, content: msg.content, senderId: msg.senderId })}
                      >
                        <Reply className="w-3 h-3 text-blue-400" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[14px] text-zinc-200 leading-relaxed">
                  {msg.type === 'alert' && <AlertTriangle className="inline w-3.5 h-3.5 text-red-400 mr-1.5 -mt-0.5" />}
                  {msg.content}
                </p>

                {/* Community notes — only on broadcast/alert messages */}
                {(msg.type === 'broadcast' || msg.type === 'alert') && (
                  <CommunityNotes messageId={msg.id} messageSenderId={msg.senderId} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* ── Compose ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 border-t border-white/[0.06] space-y-2.5">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 rounded-xl bg-blue-500/10 flex items-center justify-between">
                <div className="flex items-start gap-2 min-w-0">
                  <Reply className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-400 leading-none mb-1">
                      Replying to {replyingTo.sender}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{replyingTo.content}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-blue-500/20" onClick={() => setReplyingTo(null)}>
                  <X className="w-3.5 h-3.5 text-blue-400" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-center">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            className="bg-white/[0.06] border-transparent text-zinc-100 placeholder:text-zinc-500 text-[14px] h-10 rounded-full px-4 focus-visible:ring-blue-500/40"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="h-10 w-10 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-white/[0.06] disabled:text-zinc-600 text-white flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAlert}
            disabled={!content.trim()}
            className="flex-1 h-8 rounded-full text-[13px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Send as alert
          </button>
          <button
            className="flex-1 h-8 rounded-full text-[13px] font-medium text-zinc-300 bg-white/[0.06] hover:bg-white/10 flex items-center justify-center gap-1.5 transition-colors"
            onClick={() => broadcast("Checking in — I'm safe.", "broadcast", { channel: activeChannelId })}
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            I'm safe
          </button>
        </div>
      </div>
    </div>
  );
};
