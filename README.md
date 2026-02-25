<div align="center">
  <br />
  <img src="./client/public/pie_logo.svg" alt="PieVideo Logo" width="160" />
  <br />
  
# PieVideo

  <h1><i>PieVideo — Connect Deeply, Play Freely.</i></h1>

  <p>
    <a href="https://github.com/souvik082003/PieVideo/releases"><img src="https://img.shields.io/badge/VERSION-2.4.0-3b82f6?style=for-the-badge&logoColor=white" alt="Version" /></a>
    <a href="https://github.com/souvik082003/PieVideo/blob/master/LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-10b981?style=for-the-badge&logoColor=white" alt="License" /></a>
    <a href="https://github.com/yourusername/PieVideo/releases"><img src="https://img.shields.io/badge/VERSION-1.1.0-3b82f6?style=for-the-badge&logoColor=white" alt="Version" /></a>
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
    <a href="#-about-pievideo"><b>📖 About</b></a> •
    <a href="#-whats-new-in-v2"><b>🚀 What's New in v2</b></a> •
    <a href="#-key-features"><b>✨ Features</b></a> •
    <a href="#-tech-stack"><b>🛠️ Tech Stack</b></a>
  </p>
</div>

<hr />

## 📖 About PieVideo

PieVideo is a feature-rich, real-time video calling application designed specifically for couples, study partners, and close friends. Built from the ground up with modern web technologies, it goes far beyond simple video chat by integrating shared, real-time interactive experiences. 

Whether you want to watch movies together, draw on a shared whiteboard, play mini-games, or just hang out on a call with synced media, **PieVideo** brings you closer. Originally conceived to solve the problem of boring standard video calls, PieVideo is your all-in-one private virtual living room.

<br />

## 🚀 What's New in v2 (The Evolution from v1.0.0)

PieVideo has undergone a massive transformation from its initial `v1.0.0` release. While v1 provided the core foundation for P2P video calls and basic chat, **v2** introduces a completely overhauled experience focusing on premium aesthetics, powerful new interactive tools, and flawless mobile support.

### 🎨 1. Total UI & Aesthetics Overhaul
- **From Basic to Premium:** We stripped away the basic, chunky UI of v1 in favor of a sleek, modern glassmorphic design system. 
- **Theming Done Right:** Replaced the clutter of 4+ custom color themes with a clean, automatic `Light`, `Dark`, and `System` theme engine that perfectly respects your OS preferences with high-contrast colors.
- **Modern Dashboards:** The Home Page dashboard has been completely reimagined to feature "Quick Rooms", animated stats, and a far more intuitive room-joining process.
- **Brand Identity:** A brand new, premium SVG gradient icon logo replaces the old placeholder.

### 🛠️ 2. Professional Collaboration Tools
- **Excalidraw Integration:** The old, basic HTML5 Canvas whiteboard from v1 is gone! We have fully integrated the powerful `@excalidraw/excalidraw` engine, allowing for professional-grade diagramming, infinite canvas, and shape manipulation—all synced perfectly in real-time between peers.

### 🎬 3. Watch Together V2
- **Youtube Syncing Engine:** We implemented a robust YouTube sync engine that allows participants to paste *any* standard YouTube link directly into the room.
- **Theater & Party Modes:** 
  - *Theater Mode* pushes the video to full view while keeping friends visible in a clean vertical sidebar.
  - *Watch Party Mode* gives you a stadium-style UI for optimal co-watching!

### 📱 4. Zero-Compromise Mobile Experience
- **100% Responsive Engine:** v1 struggled on phones. For v2, every single screen—from the login portal to the active call view—has been custom-tailored with specific CSS breakpoints for iPads, tablets, and iPhones. 
- **Touch-First Controls:** The floating controls bar dynamically hides text labels and shrinks into perfectly sized icon pills on smaller screens.
- **Safe Area Support:** Full custom CSS support for `100dvh` (Dynamic Viewport Height) to prevent scrolling issues, `16px` locked inputs to prevent iOS auto-zoom, and `env(safe-area-inset-bottom)` to perfectly align the UI with modern notched smartphones.

<br />

## ✨ Key Features

| Feature | Description |
| ------- | ----------- |
| 📹 **P2P Video** | Crystal clear HD video and low-latency audio using WebRTC peer-to-peer connections (`simple-peer`). |
| 💬 **Real-Time Messaging** | Instant chat panel supporting text, emojis, file sharing, and seamless image uploads. |
| 🎨 **Excalidraw Whiteboard** | Draw, sketch, note-take, and collaborate in real-time on a beautifully synchronized Excalidraw canvas. |
| 🎮 **Fun Mini-Games** | Engage in shared games directly on the call: **Pictionary**, **Truth or Dare**, and **Would You Rather**. |
| 🎬 **Watch Together** | Synchronized YouTube video playback. Play, pause, scrub, and react together in perfect harmony. |
| 💕 **Relationship Tools** | Built-in "Days Together" tracking, user mood check-ins, and animated floating love reactions. |

<br />

## 🛠️ Tech Stack Architecture

PieVideo utilizes a highly optimized JavaScript stack, bridging the frontend client and the backend signaling server for seamless, instant real-time communication.

### **Frontend Client**
- **Framework**: `Next.js 14` (App Router)
- **Library**: `React 18`
- **Styling**: `Vanilla CSS Modules` (Focusing on zero-dependency minimal bundle sizes, glassmorphism, and complex responsive grids)
- **State Management**: Core `React Context API` (Handling complex Theme, Auth, and Call signaling state)

### **Backend Signaling Server**
- **Runtime**: `Node.js`
- **Framework**: `Express.js`
- **Real-Time Engine**: `Socket.IO` v4 (Handling all WebRTC signaling data, synced game state, chat delivery, and live Excalidraw drawing points)
- **Peer-to-Peer Video**: `WebRTC` (Facilitated safely by `simple-peer`)
- **Real-Time Data**: `Socket.IO` (Signaling & Events)
- **Peer-to-Peer Video**: `WebRTC` (`simple-peer`)

### **Authentication & Database**
- **Database**: `Firebase Firestore`
- **Auth**: `Firebase Authentication`
- **Storage**: `Firebase Storage`

<br />



### **Authentication & Persistence**
- **Database**: `Firebase Firestore` (For user profiles, friend lists, and call history tracking)
- **Auth**: `Firebase Authentication` (Secure Google OAuth & standard Email/Password login)

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
