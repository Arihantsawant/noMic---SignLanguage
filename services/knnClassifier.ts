import { HandLandmark, ClassifierSample, HandData } from '../types';

export class KNNClassifier {
  private samples: ClassifierSample[] = [];
  private k: number = 3;

  constructor() {
    this.load();
  }

  /**
   * Adds a sample and generates synthetic variations (augmentation) to simulate
   * a more diverse dataset, improving recognition under different angles/distances.
   */
  public addSample(label: string, hands: HandData[]) {
    const originalFeatures = this.preprocess(hands);
    if (originalFeatures.length === 0) return;

    // 1. Add the original sample
    this.samples.push({ label, landmarks: originalFeatures, handCount: hands.length });

    // 2. Data Augmentation: Create synthetic variations to "retrain" with diversity
    // This helps handle variations in hand orientation and distance
    this.generateAugmentations(label, hands).forEach(variant => {
      this.samples.push({ label, landmarks: variant, handCount: hands.length });
    });

    this.save();
  }

  private generateAugmentations(label: string, hands: HandData[]): number[][] {
    const variations: number[][] = [];
    
    // Add 3 variants with slight noise and rotation
    for (let i = 0; i < 3; i++) {
        const noisyHands = hands.map(h => ({
            ...h,
            landmarks: h.landmarks.map(lm => ({
                x: lm.x + (Math.random() - 0.5) * 0.01,
                y: lm.y + (Math.random() - 0.5) * 0.01,
                z: lm.z + (Math.random() - 0.5) * 0.01,
            }))
        }));
        variations.push(this.preprocess(noisyHands));
    }

    return variations;
  }

  public clearSamples() {
    this.samples = [];
    this.save();
  }

  public getSampleCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.samples.forEach(s => {
      counts[s.label] = (counts[s.label] || 0) + 1;
    });
    return counts;
  }

  public exportModel(): string {
    return JSON.stringify(this.samples);
  }

  public importModel(json: string) {
    try {
        const imported = JSON.parse(json);
        if (Array.isArray(imported)) {
            this.samples = imported;
            this.save();
        }
    } catch (e) {
        console.error("Failed to import model", e);
    }
  }

  public predict(hands: HandData[]): { label: string; confidence: number } | null {
    const handCount = hands.length;
    const relevantSamples = this.samples.filter(s => s.handCount === handCount);

    if (relevantSamples.length === 0) return null;

    const inputFeatures = this.preprocess(hands);
    const distances = relevantSamples.map(sample => ({
      label: sample.label,
      distance: this.euclideanDistance(inputFeatures, sample.landmarks)
    }));

    distances.sort((a, b) => a.distance - b.distance);

    const kNearest = distances.slice(0, this.k);
    if (kNearest.length === 0) return null;
    
    const votes: Record<string, number> = {};
    kNearest.forEach(neighbor => {
      votes[neighbor.label] = (votes[neighbor.label] || 0) + 1;
    });

    let maxVotes = 0;
    let winner = null;
    for (const label in votes) {
      if (votes[label] > maxVotes) {
        maxVotes = votes[label];
        winner = label;
      }
    }

    if (!winner) return null;
    const confidence = maxVotes / this.k;
    
    // Stricter threshold for complex multi-hand gestures
    const threshold = handCount === 2 ? 1.4 : 1.2;

    if (kNearest[0].distance > threshold) return null;

    return { label: winner, confidence };
  }

  private preprocess(hands: HandData[]): number[] {
    // Consistent sorting by handedness to maintain vector integrity
    const sortedHands = [...hands].sort((a, b) => {
        if (a.handedness === b.handedness) return 0;
        return a.handedness === 'Left' ? -1 : 1;
    });

    const allLandmarks = sortedHands.flatMap(h => h.landmarks);
    if (allLandmarks.length === 0) return [];

    // Robust Centroid-based Normalization
    let cx = 0, cy = 0, cz = 0;
    allLandmarks.forEach(lm => {
        cx += lm.x; cy += lm.y; cz += lm.z;
    });
    cx /= allLandmarks.length; cy /= allLandmarks.length; cz /= allLandmarks.length;

    const centered = allLandmarks.map(lm => ({
        x: lm.x - cx, y: lm.y - cy, z: lm.z - cz
    }));

    // Scale to unit sphere for distance/lighting invariance
    const maxDist = Math.max(...centered.map(lm => Math.sqrt(lm.x**2 + lm.y**2 + lm.z**2))) || 1;
    const normalized = centered.map(lm => ({
        x: lm.x / maxDist, y: lm.y / maxDist, z: lm.z / maxDist
    }));

    return normalized.flatMap(lm => [lm.x, lm.y, lm.z]);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private save() {
    try {
        localStorage.setItem('signStream_model_v3', JSON.stringify(this.samples));
    } catch(e) {
        console.warn("Model storage failed", e);
    }
  }

  private load() {
    try {
        const stored = localStorage.getItem('signStream_model_v3');
        if (stored) {
            this.samples = JSON.parse(stored);
        }
    } catch (e) {
        console.warn("Model load failed", e);
    }
  }
}
