export interface Player {
  id: string;
  name: string;
  points: number;
  prediction: number;
  bet: number;
  isAutoPlayer: boolean;
  correctPrediction?: boolean;
}

export interface Message {
  playerId: string;
  name: string;
  message: string;
}
