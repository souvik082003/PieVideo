# PieVideo

**Connect Deeply, Play Freely.**
PieVideo is a feature-rich, real-time video calling application designed for couples and close friends. Built with modern web technologies, it goes beyond simple video chat by integrating shared experiences like games, whiteboards, and watch-together functionality.

![PieVideo Logo](./client/public/pie_logo.svg)

## ✨ Key Features

-   **High-Quality Video Calls**: Crystal clear HD video using WebRTC (`simple-peer`).
-   **Real-Time Messaging**: Chat with emoji support, file sharing, and image uploads.
-   **Interactive Whiteboard**: Draw and collaborate in real-time on a shared canvas.
-   **Fun Games**:
    -   **Pictionary**: Draw and guess words with your partner.
    -   **Truth or Dare**: Hundreds of questions to spark conversation.
    -   **Would You Rather**: Fun scenarios to debate.
-   **Watch Together**: Synchronized YouTube video playback.
-   **Goodnight Mode 🌙**: A calming sleep mode with starry animations and ambient sounds.
-   **Couple Features**:
    -   "Days Together" counter.
    -   Mood check-ins.
    -   Love reactions (floating hearts/emojis).
-   **Premium Design**: Glassmorphism UI, animated backgrounds, and dark mode.

## 🛠️ Tech Stack

-   **Frontend**: Next.js 14 (App Router), React, CSS Modules.
-   **Backend**: Node.js, Express, Socket.IO (Signaling & Real-time events).
-   **Database**: Firebase Firestore (Persistence), Firebase Auth.
-   **Video/Audio**: WebRTC (Peer-to-Peer), `simple-peer`.
-   **Styling**: Custom CSS with Glassmorphism and Animations.

## 🚀 Getting Started

### Prerequisites
-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   npm (Node Package Manager)

### 1. Installation

Clone the repository and install dependencies for both client and server:

```bash
# 1. Clone the repo
git clone https://github.com/your-username/PieVideo.git
cd PieVideo

# 2. Install Server Dependencies
cd server
npm install

# 3. Install Client Dependencies
cd ../client
npm install
```




### 2. Running the App

You need to run the **Backend Server** and **Frontend Client** simultaneously.

**Option A: Two Terminals**

**Terminal 1 (Server):**
```bash
cd server
node server.js
# Server running on port 5000
```

**Terminal 2 (Client):**
```bash
cd client
npm run dev
# Ready in ... http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start using PieVideo!

## 📂 Project Structure

-   `client/`: Next.js frontend application.
    -   `app/`: App Router pages (`home`, `room`, `login`).
    -   `components/`: Reusable UI components (`VideoPlayer`, `ChatPanel`, `Whiteboard`, etc.).
    -   `lib/`: Utility functions (`firebase.js`, `socket.js`).
-   `server/`: Node.js + Socket.IO backend.
    -   `server.js`: Main entry point handling socket events and API routes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
