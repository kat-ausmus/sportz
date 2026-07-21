import { WebSocket } from 'ws';
import { sendJson } from './socket-service.js';

const matchSubscribers = new Map();

export function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

export function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

export function cleanupSubscriptions(matchId) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  for (const socket of subscribers) {
    unsubscribe(matchId, socket);
  }
}

export function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      sendJson(socket, payload);
    }
  }
}
