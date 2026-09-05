// === Timeline Controller ===
// Scientific timeline with playback controls.

import { useEffect, useRef } from 'react';
import { useOceanStore } from '../../stores/oceanStore';

export function TimelineController() {
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const setTimeIndex = useOceanStore((s) => s.setTimeIndex);
  const isPlaying = useOceanStore((s) => s.isPlaying);
  const setIsPlaying = useOceanStore((s) => s.setIsPlaying);
  const playbackSpeed = useOceanStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useOceanStore((s) => s.setPlaybackSpeed);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  const timeSteps = datasetMeta?.time_steps || [];
  const maxIndex = Math.max(0, timeSteps.length - 1);
  const currentTime = timeSteps[timeIndex] || '';

  // Playback timer
  const timerRef = useRef<number>(0);
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        const state = useOceanStore.getState();
        state.setTimeIndex(state.timeIndex >= maxIndex ? 0 : state.timeIndex + 1);
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, playbackSpeed, maxIndex]);

  const formatTime = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="h-14 flex items-center gap-3 px-4"
      style={{
        background: 'rgba(10, 22, 40, 0.9)',
        borderTop: '1px solid rgba(42, 108, 176, 0.2)',
        backdropFilter: 'blur(12px)',
      }}>
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTimeIndex(0)}
          className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80"
          style={{ color: '#7ec8e3' }}
          title="Jump to start"
        >⏮</button>
        <button
          onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
          className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80"
          style={{ color: '#7ec8e3' }}
          title="Previous step"
        >⏪</button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #ff6d00, #ff9100)'
              : 'linear-gradient(135deg, #00838f, #00e5ff)',
            color: isPlaying ? '#000' : '#fff',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >{isPlaying ? '⏸' : '▶'}</button>
        <button
          onClick={() => setTimeIndex(Math.min(maxIndex, timeIndex + 1))}
          className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80"
          style={{ color: '#7ec8e3' }}
          title="Next step"
        >⏩</button>
        <button
          onClick={() => setTimeIndex(maxIndex)}
          className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80"
          style={{ color: '#7ec8e3' }}
          title="Jump to end"
        >⏭</button>
      </div>

      {/* Current timestamp */}
      <div className="px-3 py-1 rounded-lg" style={{
        background: 'rgba(0, 229, 255, 0.08)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
      }}>
        <span className="text-xs font-mono font-semibold" style={{ color: '#00e5ff' }}>
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Timeline scrubber */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] font-mono" style={{ color: '#4b9cd3' }}>
          {formatTime(timeSteps[0])}
        </span>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={timeIndex}
          onChange={(e) => setTimeIndex(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-[10px] font-mono" style={{ color: '#4b9cd3' }}>
          {formatTime(timeSteps[maxIndex])}
        </span>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]" style={{ color: '#4b9cd3' }}>Speed:</span>
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={playbackSpeed === s ? {
              background: 'rgba(0, 229, 255, 0.2)',
              color: '#00e5ff',
            } : {
              color: '#4b9cd3',
            }}
          >{s}×</button>
        ))}
      </div>

      {/* Step indicator */}
      <span className="text-[10px] font-mono" style={{ color: '#4b9cd3' }}>
        {timeIndex + 1}/{maxIndex + 1}
      </span>
    </div>
  );
}
