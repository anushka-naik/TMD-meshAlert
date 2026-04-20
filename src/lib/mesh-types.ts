
export interface Peer {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  battery: number;
  lastSeen: number;
  location: { x: number; y: number };
  role: 'coordinator' | 'node' | 'relay';
  isVerified?: boolean;
  verifiedAt?: number;
  signingKey?: string; // Base64 encoded public signing key (ECDSA)
  encryptionKey?: string; // Base64 encoded public encryption key (ECDH)
  rssi?: number; // Simulated Received Signal Strength Indicator
}

export interface MeshMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'broadcast' | 'direct' | 'alert' | 'route';
  hops: number;
  hash: string;
  prevHash: string;
  signature?: string;
  isPending?: boolean;
  metadata?: {
    resourceType?: 'water' | 'food' | 'medical' | 'shelter' | 'danger';
    location?: { x: number; y: number };
    intensity?: number;
    isIncoming?: boolean;
    recipientName?: string;
    replyToId?: string;
    replyToContent?: string;
    isEncrypted?: boolean;
    iv?: string; // Initialization vector for AES-GCM
    wrappedKey?: string; // Content encryption key encrypted with the shared secret
  };
}

export interface NetworkState {
  peers: Peer[];
  messages: MeshMessage[];
  lastUpdate: number;
  ledgerTip: string; // The hash of the latest verified message
}

export type MapItemType = 'peer' | 'resource' | 'ghost';

export interface MapItem {
  id: string;
  type: MapItemType;
  location: { x: number; y: number };
  label: string;
  details?: any;
}
