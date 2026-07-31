<div align="center">
  <img src="client/public/favicon.svg" width="120" alt="FrogMeet Logo"/>
  <h1> FrogMeet</h1>
  <p><strong>A Real-Time, Neo-Brutalist Video Conferencing Platform</strong></p>

  <img src="client/src/assets/Calling%20Call%20Me%20GIF.gif" width="200" alt="Call Me" style="border-radius: 8px; margin: 16px auto; display: block;"/>

  <div>
    <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
    <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
    <img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  </div>
</div>

---

## Welcome to FrogMeet

**FrogMeet** is a modern, real-time video conferencing platform built to explore browser-based communication, peer-to-peer media streaming, and real-time collaboration. With a bold, agency-grade **neo-brutalist** design system, FrogMeet prioritizes both aesthetic impact and seamless functionality.

> **Status:** Active Development

<br>

<div align="center">
  <img src="client/public/heropage.png" alt="FrogMeet Landing Page" width="800" style="border: 4px solid #000; border-radius: 8px; box-shadow: 8px 8px 0px 0px #000;"/>
  <br>
  <em>The sleek, modern, neo-brutalist landing experience.</em>
</div>

<br>

---

## Key Features

FrogMeet provides a fast and responsive meeting experience where users can:

*  **Instant Meetings:** Start a new meeting with a single click.
*  **Join via Code:** Easily join an active room using a unique code.
*  **Pre-Join Screen:** Preview camera and microphone before entering the room.
*  **Hardware Controls:** Tactile, interactive buttons to toggle mic and camera states.
*  **Custom Neo-Brutalist UI:** A heavy, bold, high-contrast user interface that stands out.
*  **Real-Time Communication:** Fast, low-latency audio/video streaming via WebRTC (Coming soon!).

---

## Application Flow & Screens

<div align="center">
  <img src="client/public/3.png" alt="FrogMeet Meeting Interface" width="800" style="border: 4px solid #000; border-radius: 8px; box-shadow: 8px 8px 0px 0px #000;"/>
  <br>
  <em>Immersive video conferencing interface.</em>
</div>

### Navigation Flow

```mermaid
graph TD;
    A[Landing Page] -->|Generate Room ID| B(Start New Meeting)
    A -->|Enter Code| C(Join Existing)
    B --> D{Pre-Join Screen}
    C --> D
    D -->|Camera / Mic Controls| E[Meeting Room]
    
    E --> F[Video Streams]
    E --> G[Chat]
    E --> H[Screen Share]
```

---

## Technical Architecture

FrogMeet cleanly separates real-time signaling from peer-to-peer media communication.

* **Signaling Layer:** Socket.IO handles connection setup (Room joins, SDP offers, ICE candidates, Disconnect events).
* **Media Layer:** WebRTC manages direct real-time media communication (Camera, Microphone, Screen Sharing).

```mermaid
sequenceDiagram
    participant User A
    participant Server
    participant User B

    User A->>Server: Join Room
    User B->>Server: Join Room
    Server-->>User A: User Joined
    User A->>Server: SDP Offer
    Server-->>User B: SDP Offer
    User B->>Server: SDP Answer
    Server-->>User A: SDP Answer
    User A->>Server: ICE Candidate
    Server-->>User B: ICE Candidate
    User B->>Server: ICE Candidate
    Server-->>User A: ICE Candidate
    Note over User A,User B:  WebRTC Peer Connection Established 
```

---

## ⚙️ Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) & `npm`
* Git
* A modern browser with camera and microphone support

### 1. Clone & Setup

```bash
git clone https://github.com/UBX-CODE/FrogMeet.git
cd FrogMeet
```

### 2. Start the Frontend (Client)

```bash
cd client
npm install
npm run dev
```
> The frontend runs at `http://localhost:5173`

### 3. Start the Signaling Server

```bash
cd ../server
npm install
npm run dev
```
> The signaling server runs at `http://localhost:4000` (or your defined PORT)

---

## Current Limitations

As FrogMeet is under active development, note the following:
* Currently heavily focused on a peer-to-peer (mesh) architecture.
* For very large groups, an SFU (Selective Forwarding Unit) architecture would be needed.
* Authentication and persistent meeting histories are planned for future milestones.

---

## Author

**UBX-CODE**
* GitHub: [@UBX-CODE](https://github.com/UBX-CODE)

---

<div align="center">
  <p>Built while exploring real-time communication, WebRTC, and modern full-stack engineering.</p>
</div>
