import { io, Socket } from 'socket.io-client';
import { store } from '../app/store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = store.getState().auth.accessToken;
    socket = io('/', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
