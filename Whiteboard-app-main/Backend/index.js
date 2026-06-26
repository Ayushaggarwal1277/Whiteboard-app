require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const userRoute = require('./Routes/userRoute');
const canvasRoute = require('./Routes/canvasRoute');
const connectToDatabase = require('./db');

connectToDatabase();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());

app.use('/users', userRoute);
app.use('/canvas', canvasRoute);

// Redis setup for socket.io
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  adapter: createAdapter(pubClient, subClient)
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-canvas', (canvasId) => {
    socket.join(canvasId);
    console.log(`User ${socket.id} joined canvas ${canvasId}`);
  });

  socket.on('canvas-update', ({ canvasId, elements }) => {
    socket.to(canvasId).emit('canvas-updated', elements);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
