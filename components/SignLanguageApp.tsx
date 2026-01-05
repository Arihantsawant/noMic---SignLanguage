import React, { useState, useEffect, useCallback, useRef } from 'react';
import WebcamCanvas from './WebcamCanvas';
import { refineSentence, getWordSuggestions } from '../services/geminiService';
import { speakText } from '../services/ttsService';
import { SignRecognizer } from '../services/signRecognizer';
import { HandData } from '../types';
import { 
  Volume2, 
  Trash2, 
  Type, 
  Wand2, 
  Settings2,
  Space,
  Play,
  PlusCircle,
  BrainCircuit,
  Hand,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Sparkles,
  BookOpen,
  History
} from 'lucide-react';

const signRecognizer = new SignRecognizer();

export const SignLanguageApp: React.FC = () => {
  const [accumulatedText, setAccumulatedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const pendingCharRef = useRef<string | null>(null);
  const [pendingCharDisplay, setPendingCharDisplay] = useState<string | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<'idle' | 'confirmed' | 'rejected'>('idle');

  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingLabel, setTrainingLabel] = useState("A");
  const [customLabel, setCustomLabel] = useState("");
  const [trainingSamples, setTrainingSamples] = useState<Record<string, number>>({});
  const [currentHands, setCurrentHands] = useState<HandData[] | null>(null);
  const [learningFeedback, setLearningFeedback] = useState(false);

  useEffect(() => {
    setTrainingSamples(signRecognizer.getClassifier().getSampleCount());
  }, []);

  // Effect to fetch suggestions whenever text changes
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (accumulatedText.length > 0 && !accumulatedText.endsWith(' ')) {
        const words = await getWordSuggestions(accumulatedText);
        setSuggestions(words);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [accumulatedText]);

  const handlePrediction = useCallback((prediction: string) => {
    if (isTrainingMode) return;

    if (prediction === 'ThumbsUp') {
        const currentPending = pendingCharRef.current;
        if (currentPending) {
            // CONFIRM & REINFORCE: Auto-retrain the classifier with the confirmed sample
            if (currentHands && currentHands.length > 0) {
              signRecognizer.getClassifier().addSample(currentPending, currentHands);
              setTrainingSamples(signRecognizer.getClassifier().getSampleCount());
              setLearningFeedback(true);
              setTimeout(() => setLearningFeedback(false), 1500);
            }

            setAccumulatedText(prev => prev + (currentPending === 'Space' ? ' ' : currentPending));
            setConfirmationStatus('confirmed');
            setTimeout(() => setConfirmationStatus('idle'), 800);
            pendingCharRef.current = null;
            setPendingCharDisplay(null);
        }
        return;
    } 

    if (prediction === 'ThumbsDown') {
        if (pendingCharRef.current) {
            setConfirmationStatus('rejected');
            setTimeout(() => setConfirmationStatus('idle'), 800);
            pendingCharRef.current = null;
            setPendingCharDisplay(null);
        }
        return;
    }

    // Capture candidates for letters and numbers only (per instructions)
    if (pendingCharRef.current !== prediction) {
        pendingCharRef.current = prediction;
        setPendingCharDisplay(prediction);
        setConfirmationStatus('idle');
    }
  }, [isTrainingMode, currentHands]);

  const applySuggestion = (word: string) => {
    setAccumulatedText(prev => {
        const parts = prev.trim().split(/\s+/);
        parts[parts.length - 1] = word;
        return parts.join(' ') + ' ';
    });
    setSuggestions([]);
  };

  const addTrainingSample = () => {
    if (!currentHands || currentHands.length === 0) return;
    const finalLabel = trainingLabel === "CUSTOM" ? customLabel : trainingLabel;
    if (!finalLabel) return;
    
    signRecognizer.getClassifier().addSample(finalLabel, currentHands);
    setTrainingSamples(signRecognizer.getClassifier().getSampleCount());
  };

  const handleExport = () => {
    const data = signRecognizer.getClassifier().exportModel();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signstream_model_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const json = event.target?.result as string;
        signRecognizer.getClassifier().importModel(json);
        setTrainingSamples(signRecognizer.getClassifier().getSampleCount());
        alert("Model imported successfully!");
    };
    reader.readAsText(file);
  };

  const TRAINING_LABELS = [
    "ThumbsUp", "ThumbsDown", "Space", "CUSTOM",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative group">
            <WebcamCanvas 
                onPrediction={handlePrediction} 
                onLandmarksDetected={(h) => { setCurrentHands(h); setDetectedHandCount(h.length); }}
                isProcessing={isProcessing && !isTrainingMode}
                recognizer={signRecognizer}
            />
            
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-slate-200">{isTrainingMode ? 'Training Mode' : 'Live Mode'}</span>
                </div>
                
                {/* Auto-Learning Feedback */}
                {learningFeedback && (
                  <div className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-blue-400 flex items-center gap-2 animate-bounce">
                    <History className="w-3 h-3" /> MODEL REINFORCED
                  </div>
                )}
            </div>

            {!isTrainingMode && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4">
                    <div className={`transition-all duration-300 transform ${pendingCharDisplay ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Proposed</span>
                                {confirmationStatus === 'confirmed' && <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> OK</span>}
                                {confirmationStatus === 'rejected' && <span className="text-red-400 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> NO</span>}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center border-2 border-emerald-500/50 shadow-lg">
                                    <span className="text-4xl font-black text-white">{pendingCharDisplay === 'Space' ? '␣' : pendingCharDisplay}</span>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-[10px] text-emerald-400">
                                        <ThumbsUp className="w-3 h-3" /> Sign Thumbs Up to Confirm
                                    </div>
                                    <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 text-[10px] text-red-400">
                                        <ThumbsDown className="w-3 h-3" /> Sign Thumbs Down to Reject
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* AI SUGGESTION BAR */}
        {!isTrainingMode && suggestions.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-900/20 border border-indigo-500/30 rounded-xl overflow-x-auto">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[10px] font-bold text-indigo-300/70 uppercase tracking-tighter mr-2">Suggestions:</span>
                {suggestions.map(s => (
                    <button 
                        key={s} 
                        onClick={() => applySuggestion(s)}
                        className="px-3 py-1 bg-indigo-600/40 hover:bg-indigo-600/60 text-white text-xs font-semibold rounded-full border border-indigo-500/40 transition-all whitespace-nowrap animate-in fade-in slide-in-from-left-2"
                    >
                        {s}
                    </button>
                ))}
            </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Toolset
                </h3>
                <div className="flex gap-2">
                     <button onClick={handleExport} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-600" title="Download Model">
                        <Download className="w-4 h-4" />
                    </button>
                    <label className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-600 cursor-pointer" title="Upload Model">
                        <Upload className="w-4 h-4" />
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                    <button 
                        onClick={() => setIsTrainingMode(!isTrainingMode)}
                        className={`text-xs px-4 py-2 rounded-lg font-bold transition-all border ${isTrainingMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-white'}`}
                    >
                        {isTrainingMode ? 'EXIT TRAINING' : 'TRAINING MODE'}
                    </button>
                </div>
            </div>

            {isTrainingMode ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                            <select 
                                value={trainingLabel} 
                                onChange={(e) => setTrainingLabel(e.target.value)}
                                className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 outline-none"
                            >
                                {TRAINING_LABELS.map(l => (
                                    <option key={l} value={l}>{l === 'CUSTOM' ? '➕ CUSTOM PHRASE' : l} {trainingSamples[l] ? `(${trainingSamples[l]})` : ''}</option>
                                ))}
                            </select>
                            {trainingLabel === 'CUSTOM' && (
                                <input 
                                    type="text" 
                                    placeholder="Enter Word/Expression..." 
                                    className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded-lg flex-1 outline-none focus:border-emerald-500"
                                    value={customLabel}
                                    onChange={(e) => setCustomLabel(e.target.value.toUpperCase())}
                                />
                            )}
                        </div>
                        <button 
                            onClick={addTrainingSample}
                            disabled={!currentHands || currentHands.length === 0}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg"
                        >
                            <PlusCircle className="w-4 h-4" /> CAPTURE & AUGMENT
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button onClick={() => setIsProcessing(!isProcessing)} className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all font-bold text-xs uppercase">
                        {isProcessing ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button onClick={() => setAccumulatedText(prev => prev + " ")} className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all font-bold text-xs uppercase">
                        ␣ Space
                    </button>
                    <button onClick={() => setAccumulatedText(prev => prev.slice(0, -1))} className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all font-bold text-xs uppercase">
                        ⌫ Backspace
                    </button>
                    <button onClick={() => setAccumulatedText("")} className="p-3 bg-red-900/20 text-red-400 rounded-xl border border-red-900/30 hover:bg-red-900/30 transition-all font-bold text-xs uppercase">
                        🗑 Clear
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex-1 flex flex-col shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type className="w-5 h-5 text-blue-400" /> Output
                </h2>
                <button onClick={() => speakText(accumulatedText)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                    <Volume2 className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700/50 min-h-[160px]">
                {accumulatedText ? (
                    <p className="text-2xl text-slate-200 leading-relaxed font-bold break-words">
                        {accumulatedText}
                        <span className="inline-block w-2 h-6 bg-emerald-500 ml-1 animate-pulse" />
                    </p>
                ) : (
                    <p className="text-slate-600 italic text-sm">Waiting for input...</p>
                )}
            </div>
            <button 
                onClick={async () => { setIsRefining(true); const p = await refineSentence(accumulatedText); setAccumulatedText(p); setIsRefining(false); speakText(p); }}
                disabled={isRefining || !accumulatedText}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
            >
                {isRefining ? 'Polishing...' : '✨ AI REFINER'}
            </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" /> Model Library
            </h3>
            <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(trainingSamples).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(trainingSamples).map(([label, count]) => (
                            <div key={label} className="bg-slate-900 border border-slate-700 p-2 rounded flex flex-col items-center">
                                <span className="text-white font-bold text-xs truncate w-full text-center">{label}</span>
                                <span className="text-[10px] text-slate-500">{count} samples</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-500 text-center py-4">No data stored yet.</p>
                )}
            </div>
            <p className="text-[9px] text-slate-500 mt-2 text-center uppercase tracking-tighter">
              Tip: Model auto-retrains every time you sign Thumbs Up.
            </p>
            <button onClick={() => { if(confirm("Reset all training data?")) { signRecognizer.getClassifier().clearSamples(); setTrainingSamples({}); }}} className="mt-4 w-full py-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors border border-red-900/30 rounded">
                RESET LIBRARY
            </button>
        </div>
      </div>
    </div>
  );
};
