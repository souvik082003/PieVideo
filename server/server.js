const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'videocall-secret-key-change-in-production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// CORS
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ===== IN-MEMORY STORES =====
const users = {};          // { email: { id, name, email, passwordHash } }
const rooms = {};          // { roomId: { users: {}, messages: [] } }
const MAX_MESSAGES = 100;
const MAX_USERS_PER_ROOM = 5;

// ===== AUTH HELPERS =====
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ===== AUTH ROUTES =====

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (users[email.toLowerCase()]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString()
    };
    users[user.email] = user;

    const token = generateToken(user);
    console.log(`[AUTH] Registered: ${user.email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users[email.toLowerCase()];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    console.log(`[AUTH] Login: ${user.email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google Sign-In (verify token from client-side Google Identity Services)
app.post('/auth/google', async (req, res) => {
  try {
    const { name, email, googleId } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if user exists, otherwise create
    let user = users[email.toLowerCase()];
    if (!user) {
      user = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        googleId,
        passwordHash: null,
        createdAt: new Date().toISOString()
      };
      users[user.email] = user;
      console.log(`[AUTH] Google register: ${user.email}`);
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('[AUTH] Google error:', err);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

// Verify token
app.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ user: { id: decoded.id, name: decoded.name, email: decoded.email } });
});

// ===== HTTP SERVER + SOCKET.IO =====
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for file transfers
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

// ===== SOCKET.IO EVENTS =====
io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`);
  let currentRoomId = null;
  let currentUserId = null;

  // ----- JOIN ROOM -----
  socket.on('join-room', ({ roomId, userId, userName }) => {
    console.log(`[JOIN] ${userName} (${userId}) → ${roomId}`);
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {}, messages: [] };
    }

    const count = Object.keys(rooms[roomId].users).length;
    if (count >= MAX_USERS_PER_ROOM) {
      socket.emit('room-full');
      return;
    }

    currentRoomId = roomId;
    currentUserId = userId;
    socket.join(roomId);

    rooms[roomId].users[userId] = {
      id: userId,
      name: userName,
      socketId: socket.id
    };

    socket.to(roomId).emit('user-connected', { userId, userName });
    socket.emit('room-users', Object.values(rooms[roomId].users));
    socket.emit('message-history', rooms[roomId].messages);
    console.log(`[ROOM ${roomId}] Users: ${Object.keys(rooms[roomId].users).length}`);
  });

  // ----- WEBRTC SIGNALING -----
  socket.on('send-signal', ({ userId, signal, to }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const target = rooms[currentRoomId].users[to];
    if (target?.socketId) {
      io.to(target.socketId).emit('user-signal', { from: userId, signal });
    }
  });

  // ----- MESSAGING -----
  socket.on('send-message', ({ roomId, userId, userName, message, type, fileName, fileData, fileType, fileSize, id }) => {
    if (!roomId || !rooms[roomId]) return;

    const msg = {
      id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      message: message || '',
      type: type || 'text',     // 'text' | 'file' | 'image'
      fileName: fileName || null,
      fileData: fileData || null,  // base64 for files
      fileType: fileType || null,
      fileSize: fileSize || 0,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };

    // Don't store large file data in message history
    const historyMsg = { ...msg };
    if (historyMsg.fileData && historyMsg.fileSize > 100000) {
      historyMsg.fileData = null; // strip large files from history
      historyMsg.message = `📎 ${historyMsg.fileName} (file too large for history)`;
    }

    rooms[roomId].messages.push(historyMsg);
    if (rooms[roomId].messages.length > MAX_MESSAGES) {
      rooms[roomId].messages.shift();
    }

    io.to(roomId).emit('receive-message', msg);
  });

  // ----- EMOJI -----
  socket.on('send-emoji', ({ userId, emoji }) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('receive-emoji', { userId, emoji });
  });

  // ----- LOVE REACTIONS -----
  socket.on('send-love-reaction', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('receive-love-reaction', data);
  });


  // ----- GAMES (Truth or Dare, Would You Rather) -----
  socket.on('send-game', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-game', data);
  });

  // ----- WATCH TOGETHER -----
  socket.on('send-watch', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-watch', data);
  });
  socket.on('send-watch-reaction', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-watch-reaction', data);
  });

  // ----- SHARED WHITEBOARD -----
  socket.on('send-draw', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-draw', data);
  });
  socket.on('send-clear-canvas', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-clear-canvas', data);
  });
  // Excalidraw collaborative scene sync
  socket.on('send-excalidraw-scene', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-excalidraw-scene', data);
  });

  // ----- GOODNIGHT MODE -----
  socket.on('send-goodnight', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-goodnight', data);
  });

  // ----- PICTIONARY -----
  socket.on('send-pictionary', (data) => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit('receive-pictionary', data);
  });

  // ----- DISCONNECT -----
  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT] ${socket.id} — ${reason}`);
    if (currentRoomId && rooms[currentRoomId] && currentUserId) {
      delete rooms[currentRoomId].users[currentUserId];
      socket.to(currentRoomId).emit('user-disconnected', currentUserId);

      if (Object.keys(rooms[currentRoomId].users).length === 0) {
        const rid = currentRoomId;
        setTimeout(() => {
          if (rooms[rid] && Object.keys(rooms[rid].users).length === 0) {
            delete rooms[rid];
            console.log(`[CLEANUP] Room ${rid} deleted`);
          }
        }, 5 * 60 * 1000);
      }
    }
  });
});

// ===== HEALTH + ROOT =====
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Video Call Server is running' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: Object.keys(rooms).length,
    users: Object.values(rooms).reduce((s, r) => s + Object.keys(r.users).length, 0),
    registeredUsers: Object.keys(users).length,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});