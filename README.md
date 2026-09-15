# Anime Focus Dashboard ????

A sleek, ambient desktop focus application designed for deep work, study sessions, and flow state. Built with Electron, React, and Tailwind CSS.

---

## ? Features

* **Custom Pomodoro Timer & Live Clock**: Full customizable intervals (Focus & Break modes), quick time extension buttons, and a real-time HUD clock with precision seconds.
* **Ambient Audio & YouTube Player**:
  * Integrated background ambient sound loops (Lo-Fi rain, binaural beats, night drives).
  * Native YouTube stream/playlist player with full playback control, ad bypass, volume snapping, and scrubber seeking.
* **Dynamic Backdrop Themes**:
  * Seamless MP4 live-animated wallpapers and curated static anime backdrops.
  * Custom media file upload support (.mp4, .webm, images).
  * Transparent desktop mode to interact with desktop icons while keeping HUD widgets pinned.
* **Action Items & Task Tracker**: Built-in interactive to-do manager with inline task editing, checkoffs, and persistence.
* **Customization & Controls**:
  * Draggable HUD widgets with smooth free-drag and snapping presets (Top, Center, Custom).
  * Canvas particle rain & lightning overlay toggles.
  * UI scaling (sm, md, lg, xl) and typography options (mono, sans, serif).

---

## ??? Tech Stack

* **Framework**: Electron
* **Frontend**: React + Vite
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Audio Engine**: Embedded YouTube Player Engine & HTML5 Audio with local Range Request streaming

---

## ?? Getting Started

### Prerequisites

Ensure you have Node.js installed (v18+ recommended).

### Installation

1. Clone the repository:
   git clone https://github.com/prabhsagoo/anime-focus-app.git
   cd anime-focus-app

2. Install dependencies:
   npm install

3. Run in development mode:
   npm run electron:dev

---

## ?? Building for Production

To compile and package the standalone Windows executable (.exe):
   npm run electron:build

The compiled binaries will be output to the dist-electron/ folder.

---

## ?? License

This project is licensed under the MIT License.
