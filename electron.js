import { app, BrowserWindow, Tray, Menu, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let audioPlayerWindow = null;
let tray = null;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function createAudioPlayer() {
  if (audioPlayerWindow) return;

  audioPlayerWindow = new BrowserWindow({
    width: 640,
    height: 360,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  audioPlayerWindow.webContents.setUserAgent(chromeUA);

  // Poll video time and send to mainWindow for scrubber
  audioPlayerWindow.webContents.on('did-finish-load', () => {
    audioPlayerWindow.webContents.executeJavaScript(`
      setInterval(() => {
        const video = document.querySelector('video');
        if (video) {
          window.electronBridge = {
            currentTime: video.currentTime || 0,
            duration: video.duration || 0,
            paused: video.paused
          };
        }
      }, 500);
    `).catch(() => {});
  });
}

// Intercept time polling
setInterval(async () => {
  if (audioPlayerWindow && mainWindow && !audioPlayerWindow.isDestroyed() && !mainWindow.isDestroyed()) {
    try {
      const stats = await audioPlayerWindow.webContents.executeJavaScript(`window.electronBridge || null`);
      if (stats) {
        mainWindow.webContents.send('yt-stats-update', stats);
      }
    } catch (_) {}
  }
}, 500);

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Dynamic Click-Through IPC Handler
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  // Background YouTube Audio Engine IPC Handlers
  ipcMain.on('yt-play', (event, { url, volume }) => {
    createAudioPlayer();
    audioPlayerWindow.loadURL(url);
    audioPlayerWindow.webContents.setAudioMuted(false);

    audioPlayerWindow.webContents.once('did-finish-load', () => {
      audioPlayerWindow.webContents.executeJavaScript(`
        const playNative = () => {
          const video = document.querySelector('video');
          if (video) {
            video.volume = ${volume};
            video.muted = false;
            video.play().catch(() => {});
          } else {
            setTimeout(playNative, 300);
          }
        };
        playNative();
      `).catch(() => {});
    });
  });

  ipcMain.on('yt-stop', () => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.loadURL('about:blank');
    }
  });

  ipcMain.on('yt-volume', (event, vol) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const video = document.querySelector('video');
        if (video) {
          video.volume = ${vol};
          video.muted = false;
        }
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-toggle-play', (event, shouldPlay) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const video = document.querySelector('video');
        if (video) {
          ${shouldPlay} ? video.play() : video.pause();
        }
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-seek', (event, targetTime) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const video = document.querySelector('video');
        if (video) video.currentTime = ${targetTime};
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-skip-seconds', (event, seconds) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const video = document.querySelector('video');
        if (video) video.currentTime = Math.max(0, video.currentTime + (${seconds}));
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-next-track', () => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const nextBtn = document.querySelector('.ytp-next-button');
        if (nextBtn) {
          nextBtn.click();
        } else {
          const video = document.querySelector('video');
          if (video && video.duration) video.currentTime = video.duration - 0.5;
        }
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-prev-track', () => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        const prevBtn = document.querySelector('.ytp-prev-button');
        if (prevBtn) {
          prevBtn.click();
        } else {
          const video = document.querySelector('video');
          if (video) video.currentTime = 0;
        }
      `).catch(() => {});
    }
  });

  createTray();
}

function createTray() {
  let iconPath = path.join(__dirname, 'public/favicon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'public/wallpapers/Car.png');
  }

  try {
    tray = new Tray(iconPath);
  } catch {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Anime Focus Dashboard', enabled: false },
    { type: 'separator' },
    {
      label: 'Show / Focus Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Toggle DevTools',
      click: () => {
        if (mainWindow) mainWindow.webContents.toggleDevTools();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) audioPlayerWindow.destroy();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Anime Focus Dashboard');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createAudioPlayer();
  createWindow();
});

app.on('window-all-closed', (e) => {
  if (!app.isQuitting) {
    e.preventDefault();
  }
});