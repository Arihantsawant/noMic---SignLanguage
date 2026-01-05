import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { SignRecognizer } from '../services/signRecognizer';
import { HandLandmark, HandData, Handedness } from '../types';

interface WebcamCanvasProps {
  onPrediction: (char: string) => void;
  onLandmarksDetected?: (hands: HandData[]) => void;
  isProcessing: boolean;
  recognizer: SignRecognizer; // Pass recognizer instance from parent
}

const WebcamCanvas: React.FC<WebcamCanvasProps> = ({ onPrediction, onLandmarksDetected, isProcessing, recognizer }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const requestRef = useRef<number>();

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    const loadLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        const result = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2, // Enable 2 hands recognition
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setLandmarker(result);
        setWebcamRunning(true);
      } catch (err) {
        console.error("Error loading MediaPipe Landmarker:", err);
        setLoadingError("Failed to load computer vision models. Please check your internet connection.");
      }
    };

    loadLandmarker();
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, []);

  const processVideo = useCallback(() => {
    if (!landmarker || !webcamRef.current || !webcamRef.current.video || !canvasRef.current) return;

    const video = webcamRef.current.video;
    if (video.readyState !== 4) {
        requestRef.current = requestAnimationFrame(processVideo);
        return;
    }

    const startTimeMs = performance.now();
    try {
        const detections = landmarker.detectForVideo(video, startTimeMs);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const drawingUtils = new DrawingUtils(ctx);

        if (detections.landmarks) {
            // Prepare HandData structure
            const hands: HandData[] = detections.landmarks.map((landmarks, index) => {
                // Get handedness if available (default to Right if undefined)
                const handednessEntry = detections.handedness[index]?.[0];
                const handedness = (handednessEntry?.categoryName || "Right") as Handedness;
                return {
                    landmarks: landmarks as HandLandmark[],
                    handedness: handedness
                };
            });

            // Draw
            for (const hand of hands) {
                 drawingUtils.drawConnectors(hand.landmarks, HandLandmarker.HAND_CONNECTIONS, {
                    color: hand.handedness === 'Left' ? "#10b981" : "#3b82f6", // Green for Left, Blue for Right
                    lineWidth: 4
                });
                drawingUtils.drawLandmarks(hand.landmarks, {
                    color: "#ec4899", 
                    lineWidth: 2,
                    radius: 4
                });
            }

            // Pass standardized data up
            if (onLandmarksDetected) {
                onLandmarksDetected(hands);
            }

            // RECOGNITION
            if (isProcessing && hands.length > 0) {
                const prediction = recognizer.predict(hands);
                if (prediction) {
                    onPrediction(prediction);
                }
            }
        }
    } catch (e) {
        console.warn("Detection error:", e);
    }

    requestRef.current = requestAnimationFrame(processVideo);
  }, [landmarker, isProcessing, onPrediction, onLandmarksDetected, recognizer]);

  useEffect(() => {
    if (webcamRunning) {
        requestRef.current = requestAnimationFrame(processVideo);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [webcamRunning, processVideo]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-700 w-full max-w-[640px] aspect-video mx-auto">
      <Webcam
        ref={webcamRef}
        audio={false}
        className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100" // Mirror effect
        videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full transform -scale-x-100"
      />
      {!landmarker && !loadingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-80 z-10">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-emerald-400 font-medium">Loading Vision Models...</p>
                <p className="text-slate-500 text-xs mt-2">Enhanced for 2 Hands</p>
            </div>
        </div>
      )}
      {loadingError && (
         <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-95 z-10 p-6 text-center text-white">
            <p>{loadingError}</p>
         </div>
      )}
    </div>
  );
};

export default WebcamCanvas;
