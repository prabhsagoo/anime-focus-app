# Anime Focus Dashboard ⏱️🎧

A sleek, ambient desktop focus application designed for deep work, study sessions, and flow state. Built with Electron, React, and Tailwind CSS.

---

## ✨ Features

* **Custom Pomodoro Timer & Live Clock**

  * Fully customizable Focus and Break intervals.
  * Quick time extension buttons.
  * Real-time HUD clock with precision seconds.

* **Ambient Audio & YouTube Player**

  * Integrated background ambient sound loops:

    * Lo-Fi rain
    * Binaural beats
    * Night drives
  * Native YouTube stream and playlist player.
  * Full playback controls.
  * Ad bypass.
  * Volume snapping.
  * Scrubber seeking.

* **Dynamic Backdrop Themes**

  * Seamless MP4 live-animated wallpapers.
  * Curated static anime backdrops.
  * Custom media file upload support:

    * `.mp4`
    * `.webm`
    * Images
  * Transparent desktop mode to interact with desktop icons while keeping HUD widgets pinned.

* **Action Items & Task Tracker**

  * Built-in interactive to-do manager.
  * Inline task editing.
  * Task checkoffs.
  * Persistent task storage.

* **Customization & Controls**

  * Draggable HUD widgets.
  * Smooth free-drag functionality.
  * Snapping presets:

    * Top
    * Center
    * Custom
  * Canvas particle rain and lightning overlay toggles.
  * UI scaling options:

    * `sm`
    * `md`
    * `lg`
    * `xl`
  * Typography options:

    * Mono
    * Sans
    * Serif

---

## 🛠️ Tech Stack

* **Framework:** Electron
* **Frontend:** React + Vite
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Audio Engine:** Embedded YouTube Player Engine & HTML5 Audio with local Range Request streaming

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js installed.

Node.js `v18+` is recommended.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/prabhsagoo/anime-focus-app.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd anime-focus-app
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run the application in development mode:**

   ```bash
   npm run electron:dev
   ```

---

## 📦 Building for Production

To compile and package the standalone Windows executable (`.exe`), run:

```bash
npm run electron:build
```

The compiled binaries will be output to the `dist-electron/` folder.

---

## 📄 License

This project is licensed under the MIT License.
