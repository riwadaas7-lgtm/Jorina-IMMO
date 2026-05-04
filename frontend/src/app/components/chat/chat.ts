import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  user    = JSON.parse(localStorage.getItem('user') || '{}');
  contacts: any[]  = [];
  activeContact: any = null;
  messages: { [key: number]: any[] } = {};
  newMessage  = '';
  loadingMsgs = false;
  unreadByContact: { [key: number]: number } = {};

  private wsSub: Subscription | null = null;
  private shouldScroll = false;

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  constructor(private api: ApiService, private ws: WebSocketService) {}

  ngOnInit() {
    this.loadContacts();

    // Écoute les messages WebSocket en temps réel
    this.wsSub = this.ws.messages$.subscribe((msg: any) => {
      if (msg.type === 'chat') {
        const contactId = msg.is_mine ? msg.receiver_id : msg.sender_id;
        if (!this.messages[contactId]) this.messages[contactId] = [];
        this.messages[contactId].push(msg);
        this.shouldScroll = true;

        // Badge non lu si ce contact n'est pas actif
        if (!this.activeContact || this.activeContact.id !== contactId) {
          if (!msg.is_mine) {
            this.unreadByContact[contactId] = (this.unreadByContact[contactId] || 0) + 1;
          }
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.wsSub) this.wsSub.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  scrollToBottom() {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  loadContacts() {
    this.api.getChatContacts(this.user.id).subscribe({
      next: (res: any[]) => {
        this.contacts = res.map(c => ({
          ...c,
          initials: ((c.prenom?.charAt(0) || '') + (c.nom?.charAt(0) || '')).toUpperCase()
        }));
      },
      error: () => this.contacts = []
    });
  }

  selectContact(contact: any) {
    this.activeContact = contact;
    this.unreadByContact[contact.id] = 0;
    this.loadingMsgs = true;

    // Charge l'historique depuis la base de données
    this.api.getMessages(this.user.id, contact.id).subscribe({
      next: (res: any[]) => {
        this.messages[contact.id] = res.map(m => ({
          ...m,
          is_mine: m.sender_id === this.user.id
        }));
        this.loadingMsgs  = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.loadingMsgs          = false;
        this.messages[contact.id] = [];
      }
    });
  }

  get currentMessages(): any[] {
    if (!this.activeContact) return [];
    return this.messages[this.activeContact.id] || [];
  }

  sendMessage() {
    const content = this.newMessage.trim();
    if (!content || !this.activeContact) return;

    this.ws.send({
      type:        'chat',
      to:          this.activeContact.id,
      receiver_id: this.activeContact.id,
      content:     content,
      from_name:   `${this.user.prenom} ${this.user.nom}`
    });

    this.newMessage = '';
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  totalUnread(): number {
    return Object.values(this.unreadByContact).reduce((s, n) => s + n, 0);
  }

  showDateSeparator(msgs: any[], i: number): boolean {
    if (i === 0) return true;
    return msgs[i - 1]?.date !== msgs[i]?.date;
  }
}