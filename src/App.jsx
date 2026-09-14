import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, Plus, Music, Settings as SettingsIcon, 
  Volume2, Check, Trash2, Edit2, X, Image as ImageIcon,
  Flame, Coffee, Upload, Zap, Move, Play, Pause,
  RotateCcw as SkipBack15, RotateCw as SkipFwd15,
  SkipForward, SkipBack, Radio
} from 'lucide-react';

const DEFAULT_WALLPAPERS = [
  { id: 'none', name: 'Transparent (Desktop)', url: '', type: 'none' },
  { id: 'zenitsu-rain', name: 'Zenitsu Storm 4K (Live)', url: 'https://assets.mixkit.co/videos/preview/mixkit-thunderstorm-with-lightning-in-the-night-sky-41544-large.mp4', type: 'video' },
  { id: 'cyberpunk-city', name: 'Cyber Neon 8K', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=3840&auto=format&fit=crop', type: 'image' },
  { id: 'shrine-rain', name: 'Tokyo Rain 8K', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=3840&auto=format&fit=crop', type: 'image' },
  { id: 'cosmic-flow', name: 'Anime Cosmos 8K', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=3840&auto=format&fit=crop', type: 'image' }
];

const SOUNDS = [
  { id: 'lofi', name: 'Lo-Fi Rain & Thunder', url: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=rain-and-nostalgia-lofi-112347.mp3' },
  { id: 'ambient', name: 'Tokyo Night Drive', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-lofi-song-8444.mp3' },
  { id: 'brown', name: 'Deep Binaural Focus', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88424c5229.mp3?filename=lofi-study-112191.mp3' }
];

const YT_PRESETS = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl 24/7', type: 'video' },
  { id: '4xDzrJKXOOY', name: 'Synthwave Radio', type: 'video' },
  { id: 'PLozT_Fq2yO7d6eK6R0K5m4N8h0S-fG8w1', name: 'Anime Chill Playlist', type: 'playlist' }
];

const FONT_STYLES = {
  mono: 'font-mono tracking-tight',
  sans: 'font-sans font-extralight tracking-tight',
  serif: 'font-serif tracking-normal'
};

const UI_SCALES = {
  sm: { clock: 'text-7xl', box: 'w-[19rem]' },
  md: { clock: 'text-8xl', box: 'w-[22rem]' },
  lg: { clock: 'text-9xl', box: 'w-[25rem]' },
  xl: { clock: 'text-[11rem]', box: 'w-[28rem]' }
};

const parseYouTubeUrl = (url) => {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  const playlistMatch = cleanUrl.match(/[?&]list=([^#&?]+)/);
  const playlistId = playlistMatch ? playlistMatch[1] : null;

  const videoMatch = cleanUrl.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=[\\&]?)([^#&?]{11})/);
  const videoId = videoMatch ? videoMatch[1] : null;

  if (playlistId) {
    return { type: 'playlist', targetId: playlistId, videoId: videoId };
  }
  if (videoId) {
    return { type: 'video', targetId: videoId, videoId: videoId };
  }
  return null;
};

// Format seconds into MM:SS or HH:MM:SS
const formatAudioTime = (sec) => {
  if (!sec || isNaN(sec)) return '0:00';
  const totalSeconds = Math.floor(sec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function App() {
  const [focusDuration, setFocusDuration] = useState(() => {
    try { return Number(localStorage.getItem('focusDuration')) || 25; } catch { return 25; }
  });
  const [breakDuration, setBreakDuration] = useState(() => {
    try { return Number(localStorage.getItem('breakDuration')) || 5; } catch { return 5; }
  });
  const [uiScale, setUiScale] = useState(() => {
    try { return localStorage.getItem('uiScale') || 'md'; } catch { return 'md'; }
  });
  const [fontStyle, setFontStyle] = useState(() => {
    try { return localStorage.getItem('fontStyle') || 'mono'; } catch { return 'mono'; }
  });
  
  const [currentBg, setCurrentBg] = useState(() => {
    try { 
      const bg = localStorage.getItem('currentBg');
      return bg === 'custom' ? 'none' : (bg || 'none'); 
    } catch { return 'none'; }
  });
  
  const [customBg, setCustomBg] = useState('');
  const [customBgType, setCustomBgType] = useState('image');
  const [enableParticles, setEnableParticles] = useState(() => {
    try { return localStorage.getItem('enableParticles') === 'true'; } catch { return false; }
  });

  const [layoutMode, setLayoutMode] = useState(() => {
    try { return localStorage.getItem('layoutMode') || 'top'; } catch { return 'top'; }
  });
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('widgetPos');
      return saved ? JSON.parse(saved) : { x: window.innerWidth / 2 - 176, y: 70 };
    } catch { return { x: 100, y: 70 }; }
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Pomodoro
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  
  // Task Editing
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  
  // Audio & YouTube State
  const [activeTab, setActiveTab] = useState(null);
  const [audioMode, setAudioMode] = useState('ambient');
  const [selectedSound, setSelectedSound] = useState(null);
  const [volume, setVolume] = useState(0.6);
  const [ytUrl, setYtUrl] = useState('');
  const [ytState, setYtState] = useState({ isPlaying: false, isReady: false, isPlaylist: false, currentTitle: '' });
  
  // Draggable Seeking Progress State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const audioRef = useRef(new Audio());
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const widgetRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragDataRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0, currentX: 0, currentY: 0 });
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('focusDuration', focusDuration);
      localStorage.setItem('breakDuration', breakDuration);
      localStorage.setItem('uiScale', uiScale);
      localStorage.setItem('fontStyle', fontStyle);
      localStorage.setItem('currentBg', currentBg === 'custom' ? 'none' : currentBg);
      localStorage.setItem('enableParticles', enableParticles);
      localStorage.setItem('layoutMode', layoutMode);
      localStorage.setItem('widgetPos', JSON.stringify(pos));
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (err) {
      console.warn('LocalStorage guarded:', err);
    }
  }, [focusDuration, breakDuration, uiScale, fontStyle, currentBg, enableParticles, layoutMode, pos, tasks]);

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      const nextMode = !isBreak;
      setIsBreak(nextMode);
      setTimeLeft(nextMode ? breakDuration * 60 : focusDuration * 60);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak, focusDuration, breakDuration]);

  useEffect(() => {
    if (selectedSound && audioMode === 'ambient') {
      const track = SOUNDS.find(s => s.id === selectedSound);
      if (track) {
        audioRef.current.src = track.url;
        audioRef.current.loop = true;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
      }
    } else {
      audioRef.current.pause();
    }
    return () => audioRef.current.pause();
  }, [selectedSound, audioMode]);

  useEffect(() => {
    audioRef.current.volume = volume;
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  // Live Position / Duration Poller
  useEffect(() => {
    let interval;
    if (ytState.isPlaying && ytState.isReady && !isSeeking) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const curr = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(curr);
          setDuration(dur);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [ytState.isPlaying, ytState.isReady, isSeeking]);

  const startYouTubeStream = (targetId, isPlaylist) => {
    setSelectedSound(null);
    audioRef.current.pause();

    if (!window.YT || !window.YT.Player) {
      setTimeout(() => startYouTubeStream(targetId, isPlaylist), 400);
      return;
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try { ytPlayerRef.current.destroy(); } catch (_) {}
    }

    setYtState({ isPlaying: false, isReady: false, isPlaylist: isPlaylist, currentTitle: 'Connecting...' });
    setCurrentTime(0);
    setDuration(0);

    const playerOptions = {
      height: '180',
      width: '260',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(volume * 100);
          event.target.playVideo();
          setYtState(prev => ({ 
            ...prev, 
            isReady: true, 
            isPlaying: true, 
            currentTitle: event.target.getVideoData()?.title || 'Streaming Audio'
          }));
          setDuration(event.target.getDuration() || 0);
        },
        onStateChange: (event) => {
          if (event.data === 1) {
            setYtState(prev => ({ 
              ...prev, 
              isPlaying: true, 
              currentTitle: event.target.getVideoData()?.title || prev.currentTitle 
            }));
            setDuration(event.target.getDuration() || 0);
          } else if (event.data === 2) {
            setYtState(prev => ({ ...prev, isPlaying: false }));
          }
        }
      }
    };

    if (isPlaylist) {
      playerOptions.playerVars.listType = 'playlist';
      playerOptions.playerVars.list = targetId;
    } else {
      playerOptions.videoId = targetId;
    }

    ytPlayerRef.current = new window.YT.Player('yt-embedded-instance', playerOptions);
  };

  const toggleYtPlayback = () => {
    if (!ytPlayerRef.current || !ytState.isReady) return;
    if (ytState.isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  };

  const skipYtSeconds = (seconds) => {
    if (!ytPlayerRef.current || !ytState.isReady) return;
    const current = ytPlayerRef.current.getCurrentTime() || 0;
    const target = Math.max(0, current + seconds);
    ytPlayerRef.current.seekTo(target, true);
    setCurrentTime(target);
  };

  const handleSeekChange = (e) => {
    setIsSeeking(true);
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e) => {
    setIsSeeking(false);
    const targetTime = parseFloat(e.target.value);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(targetTime, true);
    }
  };

  const nextYtTrack = () => {
    if (ytPlayerRef.current && ytState.isReady && typeof ytPlayerRef.current.nextVideo === 'function') {
      ytPlayerRef.current.nextVideo();
    }
  };

  const prevYtTrack = () => {
    if (ytPlayerRef.current && ytState.isReady && typeof ytPlayerRef.current.previousVideo === 'function') {
      ytPlayerRef.current.previousVideo();
    }
  };

  const stopYtStream = () => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
      ytPlayerRef.current.stopVideo();
    }
    setYtState({ isPlaying: false, isReady: false, isPlaylist: false, currentTitle: '' });
    setCurrentTime(0);
    setDuration(0);
  };

  const handlePlayYouTubeForm = (e) => {
    e?.preventDefault();
    const parsed = parseYouTubeUrl(ytUrl);
    if (parsed) {
      startYouTubeStream(parsed.targetId, parsed.type === 'playlist');
    }
  };

  const handleDragStart = (e) => {
    isDraggingRef.current = true;
    setLayoutMode('custom');

    const rect = widgetRef.current.getBoundingClientRect();
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      currentX: rect.left,
      currentY: rect.top
    };

    if (widgetRef.current) {
      widgetRef.current.style.transition = 'none';
      widgetRef.current.style.willChange = 'transform';
    }

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragDataRef.current.startX;
      const dy = moveEvent.clientY - dragDataRef.current.startY;
      
      dragDataRef.current.currentX = dragDataRef.current.initX + dx;
      dragDataRef.current.currentY = dragDataRef.current.initY + dy;

      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(() => {
          if (widgetRef.current) {
            widgetRef.current.style.transform = `translate3d(${dragDataRef.current.currentX}px, ${dragDataRef.current.currentY}px, 0)`;
          }
          animFrameRef.current = null;
        });
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const finalX = Math.max(10, Math.min(window.innerWidth - 300, dragDataRef.current.currentX));
      const finalY = Math.max(10, Math.min(window.innerHeight - 300, dragDataRef.current.currentY));
      
      setPos({ x: finalX, y: finalY });
      
      if (widgetRef.current) {
        widgetRef.current.style.willChange = 'auto';
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!enableParticles) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const raindrops = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 20 + 10,
      speed: Math.random() * 10 + 14,
      opacity: Math.random() * 0.4 + 0.1
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#FCD34D';
      ctx.lineWidth = 1;

      raindrops.forEach((drop) => {
        ctx.beginPath();
        ctx.globalAlpha = drop.opacity;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enableParticles]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft((isBreak ? breakDuration : focusDuration) * 60);
  };

  const addExtraTime = (mins) => {
    setTimeLeft((prev) => prev + mins * 60);
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask('');
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const saveEditedTask = (id) => {
    if (!editingTaskText.trim()) {
      deleteTask(id);
    } else {
      setTasks(tasks.map(t => t.id === id ? { ...t, text: editingTaskText } : t));
    }
    setEditingTaskId(null);
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      const blobUrl = URL.createObjectURL(file);
      setCustomBg(blobUrl);
      setCustomBgType(isVideo ? 'video' : 'image');
      setCurrentBg('custom');
    }
  };

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const scale = UI_SCALES[uiScale] || UI_SCALES.md;
  const activeBg = currentBg === 'custom' 
    ? { url: customBg, type: customBgType } 
    : DEFAULT_WALLPAPERS.find(w => w.id === currentBg);

  const getWidgetTransform = () => {
    if (layoutMode === 'custom') {
      return `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }
    if (layoutMode === 'top') {
      return `translate3d(calc(50vw - 50%), 70px, 0)`;
    }
    return `translate3d(calc(50vw - 50%), calc(50vh - 50%), 0)`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-transparent">
      
      {/* Background Video/Image Layer */}
      {activeBg && activeBg.url && (
        <div className="absolute inset-0 overflow-hidden -z-20">
          {activeBg.type === 'video' ? (
            <video
              key={activeBg.url}
              src={activeBg.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-105"
            />
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out"
              style={{ backgroundImage: `url(${activeBg.url})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px]" />
        </div>
      )}

      {/* Rain Effect Canvas */}
      {enableParticles && (
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none -z-10" />
      )}

      {/* Persistent Off-Screen YouTube Target */}
      <div 
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '300px',
          height: '200px',
          visibility: 'visible',
          opacity: 0.01,
          pointerEvents: 'none'
        }}
      >
        <div id="yt-embedded-instance" />
      </div>

      {/* Draggable HUD Container */}
      <div 
        ref={widgetRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: getWidgetTransform(),
          transition: layoutMode !== 'custom' ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
        className="flex flex-col items-center select-none z-30 pointer-events-auto"
      >
        {/* Drag Pill */}
        <div 
          onMouseDown={handleDragStart}
          className="flex items-center gap-2 bg-zinc-950/85 border border-white/15 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-2xl cursor-grab active:cursor-grabbing hover:border-amber-400/60 transition group mb-1.5"
          title="Click and drag smoothly anywhere"
        >
          <Move size={12} className="text-zinc-500 group-hover:text-amber-300 transition" />
          {isBreak ? (
            <>
              <Coffee size={13} className="text-emerald-400 animate-pulse" />
              <span className="text-xs tracking-wider uppercase font-bold text-emerald-400">Break Mode</span>
            </>
          ) : (
            <>
              <Flame size={13} className="text-amber-400 animate-pulse" />
              <span className="text-xs tracking-wider uppercase font-bold text-amber-300">Focus Flow</span>
            </>
          )}
        </div>

        {/* Digital Clock Display */}
        <h1 className={`${scale.clock} ${FONT_STYLES[fontStyle]} text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.95)] leading-none py-1`}>
          {formatTime(timeLeft)}
        </h1>

        {/* Control Buttons */}
        <div className="flex items-center gap-2.5 mt-2.5">
          <button
            onClick={toggleTimer}
            className="bg-[#FCD34D] hover:bg-[#fbbf24] text-zinc-950 font-bold px-7 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(252,211,77,0.3)] cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            {isRunning ? (
              <>
                <Pause size={14} fill="currentColor" /> Pause
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Start Focus
              </>
            )}
          </button>
          <button
            onClick={resetTimer}
            title="Reset Timer"
            className="bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded-xl transition-all duration-200 border border-white/15 backdrop-blur-md cursor-pointer active:scale-95 shadow-xl hover:text-amber-300"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Action Items Box */}
        <div className={`${scale.box} flex flex-col gap-2 mt-4 transition-all duration-300`}>
          <div className="flex justify-between items-center px-1">
            <span className="text-xs uppercase tracking-widest text-zinc-300 font-bold drop-shadow">
              Action Items
            </span>
            <span className="text-xs text-zinc-400 font-mono font-medium">
              {tasks.filter(t => t.completed).length}/{tasks.length} Complete
            </span>
          </div>

          {/* Compact Form */}
          <form onSubmit={addTask} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Add a task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="bg-zinc-950/80 border border-white/15 rounded-xl px-3.5 py-2 text-sm font-medium w-full focus:outline-none focus:border-amber-400 text-zinc-100 placeholder-zinc-500 backdrop-blur-md transition shadow-inner"
            />
            <button
              type="submit"
              className="bg-zinc-900/90 border border-white/15 px-3.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 transition cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
            >
              <Plus size={16} />
            </button>
          </form>

          {/* Task Rows */}
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto mt-0.5 pr-1">
            {tasks.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-2.5 italic drop-shadow">
                No active tasks. Add one above.
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-zinc-950/75 hover:bg-zinc-900/90 px-3.5 py-2.5 rounded-xl border border-white/10 backdrop-blur-md transition group"
                >
                  <div className="flex items-center gap-2.5 flex-1 mr-2 overflow-hidden">
                    <button
                      onClick={() =>
                        setTasks(
                          tasks.map((t) =>
                            t.id === task.id ? { ...t, completed: !t.completed } : t
                          )
                        )
                      }
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 cursor-pointer ${
                        task.completed
                          ? 'bg-amber-400 border-amber-400 text-zinc-950'
                          : 'border-zinc-500 hover:border-zinc-300'
                      }`}
                    >
                      {task.completed && <Check size={11} strokeWidth={3} />}
                    </button>

                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTaskText}
                        onChange={(e) => setEditingTaskText(e.target.value)}
                        onBlur={() => saveEditedTask(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedTask(task.id);
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        className="bg-zinc-900 border border-amber-400 rounded-lg px-2 py-0.5 text-sm font-medium text-zinc-100 focus:outline-none w-full"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => startEditing(task)}
                        title="Double-click to edit"
                        className={`truncate cursor-pointer select-text text-sm font-medium ${
                          task.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                        }`}
                      >
                        {task.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => startEditing(task)}
                      className="text-zinc-400 hover:text-amber-300 p-1 rounded hover:bg-zinc-800/60 transition cursor-pointer"
                      title="Edit task"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-zinc-400 hover:text-red-400 p-1 rounded hover:bg-zinc-800/60 transition cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Modals & Dock Controls */}
      <footer className="fixed bottom-8 right-8 flex flex-col items-end gap-2 pointer-events-auto z-50">
        
        {/* Audio Deck */}
        {activeTab === 'music' && (
          <div className="w-[24.5rem] bg-zinc-950/95 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl mb-2 flex flex-col gap-4 transition-all duration-300 ease-out">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800">
              <span className="text-sm uppercase tracking-wider font-bold text-zinc-300">Audio Deck</span>
              <button 
                onClick={() => setActiveTab(null)} 
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/80 p-1.5 rounded-xl border border-white/5">
              <button
                onClick={() => setAudioMode('ambient')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer text-center ${
                  audioMode === 'ambient' 
                    ? 'bg-[#FCD34D] text-zinc-950 shadow-md scale-[1.02]' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Ambient Loops
              </button>
              <button
                onClick={() => setAudioMode('youtube')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer text-center ${
                  audioMode === 'youtube' 
                    ? 'bg-[#FCD34D] text-zinc-950 shadow-md scale-[1.02]' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                YouTube Player
              </button>
            </div>

            {/* Stable Height Viewport */}
            <div className="min-h-[265px] flex flex-col justify-between transition-all duration-300">
              {audioMode === 'ambient' ? (
                <div className="flex flex-col gap-2 my-auto animate-fadeIn">
                  {SOUNDS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => {
                        stopYtStream();
                        setSelectedSound(selectedSound === sound.id ? null : sound.id);
                      }}
                      className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer flex justify-between items-center border ${
                        selectedSound === sound.id
                          ? 'bg-[#FCD34D] text-zinc-950 font-bold border-amber-400 shadow-md scale-[1.01]'
                          : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 border-white/5'
                      }`}
                    >
                      <span>{sound.name}</span>
                      {selectedSound === sound.id && (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-950/20 px-2.5 py-0.5 rounded-md">
                          Playing
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 justify-between h-full animate-fadeIn">
                  
                  {/* Presets */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                      <Radio size={12} className="text-amber-400" /> Quick Stations
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {YT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => startYouTubeStream(preset.id, preset.type === 'playlist')}
                          className="bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 py-1.5 rounded-lg text-[11px] text-zinc-300 truncate px-2 text-center transition cursor-pointer hover:border-amber-400/40"
                          title={preset.name}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search / Paste Form */}
                  <form onSubmit={handlePlayYouTubeForm} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste video or playlist URL..."
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      className="bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs w-full focus:outline-none focus:border-amber-400 text-zinc-100 placeholder-zinc-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="bg-[#FCD34D] text-zinc-950 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#fbbf24] transition cursor-pointer flex items-center gap-1 active:scale-95 shrink-0 shadow"
                    >
                      <Play size={12} fill="currentColor" /> Load
                    </button>
                  </form>

                  {/* Active Stream Transport with Draggable Seek Scrubber */}
                  <div className={`bg-zinc-900/90 border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-lg transition-all duration-200 ${ytState.isReady ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="text-xs text-amber-300 font-medium truncate drop-shadow px-1">
                      {ytState.isReady ? ytState.currentTitle : 'No active stream loaded'}
                    </div>

                    {/* Interactive Progress / Scrubber Bar */}
                    <div className="flex flex-col gap-1 px-1">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="1"
                        value={currentTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        onTouchEnd={handleSeekMouseUp}
                        disabled={!duration}
                        className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer transition"
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-0.5">
                        <span>{formatAudioTime(currentTime)}</span>
                        <span>{duration ? formatAudioTime(duration) : 'Live Stream'}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between px-1">
                      <button 
                        onClick={prevYtTrack} 
                        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                        title="Previous in Playlist"
                      >
                        <SkipBack size={15} />
                      </button>

                      <button 
                        onClick={() => skipYtSeconds(-15)} 
                        className="text-zinc-400 hover:text-amber-300 p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer flex items-center gap-0.5 text-[11px]"
                        title="Rewind 15 Seconds"
                      >
                        <SkipBack15 size={13} /> -15s
                      </button>

                      <button
                        onClick={toggleYtPlayback}
                        className="bg-[#FCD34D] hover:bg-[#fbbf24] text-zinc-950 p-2 rounded-full transition cursor-pointer active:scale-95 shadow"
                        title={ytState.isPlaying ? 'Pause' : 'Resume'}
                      >
                        {ytState.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                      </button>

                      <button 
                        onClick={() => skipYtSeconds(15)} 
                        className="text-zinc-400 hover:text-amber-300 p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer flex items-center gap-0.5 text-[11px]"
                        title="Skip 15 Seconds"
                      >
                        +15s <SkipFwd15 size={13} />
                      </button>

                      <button 
                        onClick={nextYtTrack} 
                        className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                        title="Next in Playlist"
                      >
                        <SkipForward size={15} />
                      </button>
                    </div>

                    <button
                      onClick={stopYtStream}
                      className="text-[11px] text-zinc-500 hover:text-red-400 text-center transition cursor-pointer"
                    >
                      Eject Stream
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Master Volume Bar */}
            <div className="pt-2 flex items-center gap-2.5 border-t border-zinc-800/80">
              <Volume2 size={15} className="text-zinc-400 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-zinc-800 rounded cursor-pointer"
              />
              <span className="text-xs text-zinc-400 font-mono w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {activeTab === 'settings' && (
          <div className="w-[24.5rem] bg-zinc-950/95 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl mb-2 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">App Customization</span>
              <button 
                onClick={() => setActiveTab(null)} 
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-300 font-medium">Widget Placement</span>
              <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'top', label: 'Top' },
                  { id: 'center', label: 'Center' },
                  { id: 'custom', label: 'Free Drag' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLayoutMode(item.id)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      layoutMode === item.id ? 'bg-[#FCD34D] text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rain Overlay */}
            <div className="flex items-center justify-between bg-zinc-900/80 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs text-zinc-200 font-medium">Lightning Rain Overlay</span>
              </div>
              <button
                onClick={() => setEnableParticles(!enableParticles)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                  enableParticles ? 'bg-amber-400 justify-end' : 'bg-zinc-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-zinc-950 shadow" />
              </button>
            </div>

            {/* Sizing & Typography */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-300 font-medium">UI Sizing Scale</span>
                <div className="grid grid-cols-4 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
                  {['sm', 'md', 'lg', 'xl'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setUiScale(sz)}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
                        uiScale === sz ? 'bg-[#FCD34D] text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-300 font-medium">Clock Typography</span>
                <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/5">
                  {['mono', 'sans', 'serif'].map((font) => (
                    <button
                      key={font}
                      onClick={() => setFontStyle(font)}
                      className={`py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                        fontStyle === font ? 'bg-[#FCD34D] text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Wallpapers */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-zinc-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-amber-400" />
                  <span>Backdrop Themes</span>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-300 hover:text-amber-200 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Upload size={12} /> Upload (.mp4 / image)
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleCustomUpload} 
                  accept="image/*,video/mp4,video/webm" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_WALLPAPERS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setCurrentBg(bg.id)}
                    className={`relative h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer group flex items-center justify-center text-center p-1 ${
                      currentBg === bg.id
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    {bg.url ? (
                      <>
                        {bg.type === 'video' ? (
                          <video src={bg.url} muted loop autoPlay className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition" />
                        )}
                        <div className="absolute inset-0 bg-black/40" />
                        <span className="relative text-[9px] font-bold text-white drop-shadow">{bg.name}</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-400">Transparent</span>
                    )}
                  </button>
                ))}

                {customBg && (
                  <button
                    onClick={() => setCurrentBg('custom')}
                    className={`relative h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer group flex items-center justify-center text-center p-1 ${
                      currentBg === 'custom'
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    {customBgType === 'video' ? (
                      <video src={customBg} muted loop autoPlay className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <img src={customBg} alt="Custom" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40" />
                    <span className="relative text-[9px] font-bold text-amber-300 drop-shadow">My Upload</span>
                  </button>
                )}
              </div>
            </div>

            {/* Focus Interval */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Focus Interval</span>
                <span className="font-mono text-amber-400 font-bold">{focusDuration} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={focusDuration}
                onChange={(e) => {
                  setFocusDuration(parseInt(e.target.value));
                  if (!isRunning && !isBreak) setTimeLeft(parseInt(e.target.value) * 60);
                }}
                className="w-full accent-amber-400 h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>

            {/* Break Interval */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Break Interval</span>
                <span className="font-mono text-amber-400 font-bold">{breakDuration} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={breakDuration}
                onChange={(e) => {
                  setBreakDuration(parseInt(e.target.value));
                  if (!isRunning && isBreak) setTimeLeft(parseInt(e.target.value) * 60);
                }}
                className="w-full accent-amber-400 h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>

            {/* Quick Add Minutes */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Add Extra Minutes</span>
              <div className="flex gap-2">
                {[1, 5, 10].map((m) => (
                  <button
                    key={m}
                    onClick={() => addExtraTime(m)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-1.5 rounded-lg text-xs border border-white/5 transition cursor-pointer"
                  >
                    +{m}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Dock */}
        <div className="flex items-center bg-zinc-950/80 border border-white/10 rounded-2xl p-1 gap-1 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => setActiveTab(activeTab === 'music' ? null : 'music')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'music' ? 'bg-[#FCD34D] text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Music size={18} />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? null : 'settings')}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-[#FCD34D] text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}