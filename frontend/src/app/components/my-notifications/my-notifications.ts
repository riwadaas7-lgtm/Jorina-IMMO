import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../notifications/notifications.html',  // reuse same template
  styleUrl: '../notifications/notifications.css'
})
export class MyNotificationsComponent {

  notifications = [
    {
      type: 'success',
      title: 'Paiement confirmé',
      description: 'Votre paiement de 1,200€ a été reçu et confirmé',
      time: 'Il y a 1 heure',
      read: false
    },
    {
      type: 'warning',
      title: 'Loyer à payer',
      description: 'Votre loyer d\'Avril 2026 est dû le 05/04/2026',
      time: 'Il y a 3 heures',
      read: false
    },
    {
      type: 'info',
      title: 'Contrat renouvelé',
      description: 'Votre contrat a été renouvelé jusqu\'au 31/12/2027',
      time: 'Il y a 2 jours',
      read: true
    },
    {
      type: 'info',
      title: 'Nouvelle facture',
      description: 'Une facture d\'électricité de 85€ a été ajoutée',
      time: 'Il y a 5 jours',
      read: true
    }
  ];

  typeIcon(type: string) {
    const map: any = { danger: '🔴', success: '✅', info: '📄', warning: '⚠️' };
    return map[type] || '🔔';
  }

  unreadCount() { return this.notifications.filter(n => !n.read).length; }
  markAllRead() { this.notifications.forEach(n => n.read = true); }
}