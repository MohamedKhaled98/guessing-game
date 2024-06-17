// src/game/game.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Player } from 'src/types';

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private players: Player[] = [];
  private multiplier = 0.0;
  private interval: NodeJS.Timeout;
  private freezePoint: number;
  private startingPoints = 1000;
  private autoPlayers = 4;
  private roundRunning = false;
  @SubscribeMessage('player_connection')
  handlePlayerConnection(
    @MessageBody() data: { playerId: string; playerName: string },
  ) {
    console.log('New Player : ', data.playerName, data.playerId);
    this.addPlayer(data.playerId, data.playerName, false);
    this.handleAddBots();
    this.updatePlayerList();
  }

  handleDisconnect(socket: Socket) {
    const player = this.players.find((player) => player.id === socket.id);
    if (player) {
      const anotherOnlinePlayer = this.players.some(
        (player) => !player?.isAutoPlayer && player.id != socket.id,
      );
      if (anotherOnlinePlayer) {
        this.players = this.players.filter((p) => p.id !== player.id);
      } else {
        this.players = [];
        this.multiplier = 0;
      }
      this.updatePlayerList();
    }
  }

  @SubscribeMessage('startRound')
  handleStartRound(
    @MessageBody()
    data: {
      playerId: string;
      betPoints: number;
      prediction: number;
      speed: number;
    },
  ) {
    this.server.emit('reset');
    // To prevent multiple players start the same round
    this.roundRunning = true;
    this.server.emit('roundRunning', this.roundRunning);
    // To prevent multiple players start the same round

    this.handleMakePredection(data.playerId, data.betPoints, data.prediction);
    this.multiplier = 0.0;
    this.freezePoint = Math.round(Math.random() * 1000) / 100; // Random freeze point between 0.01 and 10
    console.log(this.freezePoint);
    const updateInterval = 5000 / data.speed; // Adjust interval based on speed

    this.interval = setInterval(() => {
      if (this.multiplier >= this.freezePoint) {
        clearInterval(this.interval);
        this.server.emit('freeze');
        this.calculateResults();
        this.roundRunning = false;
        this.server.emit('roundRunning', false);
      } else {
        this.multiplier += 0.06;
        this.server.emit('updateMultiplier', this.multiplier);
      }
    }, updateInterval);
  }

  private handleMakePredection(
    playerId: string,
    points: number,
    prediction: number,
  ) {
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.points -= points;
      player.prediction = prediction;
      player.bet = points;

      this.handleMakeBotsPredections();
      this.updatePlayerList();
    }
  }
  private calculateResults() {
    this.players.forEach((player) => {
      if (player.prediction <= this.freezePoint) {
        const earnedPoints = Math.round(player.bet * player.prediction);
        player.points += earnedPoints;
        player.bet = earnedPoints;
      } else {
        player.bet = 0;
      }
    });
    this.updatePlayerList();
    this.updateRankings();
  }

  private addPlayer(id: string, name: string, isAutoPlayer: boolean) {
    const player: Player = {
      id,
      name: name,
      points: this.startingPoints,
      prediction: null,
      bet: null,
      isAutoPlayer,
    };
    this.players.push(player);
  }

  private updatePlayerList() {
    this.server.emit('update_players_list', this.players);
  }
  private updateRankings() {
    const rankings = this.players.sort((a, b) => b.points - a.points);
    this.server.emit('updateRankings', rankings);
  }
  private handleAddBots() {
    // Generate auto-playerss
    const bots = this.autoPlayers - this.players.length + 1;
    if (bots > 0) {
      for (let i = 0; i < bots; i++) {
        this.addPlayer(`bot-${i}`, `Bot ${i + 1}`, true);
      }
    }
  }
  private handleMakeBotsPredections() {
    this.players.forEach((player) => {
      if (player.isAutoPlayer) {
        const bet = Math.floor(Math.random() * player.points);
        const prediction = Math.round(Math.random() * 400) / 100;
        player.points -= bet;
        player.prediction = prediction;
        player.bet = bet;
      }
    });
  }
}
