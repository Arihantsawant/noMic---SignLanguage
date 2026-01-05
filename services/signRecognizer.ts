import { HandData } from '../types';
import { KNNClassifier } from './knnClassifier';

export class SignRecognizer {
  
  private classifier: KNNClassifier;
  private history: string[] = [];
  // Increased from 5 to 12 to ensure gestures are very stable before prediction.
  // This prevents the system from picking up random letters while moving to "ThumbsUp".
  private historySize = 12; 

  constructor() {
    this.classifier = new KNNClassifier();
  }

  getClassifier() {
    return this.classifier;
  }

  predict(hands: HandData[]): string | null {
    if (!hands || hands.length === 0) return null;

    // 1. Try KNN Classifier
    const result = this.classifier.predict(hands);
    
    if (result && result.confidence > 0.6) {
        return this.stabilize(result.label);
    }

    return null;
  }

  private stabilize(prediction: string): string | null {
    this.history.push(prediction);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    // Check if majority of recent predictions match
    const counts: Record<string, number> = {};
    this.history.forEach(h => counts[h] = (counts[h] || 0) + 1);
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    
    // Require a high consensus (e.g., 10 out of 12 frames) for stability
    if (sorted[0][1] >= this.historySize - 2) { 
        return sorted[0][0];
    }
    return null;
  }
}
