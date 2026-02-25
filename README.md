<div align="center">
  <br />
  <img src="./client/public/pie_logo.svg" alt="PieVideo Logo" width="160" />
  <br />
# PieVideo

  <h1><i>PieVideo — Connect Deeply, Play Freely.</i></h1>

  <p>
    <a href="https://github.com/yourusername/PieVideo/releases"><img src="https://img.shields.io/badge/VERSION-2.4.0-3b82f6?style=for-the-badge&logoColor=white" alt="Version" /></a>
    <a href="https://github.com/yourusername/PieVideo/blob/master/LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-10b981?style=for-the-badge&logoColor=white" alt="License" /></a>
    <img src="https://img.shields.io/badge/NEXT.JS-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/REACT-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <br />
    <img src="https://img.shields.io/badge/NODE.JS-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/FIREBASE-v10-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/SOCKET.IO-v4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
    <img src="https://img.shields.io/badge/WEBRTC-P2P-333333?style=for-the-badge&logoColor=white" alt="WebRTC" />
  </p>

  <br />

  <p>
    <b>🎯 High-Quality Video</b> • <b>🔄 Real-Time Sync</b> • <b>🎮 Interactive Games</b> • <b>🎬 Watch Together</b>
  </p>

  <p>
    <a href="#-getting-started"><b>🚀 Getting Started</b></a> •
    <a href="#-key-features"><b>✨ Features</b></a> •
    <a href="#-tech-stack"><b>🛠️ Tech Stack</b></a> •
    <a href="#-contributing"><b>🤝 Contributing</b></a>
  </p>
</div>

<hr />

## 📖 About PieVideo

PieVideo is a feature-rich, real-time video calling application designed specifically for couples, study partners, and close friends. Built from the ground up with modern web technologies, it goes far beyond simple video chat by integrating shared, real-time interactive experiences. 

Whether you want to watch movies together, draw on a shared whiteboard, play mini-games, or just fall asleep on a call with ambient sounds, **PieVideo** brings you closer.

<br />

## ✨ Key Features

| Feature | Description |
| ------- | ----------- |
| 📹 **High-Quality Video** | Crystal clear HD video and low-latency audio using WebRTC peer-to-peer connections (`simple-peer`). |
| 💬 **Real-Time Messaging** | Instant chat with rich emoji support, dynamic file sharing, and seamless image uploads. |
| 🎨 **Interactive Whiteboard** | Draw, sketch, and collaborate in real-time on a beautifully synchronized shared canvas. |
| 🎮 **Fun Mini-Games** | Engage in shared games directly on the call: **Pictionary**, **Truth or Dare**, and **Would You Rather**. |
| 🎬 **Watch Together** | Synchronized YouTube video playback. Play, pause, and scrub together in perfect harmony. |
| 🌙 **Goodnight Mode** | A calming, battery-saving sleep mode featuring starry background animations and soothing ambient sounds. |
| 💕 **Relationship Features** | Built-in "Days Together" counter, mood check-ins, and animated love reactions. |
| 🌗 **Premium UI/UX** | Stunning glassmorphism design, fluid animations, and a seamless toggle between **Light, Dark, and System** themes. |

<br />

## 🛠️ Tech Stack

PieVideo is built with a highly optimized, modern JavaScript stack bridging the frontend and backend for seamless real-time communication.

### **Frontend App**
- **Framework**: `Next.js 14` (App Router)
- **Library**: `React 18`
- **Styling**: `Vanilla CSS Modules` (Glassmorphism & Responsive Design)
- **State Management**: `React Context API`

### **Backend Server & Real-Time Setup**
- **Runtime**: `Node.js`
- **Framework**: `Express.js`
- **Real-Time Data**: `Socket.IO` (Signaling & Events)
- **Peer-to-Peer Video**: `WebRTC` (`simple-peer`)

### **Authentication & Database**
- **Database**: `Firebase Firestore`
- **Auth**: `Firebase Authentication`
- **Storage**: `Firebase Storage`

<br />

## 🚀 Getting Started

Follow these steps to set up PieVideo on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Firebase](https://firebase.google.com/) project (for Auth, Firestore, and Storage)

### 1. Clone the repository and install dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/PieVideo.git
cd PieVideo

# Install Backend Dependencies
cd server
npm install

# Install Frontend Dependencies
cd ../client
npm install
```

### 2. Environment Variables

You need to set up environment variables for both the client and the server.

#### Client (`client/.env.local`)
Create a `.env.local` file inside the `client` folder and add your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Backend Server URL
NEXT_PUBLIC_SERVER_URL=http://localhost:5000 
```

#### Server (`server/.env`)
Create a `.env` file inside the `server` folder:

```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:3000
```

### 3. Run the Development Servers



### 2. Running the App

You need to run the **Backend Server** and **Frontend Client** simultaneously.

You must run both the backend Express server and the frontend Next.js app simultaneously.

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev # or node server.js
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to start your first call! 🎉

<br />

## 📂 Project Structure

```text
PieVideo/
├── client/                 # Next.js 14 Frontend
│   ├── app/                # App Router (home, room, login pages)
│   ├── components/         # Reusable UI (VideoPlayer, ChatPanel, Controls)
│   ├── context/            # Global state (Theme, Auth, Call contexts)
│   ├── lib/                # Utilities (Firebase init, WebRTC config)
│   └── public/             # Static assets (Logos, icons, sounds)
│
└── server/                 # Node.js + Socket.IO Backend
    ├── server.js           # Main socket entry point (Signaling, Games)
    └── package.json        
```

<br />

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make to PieVideo are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br />


Distributed under the **MIT License**. See `LICENSE` for more information.

---
<div align="center">
  <sub>Built with ❤️ for better connections.</sub>
</div>
