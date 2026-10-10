import { Server } from 'socket.io';
import logger from '../utils/logger.js';

let io = null;

export const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust to specific frontend URL in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket Client Connected: ${socket.id}`);

    // Join room based on user role/id/department
    socket.on('join_session', (userData) => {
      if (!userData) return;

      // Join individual user room
      if (userData._id) {
        const userRoom = `user_${userData._id}`;
        socket.join(userRoom);
        logger.debug(`Socket ${socket.id} joined individual room: ${userRoom}`);
      }

      // Join role room
      if (userData.role) {
        const roleRoom = `role_${userData.role.replace(' ', '_')}`;
        socket.join(roleRoom);
        logger.debug(`Socket ${socket.id} joined role room: ${roleRoom}`);
      }

      // Join department room if applicable
      if (userData.role === 'Department Officer' && userData.department) {
        const deptId = typeof userData.department === 'object' ? userData.department._id : userData.department;
        const deptRoom = `dept_${deptId}`;
        socket.join(deptRoom);
        logger.debug(`Socket ${socket.id} joined department room: ${deptRoom}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};
