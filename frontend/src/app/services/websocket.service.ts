import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * SERVICE WEBSOCKET — Explication complète
 *
 * HTTP classique (ce qu'on utilise dans api.ts) :
 *   Angular envoie une requête → FastAPI répond → connexion fermée
 *   Comme envoyer une lettre : tu envoies, tu attends la réponse, fin
 *
 * WebSocket (ce fichier) :
 *   Angular ouvre une connexion permanente → les deux côtés peuvent envoyer/recevoir à tout moment
 *   Comme un appel téléphonique : ligne ouverte, on parle quand on veut
 *
 * Cas d'usage dans notre app :
 *   - Chat propriétaire ↔ locataire (messages instantanés)
 *   - Notifications en temps réel (paiement reçu, nouvelle facture...)
 *   - Sans WebSocket : il faudrait demander toutes les 5 secondes "y a-t-il des nouveaux messages ?"
 *   - Avec WebSocket : le serveur POUSSE le message dès qu'il arrive
 */

@Injectable({ providedIn: 'root' })
export class WebSocketService {

  // L'objet WebSocket natif du navigateur
  // null = pas encore connecté
  private socket: WebSocket | null = null;

  // Subject = un Observable qu'on peut émettre manuellement
  // Chaque fois qu'un message arrive, on l'émet ici
  // Les composants s'abonnent à ce Subject pour recevoir les messages
  private messageSubject = new Subject<any>();

  // Observable public que les composants utilisent pour s'abonner
  // Ex: this.wsService.messages$.subscribe(msg => this.handleMessage(msg))
  public messages$ = this.messageSubject.asObservable();

  // Timer pour la reconnexion automatique
  private reconnectTimer: any = null;

  // User connecté (pour reconnexion automatique)
  private userId: number | null = null;

  /**
   * CONNECT — ouvre la connexion WebSocket
   *
   * @param userId - ID de l'utilisateur connecté
   *
   * La connexion se fait sur : ws://localhost:8000/ws/{userId}
   * Remarque : "ws://" pour WebSocket, comme "http://" pour HTTP
   */
  connect(userId: number): void {
    // Si déjà connecté, ne pas ouvrir une deuxième connexion
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this.userId = userId;
    const url   = `ws://127.0.0.1:8000/ws/${userId}`;

    // Crée la connexion WebSocket
    // Le navigateur envoie une requête HTTP spéciale "Upgrade: websocket"
    // FastAPI accepte et bascule en mode WebSocket
    this.socket = new WebSocket(url);

    /**
     * onopen — appelé quand la connexion est établie
     * Comme quand l'appel téléphonique est décroché
     */
    this.socket.onopen = () => {
      console.log(`✅ WebSocket connecté pour user ${userId}`);
      // Annule le timer de reconnexion si actif
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    /**
     * onmessage — appelé à CHAQUE message reçu du serveur
     * C'est le cœur du système temps réel
     *
     * event.data = la chaîne JSON envoyée par FastAPI
     * On la parse et on l'émet aux composants abonnés
     */
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);  // parse le JSON
        this.messageSubject.next(message);         // émet aux abonnés
      } catch (e) {
        console.error('Erreur parsing WS message:', e);
      }
    };

    /**
     * onclose — appelé quand la connexion se ferme
     * Peut arriver si : serveur redémarré, internet coupé, timeout...
     * On tente de se reconnecter automatiquement après 3 secondes
     */
    this.socket.onclose = () => {
      console.log('🔌 WebSocket déconnecté, reconnexion dans 3s...');
      this.socket = null;
      // Reconnexion automatique après 3 secondes
      if (this.userId) {
        this.reconnectTimer = setTimeout(() => this.connect(this.userId!), 3000);
      }
    };

    /**
     * onerror — appelé en cas d'erreur (serveur indisponible...)
     * La connexion se ferme ensuite → onclose → reconnexion auto
     */
    this.socket.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
    };
  }

  /**
   * SEND — envoie un message au serveur
   *
   * @param data - objet JavaScript à envoyer (sera converti en JSON)
   *
   * FastAPI reçoit ce message dans la boucle while True du websocket_endpoint
   */
  send(data: any): void {
    // Vérifie que la connexion est ouverte avant d'envoyer
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));  // convertit en JSON et envoie
    } else {
      console.warn('WebSocket pas connecté — message non envoyé');
    }
  }

  /**
   * DISCONNECT — ferme la connexion proprement
   * Appelé dans layout.ts au logout
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.userId = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * SEND CHAT MESSAGE — raccourci pour envoyer un message de chat
   * Construit le bon format JSON attendu par FastAPI
   */
  sendChatMessage(toUserId: number, content: string, fromName: string): void {
    this.send({
      type:      'chat',       // type = chat
      to:        toUserId,     // destinataire
      content:   content,      // texte du message
      from_name: fromName      // nom de l'expéditeur
    });
  }

  /**
   * SEND NOTIFICATION — raccourci pour envoyer une notification
   */
  sendNotification(toUserId: number, title: string, content: string, notifType = 'info'): void {
    this.send({
      type:       'notification',
      to:         toUserId,
      title:      title,
      content:    content,
      notif_type: notifType
    });
  }
}
