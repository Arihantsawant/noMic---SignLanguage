import React from 'react';
import { SignLanguageApp } from './components/SignLanguageApp';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-6xl mb-6 flex justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tighter">
              noMic
            </h1>
            <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-[0.2em]">No Noise Club</span>
          </div>
          <p className="text-slate-400 text-xs mt-1 font-medium">Visual Communication • Real-time Sign Translation</p>
        </div>
        <div className="text-xs text-slate-500 text-right hidden sm:block">
          <div className="font-bold text-slate-400">v2.0 Hybrid Model</div>
          Powered by MediaPipe & Gemini 3 Pro
        </div>
      </header>
      
      <main className="w-full max-w-6xl">
        <SignLanguageApp />
      </main>

      <footer className="mt-12 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        <div className="mb-2 flex justify-center gap-4 opacity-50">
          <span>Encrypted Model Storage</span>
          <span>•</span>
          <span>Edge Processing</span>
          <span>•</span>
          <span>AI Refinement</span>
        </div>
        <p className="opacity-30">© 2024 noMic - No Noise Club. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;