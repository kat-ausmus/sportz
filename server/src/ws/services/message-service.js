import { sendJson } from './socket-service.js';
import { subscribe, unsubscribe } from './subscription-service.js';
import { WS_MESSAGE_EVENT, WS_MESSAGE_RSP } from './constants.js';

/**
 *
 * @param socket
 * @param data = { type, matchId }
 */
export function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: 'error', message: 'Invalid JSON' });
  }

  if (message?.type === WS_MESSAGE_EVENT.SUBSCRIBE && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: WS_MESSAGE_RSP.SUBSCRIBED, matchId: message.matchId });
    return;
  }

  if (message?.type === WS_MESSAGE_EVENT.UNSUBSCRIBE && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: WS_MESSAGE_RSP.UNSUBSCRIBED, matchId: message.matchId });
  }
}
