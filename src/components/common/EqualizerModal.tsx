import React, { useState } from 'react';
import { X, RotateCcw, Volume2, Sliders, Sparkles } from 'lucide-react';
import { audioService, EQ_FREQUENCIES, EQ_PRESETS } from '../../services/audio';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [eqEnabled, setEqEnabled] = useState(audioService.isEqEnabled());
  const [loudnessEnabled, setLoudnessEnabled] = useState(audioService.isLoudnessNormalizationEnabled());
  const [activePreset, setActivePreset] = useState<string>('Flat');
  const [gains, setGains] = useState<number[]>(audioService.getEqGains());
  const [bassBoost, setBassBoost] = useState<number>(audioService.getBassBoost());
  const [crossfade, setCrossfade] = useState<number>(audioService.getCrossfade());

  if (!isOpen) return null;

  const handleGainChange = (index: number, val: number) => {
    const newGains = [...gains];
    newGains[index] = val;
    setGains(newGains);
    audioService.setEqGain(index, val);
    setActivePreset('Custom');
  };

  const handlePresetSelect = (presetName: string) => {
    setActivePreset(presetName);
    const presetGains = EQ_PRESETS[presetName];
    if (presetGains) {
      setGains(presetGains);
      audioService.setEqPreset(presetName);
    }
  };

  const handleReset = () => {
    handlePresetSelect('Flat');
    setBassBoost(0);
    audioService.setBassBoost(0);
  };

  const formatFrequency = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121319] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-red/10 text-accent-red">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Equalizer & Audio FX</h2>
              <p className="text-xs text-neutral-400">10-band professional graphic EQ & audio normalization</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-neutral-300 hover:bg-white/5 transition-colors"
              title="Reset to Flat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Toggles */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Master Equalizer</p>
              <p className="text-xs text-neutral-400">Enable 10-band filter processing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={eqEnabled}
                onChange={(e) => {
                  setEqEnabled(e.target.checked);
                  audioService.setEqEnabled(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Loudness Normalizer</p>
              <p className="text-xs text-neutral-400">Equalize track volume differences</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={loudnessEnabled}
                onChange={(e) => {
                  setLoudnessEnabled(e.target.checked);
                  audioService.setLoudnessNormalization(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-red"></div>
            </label>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-medium text-neutral-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-accent-red" /> Presets:
          </span>
          {Object.keys(EQ_PRESETS).map((pName) => (
            <button
              key={pName}
              onClick={() => handlePresetSelect(pName)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activePreset === pName
                  ? 'bg-accent-red text-white shadow-lg shadow-accent-red/20'
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
            >
              {pName}
            </button>
          ))}
        </div>

        {/* 10-Band EQ Sliders */}
        <div
          className={`relative mt-4 p-5 rounded-2xl bg-black/40 border border-white/5 transition-opacity ${
            eqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}
        >
          {/* Reference grid lines */}
          <div className="absolute inset-x-5 top-8 bottom-12 flex flex-col justify-between pointer-events-none opacity-10">
            <div className="border-b border-dashed border-white" />
            <div className="border-b border-white" />
            <div className="border-b border-dashed border-white" />
          </div>

          <div className="relative flex justify-between items-center h-48 gap-2">
            {EQ_FREQUENCIES.map((freq, idx) => (
              <div key={freq} className="flex flex-col items-center justify-between h-full group">
                <span className="text-[10px] font-mono font-medium text-neutral-400 group-hover:text-accent-red transition-colors">
                  {gains[idx] > 0 ? `+${gains[idx]}` : gains[idx]}dB
                </span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gains[idx]}
                  onChange={(e) => handleGainChange(idx, parseFloat(e.target.value))}
                  className="w-1.5 h-32 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent-red [writing-mode:vertical-lr] [direction:rtl]"
                />
                <span className="text-[11px] font-medium text-neutral-400 mt-2">
                  {formatFrequency(freq)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bass Boost & Crossfade */}
        <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-white/10">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-neutral-200">Bass Boost</span>
              <span className="text-xs font-mono text-accent-red font-semibold">+{bassBoost} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={bassBoost}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setBassBoost(val);
                audioService.setBassBoost(val);
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent-red"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-neutral-200">Crossfade</span>
              <span className="text-xs font-mono text-accent-red font-semibold">{crossfade} s</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={crossfade}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setCrossfade(val);
                audioService.setCrossfade(val);
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent-red"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
