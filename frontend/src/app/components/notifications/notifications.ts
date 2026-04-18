import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent {

  notifications = [
    {
      type: 'danger',
      title: 'Paiement en retard',
      description: 'Le loyer de Mars 2026 n\'a pas été reçu',
      time: 'Il y a 2 heures',
      read: false
    },
    {
      type: 'success',
      title: 'Paiement confirmé',
      description: 'Paiement de 1,200€ reçu de Marie Dubois',
      time: 'Il y a 5 heures',
      read: false
    },
    {
      type: 'info',
      title: 'Nouveau contrat',
      description: 'Contrat signé pour l\'appartement A102',
      time: 'Il y a 1 jour',
      read: true
    },
    {
      type: 'warning',
      title: 'Contrat à renouveler',
      description: 'Le contrat de Pierre Martin expire dans 30 jours',
      time: 'Il y a 2 jours',
      read: true
    },
    {
      type: 'info',
      title: 'Nouveau locataire',
      description: 'Sophie Bernard a rejoint l\'appartement B205',
      time: 'Il y a 3 jours',
      read: true
    }
  ];

  typeIcon(type: string) {
    const map: any = {
      danger:  '🔴',
      success: '✅',
      info:    '📄',
      warning: '⚠️'
    };
    return map[type] || '🔔';
  }

  unreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
  }
}