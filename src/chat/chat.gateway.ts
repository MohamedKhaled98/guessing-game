import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from './../types';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway()
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private messages: Message[] = [];
  @SubscribeMessage('newMessage')
  newMessage(
    @MessageBody()
    {
      playerId,
      name,
      message,
    }: {
      playerId: string;
      name: string;
      message: string;
    },
  ) {
    this.messages.push({
      playerId,
      name,
      message,
    });

    this.server.emit('updateMessagesList', this.messages);
    console.log('New Message : ', name, message);
  }
  handleDisconnect(socket: Socket) {
    const playerMessages = this.messages.some(
      (message) => message.playerId === socket.id,
    );
    if (playerMessages) {
      this.messages = this.messages.filter(
        (message) => message.playerId != socket.id,
      );
      this.server.emit('updateMessagesList', this.messages);
    }
  }
  @SubscribeMessage('player_connection')
  handlePlayerConnection(
    @MessageBody() data: { playerId: string; playerName: string },
  ) {
    const welcomeTimeout = setTimeout(() => {
      this.messages.push({
        playerId: data.playerId,
        name: 'Bot 2',
        message: `Welcome ${data.playerName}, Enjoy the game.`,
      });
      this.server.emit('updateMessagesList', this.messages);
      clearTimeout(welcomeTimeout);
    }, 1000);

    const greetingTimeout = setTimeout(() => {
      this.messages.push({
        playerId: data.playerId,
        name: 'Bot 1',
        message: `Yeah amazing game. big thanks to developer Mohamed`,
      });
      this.server.emit('updateMessagesList', this.messages);
      clearTimeout(greetingTimeout);
    }, 3000);
  }
}
