import { toast } from 'svelte-sonner';
import { notificationsApi } from '$lib/api/endpoints';
import type { Notification } from '$lib/api/types';
import { auth } from './auth.svelte';

/** Close code dari Notification Service saat access token kedaluwarsa (lihat readme bagian WebSocket). */
const CLOSE_TOKEN_EXPIRED = 4001;
const LATEST_LIMIT = 5;
const MAX_RECONNECT_DELAY_MS = 30_000;

interface NotificationCreatedEvent {
  event: 'notification.created';
  data: Notification;
  meta?: { unread_count: number };
}

/**
 * Notifikasi realtime untuk owner: jumlah belum dibaca (lonceng), notifikasi terbaru, dan koneksi WebSocket
 * ke Notification Service (lewat nginx di /ws). Koneksi menyambung ulang otomatis kalau putus.
 */
class NotificationCenter {
  unreadCount = $state(0);
  latest = $state<Notification[]>([]);
  connected = $state(false);

  private socket: WebSocket | null = null;
  private running = false;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async start(): Promise<void> {
    if (this.running || !auth.can('notification:read')) return;
    this.running = true;
    await this.reload();
    void this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.unreadCount = 0;
    this.latest = [];
  }

  /** Ambil ulang dari API, misalnya setelah notifikasi dibaca atau setelah koneksi tersambung lagi. */
  async reload(): Promise<void> {
    try {
      const { data, meta } = await notificationsApi.list({ page: 1, limit: LATEST_LIMIT });
      this.latest = data;
      this.unreadCount = meta.unread_count;
    } catch {
      // Lonceng hanya pelengkap; error ditampilkan di halaman notifikasi
    }
  }

  async markAsRead(id: string): Promise<void> {
    await notificationsApi.markAsRead(id);
    await this.reload();
  }

  private async connect(): Promise<void> {
    if (!this.running) return;
    // Handshake WebSocket tidak bisa di-refresh otomatis seperti request API, jadi token dicek dulu
    if (auth.isAccessTokenExpired() && !(await auth.refresh())) {
      auth.logout();
      return;
    }

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws?access_token=${auth.accessToken}`);
    this.socket = socket;

    socket.onopen = () => {
      this.connected = true;
      this.reconnectDelay = 1000;
      // Notifikasi yang dibuat saat koneksi putus tidak dikirim ulang, jadi ambil dari API
      void this.reload();
    };
    socket.onmessage = (message) => this.handleMessage(message.data);
    socket.onclose = (event) => {
      this.connected = false;
      if (!this.running || this.socket !== socket) return;
      if (event.code === CLOSE_TOKEN_EXPIRED) {
        void this.connect();
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => void this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  }

  private handleMessage(raw: string): void {
    let event: NotificationCreatedEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (event.event !== 'notification.created') return;

    this.latest = [event.data, ...this.latest.filter((n) => n.id !== event.data.id)].slice(0, LATEST_LIMIT);
    this.unreadCount = event.meta?.unread_count ?? this.unreadCount + 1;
    toast.info(event.data.message);
  }
}

export const notificationCenter = new NotificationCenter();
