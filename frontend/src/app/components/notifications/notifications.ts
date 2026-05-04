import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent implements OnInit, OnDestroy {

  notifications: any[] = this.loadFromStorage();
  private wsSub: Subscription | null = null;

  constructor(private ws: WebSocketService) {}

  // notifications.ts AND my-notifications.ts — same change for both

ngOnInit() {
  // Reload from storage every time we navigate to this page
  this.notifications = this.loadFromStorage();

  // Still subscribe to catch notifications received WHILE on this page
  this.wsSub = this.ws.messages$.subscribe((msg: any) => {
    if (msg.type === 'notification') {
      // Layout already saved to storage, just reload
      this.notifications = this.loadFromStorage();
    }
  });
}

  ngOnDestroy() {
    if (this.wsSub) this.wsSub.unsubscribe();
  }

  private loadFromStorage(): any[] {
    try {
      const stored = localStorage.getItem('notifications_proprietaire');
      return stored ? JSON.parse(stored) : this.defaultNotif();
    } catch {
      return this.defaultNotif();
    }
  }

  private saveToStorage() {
    localStorage.setItem('notifications_proprietaire', JSON.stringify(this.notifications));
  }

  private defaultNotif() {
    return [{
      type:        'info',
      title:       'Bienvenue sur JORILINA IMMO',
      description: 'Les nouvelles notifications apparaîtront ici en temps réel',
      time:        'Maintenant',
      read:        false
    }];
  }

  typeIcon(type: string) {
    const map: any = { danger: '🔴', success: '✅', info: '📄', warning: '⚠️' };
    return map[type] || '🔔';
  }

  unreadCount()  { return this.notifications.filter(n => !n.read).length; }

  markRead(n: any) {
    n.read = true;
    this.saveToStorage();
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
  }

  clearAll() {
    if (confirm('Effacer toutes les notifications ?')) {
      this.notifications = [];
      this.saveToStorage();
    }
  }
}