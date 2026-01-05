export enum RecognitionMode {
  SPELLING = 'SPELLING',
  WORD = 'WORD'
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface RecognitionResult {
  character: string;
  confidence: number;
}

export type Handedness = 'Left' | 'Right';

export interface ISignPrediction {
  label: string;
  score: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: Handedness;
}

// MediaPipe Types
export interface MPResult {
  landmarks: HandLandmark[][];
  worldLandmarks: HandLandmark[][];
  handedness: { index: number; score: number; categoryName: Handedness; displayName: string }[][];
}

export interface ClassifierSample {
  label: string;
  landmarks: number[]; // Flat array of x,y,z
  handCount: number;
}
