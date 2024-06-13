// src/game/game.service.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'ws';

interface Player {
  playerId: string;
  points: number;
  prediction: number;
}

@Injectable()
export class GameService {
  private players: Player[] = [];
  private currentMultiplier: number = 1.0;
  private correctPrediction: number;

  startRound(speed: number, server: Server) {
    this.currentMultiplier = 1.0;
    this.correctPrediction = this.generateRandomMultiplier();

    const interval = setInterval(() => {
      this.currentMultiplier += 0.01 * speed;

      server.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            type: 'updateMultiplier',
            multiplier: this.currentMultiplier,
          }),
        );
      });

      if (this.currentMultiplier >= this.correctPrediction) {
        clearInterval(interval);
        server.clients.forEach((client) => {
          client.send(
            JSON.stringify({
              type: 'freeze',
              finalMultiplier: this.correctPrediction,
            }),
          );
        });
        this.evaluatePredictions();
      }
    }, 100);
  }

  makePrediction(playerId: string, points: number, prediction: number) {
    this.players.push({ playerId, points, prediction });
  }

  private evaluatePredictions() {
    this.players.forEach((player) => {
      if (player.prediction === this.correctPrediction) {
        player.points *= this.correctPrediction;
      } else {
        player.points = 0;
      }
    });
    // Here you can handle the rankings update and notify clients
  }

  private generateRandomMultiplier(): number {
    return parseFloat((Math.random() * 10).toFixed(2));
  }
}
