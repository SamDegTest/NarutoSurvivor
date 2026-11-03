// ============================================================
//  NarutoSurvivor — Multiplayer Manager (WebRTC P2P + BroadcastChannel)
//  Handles Room Hosting, Joining, and Low-Latency State Sync
// ============================================================

import { Peer, type DataConnection } from 'peerjs';
import type { Character } from '../types/character';

export interface MultiplayerPlayerState {
  id: string;
  characterId: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  isAwakened: boolean;
  facingLeft: boolean;
}

export interface MultiplayerMessage {
  type: 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'STATE_SYNC' | 'JUTSU_CAST' | 'AWAKEN' | 'BOSS_PORTAL_ENTER';
  senderId: string;
  payload: any;
  timestamp: number;
}

export type MultiplayerMode = 'single' | 'local_coop' | 'online_host' | 'online_client';

export class MultiplayerManager {
  private static instance?: MultiplayerManager;

  mode: MultiplayerMode = 'single';
  localPeerId = '';
  remotePeerId = '';
  isHost = false;
  isConnected = false;

  p2Character?: Character;

  private peer?: Peer;
  private connection?: DataConnection;
  private broadcastChannel?: BroadcastChannel;

  onConnected?: (remoteName: string, characterId: string) => void;
  onDisconnected?: () => void;
  onRemoteStateReceived?: (state: MultiplayerPlayerState) => void;
  onRemoteJutsuCast?: (jutsuId: string, angle: number) => void;
  onRemoteAwaken?: () => void;

  private constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('naruto_survivor_coop');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  static getInstance(): MultiplayerManager {
    if (!MultiplayerManager.instance) {
      MultiplayerManager.instance = new MultiplayerManager();
    }
    return MultiplayerManager.instance;
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KONOHA-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async hostRoom(roomCode: string, localChar: Character): Promise<string> {
    this.mode = 'online_host';
    this.isHost = true;
    this.localPeerId = roomCode;

    return new Promise((resolve) => {
      try {
        // Destroy existing peer if any
        if (this.peer) this.peer.destroy();

        // Create Peer with custom room code id
        const cleanId = `ns-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        this.peer = new Peer(cleanId, {
          debug: 1,
        });

        this.peer.on('open', () => {
          this.localPeerId = roomCode;
          resolve(roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.connection = conn;
          this.setupConnectionHandlers(localChar);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS server notice, falling back to local BroadcastChannel if same-machine:', err);
          resolve(roomCode);
        });
      } catch (err) {
        console.error('Error starting PeerJS host:', err);
        resolve(roomCode);
      }
    });
  }

  async joinRoom(roomCode: string, localChar: Character): Promise<boolean> {
    this.mode = 'online_client';
    this.isHost = false;
    this.remotePeerId = roomCode;

    return new Promise((resolve) => {
      try {
        if (this.peer) this.peer.destroy();

        this.peer = new Peer({ debug: 1 });
        this.peer.on('open', () => {
          const cleanHostId = `ns-${roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const conn = this.peer!.connect(cleanHostId, { reliable: true });
          this.connection = conn;
          this.setupConnectionHandlers(localChar);

          conn.on('open', () => {
            this.isConnected = true;
            this.sendMessage({
              type: 'PLAYER_JOIN',
              senderId: this.peer!.id,
              payload: {
                name: localChar.nameIT,
                characterId: localChar.id,
              },
              timestamp: Date.now(),
            });
            resolve(true);
          });
        });

        // Broadcast fallback for same-machine tab join
        setTimeout(() => {
          if (!this.isConnected && this.broadcastChannel) {
            this.sendMessage({
              type: 'PLAYER_JOIN',
              senderId: 'client-tab',
              payload: {
                name: localChar.nameIT,
                characterId: localChar.id,
              },
              timestamp: Date.now(),
            });
            this.isConnected = true;
            resolve(true);
          }
        }, 1200);

        this.peer.on('error', () => {
          // Fallback to BroadcastChannel
          this.isConnected = true;
          resolve(true);
        });
      } catch (err) {
        console.error('Join error:', err);
        resolve(true);
      }
    });
  }

  private setupConnectionHandlers(localChar: Character): void {
    if (!this.connection) return;

    this.connection.on('open', () => {
      this.isConnected = true;
      // Send welcome
      this.sendMessage({
        type: 'PLAYER_JOIN',
        senderId: this.peer?.id || 'host',
        payload: {
          name: localChar.nameIT,
          characterId: localChar.id,
        },
        timestamp: Date.now(),
      });
    });

    this.connection.on('data', (data: any) => {
      this.handleIncomingMessage(data);
    });

    this.connection.on('close', () => {
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected();
    });
  }

  sendMessage(msg: MultiplayerMessage): void {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch (e) {
        console.warn('Send error:', e);
      }
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        // ignore
      }
    }
  }

  private handleIncomingMessage(msg: MultiplayerMessage): void {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'PLAYER_JOIN':
        this.isConnected = true;
        if (this.onConnected) {
          this.onConnected(msg.payload.name, msg.payload.characterId);
        }
        break;
      case 'STATE_SYNC':
        if (this.onRemoteStateReceived) {
          this.onRemoteStateReceived(msg.payload);
        }
        break;
      case 'JUTSU_CAST':
        if (this.onRemoteJutsuCast) {
          this.onRemoteJutsuCast(msg.payload.jutsuId, msg.payload.angle);
        }
        break;
      case 'AWAKEN':
        if (this.onRemoteAwaken) {
          this.onRemoteAwaken();
        }
        break;
      case 'PLAYER_LEAVE':
        this.isConnected = false;
        if (this.onDisconnected) {
          this.onDisconnected();
        }
        break;
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.sendMessage({
        type: 'PLAYER_LEAVE',
        senderId: this.peer?.id || '',
        payload: {},
        timestamp: Date.now(),
      });
      this.connection.close();
      this.connection = undefined;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = undefined;
    }
    this.isConnected = false;
    this.mode = 'single';
  }
}

export const multiplayerManager = MultiplayerManager.getInstance();
