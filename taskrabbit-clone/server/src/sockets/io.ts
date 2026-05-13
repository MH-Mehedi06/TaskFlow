import { Server as SocketServer } from 'socket.io';

let _io: SocketServer | null = null;

export const setIo = (io: SocketServer): void => { _io = io; };
export const getIo = (): SocketServer | null => _io;
