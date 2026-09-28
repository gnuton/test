/**
 * Tabletop Nexus - MP3 & Ambient Soundscape Player Modal
 * Implements kb.tabletopsimulator.com/built-in-objects/mp3-player/
 */

import React, { useState } from 'react';
import { X, Play, Square, Volume2, VolumeX, Music, Disc3, Sparkles } from 'lucide-react';
import { TabletopAudio } from '../lib/tabletop/client/TabletopAudio.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  audio: TabletopAudio;
}

export const AudioJukeboxModal: React.FC<Props> = ({ isOpen, onClose, audio }) => {
  const [currentTrack, setCurrentTrack] = useState<string | null>(audio.currentTrackId);
  const [isPlaying, setIsPlaying] = useState<boolean>(!!audio.currentTrackId);
  const [volume, setVolume] = useState<number>(audio.musicVolume);

  if (!isOpen) return null;

  const tracks = [
    {
      id: 'tavern',
      title: 'Tavern Hearth & Ale',
      genre: 'Warm Folk Acoustic',
      desc: 'Crackling fire, gentle lute & minor acoustic chords',
      icon: '🍺',
    },
    {
      id: 'lofi',
      title: 'Lo-Fi Boardgame Chill',
      genre: 'Electric Piano & Vinyl',
      desc: 'Mellow electric Rhodes chords & vinyl warmth',
      icon: '☕',
    },
    {
      id: 'casino',
      title: 'Casino High-Roller Swing',
      genre: 'Smooth Velvet Jazz',
      desc: 'Walking bassline & classic poker lounge chords',
      icon: '🎰',
    },
    {
      id: 'fantasy',
      title: 'Fantasy Dungeon Quest',
      genre: 'Mystical Harp & Pad',
      desc: 'Ambient ethereal adventure arpeggios',
      icon: '⚔️',
    },
    {
      id: 'space',
      title: 'Deep Space Orbit',
      genre: 'Cosmic Synthesizer',
      desc: 'Sub-bass drone with shimmering stellar overtones',
      icon: '🚀',
    },
    {
      id: 'arena',
      title: 'Tabletop Battle Arena',
      genre: 'Rhythmic March',
      desc: 'Intense brass & cadence for tactical encounters',
      icon: '🎲',
    },
  ];

  const handlePlayTrack = (trackId: string) => {
    setCurrentTrack(trackId);
    setIsPlaying(true);
    audio.playMusicTrack(trackId as any);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTrack(null);
    audio.stopMusic();
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audio.musicVolume = vol;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-white flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Tabletop Soundscape Jukebox</h2>
              <p className="text-xs text-slate-400">
                Procedurally synthesized background ambiance (no external MP3 downloads required)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume & Status Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                PLAYING
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                STOPPED
              </span>
            )}
            <span className="text-xs text-slate-300 font-semibold truncate max-w-[140px]">
              {tracks.find((t) => t.id === currentTrack)?.title || 'No Track Selected'}
            </span>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 accent-violet-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Tracklist */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {tracks.map((t) => {
            const isSelected = currentTrack === t.id && isPlaying;
            return (
              <button
                key={t.id}
                onClick={() => handlePlayTrack(t.id)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-500/10'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      {t.title}
                      {isSelected && (
                        <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{t.desc}</div>
                  </div>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-violet-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Global Stop Button */}
        {isPlaying && (
          <button
            onClick={handleStop}
            className="w-full py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop Background Music
          </button>
        )}
      </div>
    </div>
  );
};
