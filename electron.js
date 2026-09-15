import { app, BrowserWindow, Tray, Menu, ipcMain, screen, session } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let audioPlayerWindow = null;
let tray = null;
let server = null;
const PROD_PORT = 4545;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// 1. Built-in local server for MP4 background streaming in production
function startLocalServer() {
  return new Promise((resolve) => {
    const MIME_TYPES = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm'
    };

    server = http.createServer((req, res) => {
      let safeUrl = req.url.split('?')[0].split('#')[0];
      if (safeUrl === '/' || !safeUrl) safeUrl = '/index.html';

      const filePath = path.join(app.getAppPath(), 'dist', decodeURIComponent(safeUrl));
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          const indexPath = path.join(app.getAppPath(), 'dist/index.html');
          fs.readFile(indexPath, (readErr, content) => {
            if (readErr) { res.writeHead(404); res.end(); } 
            else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(content); }
          });
          return;
        }

        const range = req.headers.range;
        if (range && ext === '.mp4') {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
          const chunksize = end - start + 1;
          const file = fs.createReadStream(filePath, { start, end });

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType
          });
          file.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': stats.size,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes'
          });
          fs.createReadStream(filePath).pipe(res);
        }
      });
    });

    server.listen(PROD_PORT, '127.0.0.1', resolve);
  });
}

// 2. Hidden Audio Engine Setup
function createAudioPlayer() {
  if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) return;

  const audioSession = session.fromPartition('persist:focus-audio-session');

  audioSession.webRequest.onBeforeRequest({
    urls: [
      '*://*.doubleclick.net/*',
      '*://*.googlesyndication.com/*',
      '*://*.googleadservices.com/*',
      '*://*.youtube.com/api/stats/ads*',
      '*://*.youtube.com/pagead/*',
      '*://*.youtube.com/ptracking*',
      '*://*.youtube.com/get_midroll_info*',
      '*://*.youtube.com/youtubei/v1/player/ad_break*'
    ]
  }, (details, callback) => {
    callback({ cancel: true });
  });

  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  audioSession.setUserAgent(chromeUA);

  audioPlayerWindow = new BrowserWindow({
    width: 640,
    height: 360,
    show: false, 
    webPreferences: {
      session: audioSession,
      nodeIntegration: false,
      contextIsolation: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
}

// 3. Unbreakable Main-Process Polling Loop (Tailored for Embeds)
setInterval(async () => {
  if (audioPlayerWindow && !audioPlayerWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
    try {
      const stats = await audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const video = document.querySelector('video');
          const player = document.getElementById('movie_player');
          
          // Kill Ads aggressively
          const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
          const adOverlay = document.querySelector('.ad-showing, .ad-interrupting');
          const isAd = !!skipBtn || !!adOverlay;

          if (isAd && video) {
            video.muted = true;
            video.playbackRate = 16;
            if (video.duration > 2) video.currentTime = video.duration - 0.5;
            if (skipBtn) skipBtn.click();
          }

          // Extract correct title dynamically from the Embed Player API
          let title = '';
          if (player && typeof player.getVideoData === 'function') {
            const data = player.getVideoData();
            if (data && data.title) title = data.title;
          }
          if (!title) {
            const titleEl = document.querySelector('.ytp-title-link');
            if (titleEl) title = titleEl.textContent.trim();
          }

          // Force Play if stalled by browser policy
          if (video && video.paused && video.currentTime < 1 && !isAd) {
            const largePlay = document.querySelector('.ytp-large-play-button');
            if (largePlay) largePlay.click();
            else video.play().catch(()=>{});
          }

          // Gather stats & Auto-next
          let cur = 0, dur = 0, paused = true;
          if (player && typeof player.getCurrentTime === 'function' && !isAd) {
            cur = player.getCurrentTime();
            dur = player.getDuration();
            paused = player.getPlayerState() === 2 || player.getPlayerState() === -1;
            
            if (player.getPlayerState() === 0 && typeof player.nextVideo === 'function') {
              player.nextVideo();
            }
          } else if (video) {
            cur = video.currentTime;
            dur = video.duration;
            paused = video.paused;
          }

          return {
            currentTime: cur || 0,
            duration: dur || 0,
            paused: paused,
            title: title && !title.toLowerCase().includes('not currently available') ? title : null
          };
        })();
      `);
      
      if (stats) {
        mainWindow.webContents.send('yt-stats-update', stats);
      }
    } catch (e) {}
  }
}, 400);

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
    mainWindow.loadURL(`http://127.0.0.1:${PROD_PORT}`);
  }

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  // Background Audio IPC Bridge
  ipcMain.on('yt-play-id', (event, { targetId, isPlaylist, volume }) => {
    createAudioPlayer();

    // 🚨 CRITICAL CHANGE: Use /embed/ to bypass YouTube Device Integrity Checks
    const targetUrl = isPlaylist
      ? `https://www.youtube.com/embed/videoseries?list=${targetId}&autoplay=1`
      : `https://www.youtube.com/embed/${targetId}?autoplay=1`;

    audioPlayerWindow.loadURL(targetUrl, { httpReferrer: 'https://www.google.com/' });
    audioPlayerWindow.webContents.setAudioMuted(false);

    audioPlayerWindow.webContents.once('did-finish-load', () => {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function playNative() {
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          const largePlay = document.querySelector('.ytp-large-play-button');
          
          if (largePlay) largePlay.click();

          if (player && typeof player.playVideo === 'function') {
            player.setVolume(${volume * 100});
            if (${volume} > 0) player.unMute();
            player.playVideo();
          } else if (video) {
            video.volume = ${volume};
            video.muted = ${volume} === 0;
            video.play().catch(() => {});
          } else {
            setTimeout(playNative, 250);
          }
        })();
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
        (function() {
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          if (player && typeof player.setVolume === 'function') {
            if (${vol} === 0) {
              player.mute();
              player.setVolume(0);
            } else {
              player.unMute();
              player.setVolume(${vol * 100});
            }
          } else if (video) {
            video.volume = ${vol};
            video.muted = ${vol === 0};
          }
        })();
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-toggle-play', (event, shouldPlay) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          if (player && typeof player.playVideo === 'function') {
            ${shouldPlay} ? player.playVideo() : player.pauseVideo();
          } else if (video) {
            ${shouldPlay} ? video.play() : video.pause();
          }
        })();
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-seek', (event, targetTime) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          if (player && typeof player.seekTo === 'function') {
            player.seekTo(${targetTime}, true);
          } else if (video) {
            video.currentTime = ${targetTime};
          }
        })();
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-skip-seconds', (event, seconds) => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
            const curr = player.getCurrentTime() || 0;
            player.seekTo(Math.max(0, curr + (${seconds})), true);
          } else if (video) {
            video.currentTime = Math.max(0, video.currentTime + (${seconds}));
          }
        })();
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-next-track', () => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const nextBtn = document.querySelector('.ytp-next-button');
          if (nextBtn) {
            nextBtn.click();
          } else {
            const player = document.getElementById('movie_player');
            if (player && typeof player.nextVideo === 'function') player.nextVideo();
          }
        })();
      `).catch(() => {});
    }
  });

  ipcMain.on('yt-prev-track', () => {
    if (audioPlayerWindow && !audioPlayerWindow.isDestroyed()) {
      audioPlayerWindow.webContents.executeJavaScript(`
        (function() {
          const prevBtn = document.querySelector('.ytp-prev-button');
          if (prevBtn) {
            prevBtn.click();
          } else {
            const player = document.getElementById('movie_player');
            if (player && typeof player.previousVideo === 'function') player.previousVideo();
          }
        })();
      `).catch(() => {});
    }
  });

  createTray();
}

function createTray() {
  let iconPath = path.join(app.getAppPath(), 'public/favicon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(app.getAppPath(), 'dist/wallpapers/Car.png');
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
        if (server) server.close();
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

app.whenReady().then(async () => {
  if (app.isPackaged || process.env.NODE_ENV === 'production') {
    await startLocalServer();
  }
  createWindow();
});

app.on('window-all-closed', (e) => {
  if (!app.isQuitting) {
    e.preventDefault();
  }
});

app.on('will-quit', () => {
  if (server) server.close();
});