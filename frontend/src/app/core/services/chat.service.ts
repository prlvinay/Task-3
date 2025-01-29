import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket: Socket;
  private messageSubject = new BehaviorSubject<any[]>([]);
  public messages$ = this.messageSubject.asObservable();
  private userListSubject = new BehaviorSubject<string[]>([]);
  public userList$ = this.userListSubject.asObservable();

  constructor() {
    this.socket = io('http://localhost:3000');

    this.socket.on('receiveMessage', (messageData) => {
      const messages = this.messageSubject.value;
      messages.push(messageData);
      this.messageSubject.next(messages);

      if (messageData.user !== sessionStorage.getItem('username')) {
        this.showAlert(messageData);
      }
    });

    this.socket.on('updateUserList', (userList: string[]) => {
      this.userListSubject.next(userList);
    });
  }

  sendMessage(messageData: any) {
    this.socket.emit('sendMessage', messageData);
  }

  joinRoom(roomName: string) {
    this.socket.emit('joinRoom', roomName);
  }

  createRoom(roomName: string) {
    this.socket.emit('createRoom', roomName);
  }
  leaveRoom(roomName: string) {
    this.socket.emit('leaveRoom', roomName);
  }

  userConnected(username: string) {
    this.socket.emit('userConnected', username);
  }
  private showAlert(messageData: any) {
    alert(`${messageData.user} sent a message: ${messageData.message}`);
  }
}
