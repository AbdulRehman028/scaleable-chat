import { Server, Socket as SocketIO } from 'socket.io';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Comprehensive Type Definitions
export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  conversationId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  type?: 'sent' | 'received';
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
}

export interface UserConnection {
  userId: string;
  socketId: string;
}

export interface UserConnectionEvent {
  userId: string;
  socketId?: string;
  status: 'connected' | 'disconnected';
}

class SocketService {
  private _io: Server;
  private pub: Redis;
  private sub: Redis;
  private userConnections: Map<string, UserConnection[]> = new Map();
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    console.log("🔵 Initializing Socket Service...");
    
    // Redis configuration - consider moving to environment variables
    const redisConfig = {
      host: 'valkey-1e3048e2-baig-9bf8.h.aivencloud.com',
    port: 20345,
    username: 'default',
    password: 'AVNS_yu20Km-jMMH7x6Uu35h',
    };

    this.pub = new Redis(redisConfig);
    this.sub = new Redis(redisConfig);

    this._io = new Server({
      cors: {
        allowedHeaders: ['*'],
        origin: '*'
      }
    });

    this.initPubSubChannels();
  }

  private initPubSubChannels() {
    console.log("🟡 Subscribing to Redis channels: MESSAGES, USER_CONNECTIONS");
    
    this.sub.subscribe('MESSAGES', 'USER_CONNECTIONS');
    
    this.sub.on('message', (channel, message) => {
      console.log(`🟣 Redis Event - Channel: ${channel}, Message: ${message}`);
      
      try {
        const parsedMessage = JSON.parse(message);
        switch(channel) {
          case 'MESSAGES':
            this.handleIncomingMessage(parsedMessage);
            break;
          case 'USER_CONNECTIONS':
            this.handleUserConnectionEvent(parsedMessage);
            break;
        }
      } catch (error) {
        console.error('Error processing Redis message:', error);
      }
    });
  }

  private handleUserConnectionEvent(event: UserConnectionEvent) {
    console.log(`🟠 Handling user connection event: ${JSON.stringify(event)}`);

    switch(event.status) {
      case 'connected':
        if (event.userId && event.socketId) {
          console.log(`✅ User Connected: ${event.userId}, Socket ID: ${event.socketId}`);
          
          const connections = this.userConnections.get(event.userId) || [];
          connections.push({ userId: event.userId, socketId: event.socketId });
          this.userConnections.set(event.userId, connections);
        }
        break;
      case 'disconnected':
        console.log(`❌ User Disconnected: ${event.userId}`);
        this.userConnections.delete(event.userId);
        break;
    }
  }

  public initListeners() {
    console.log("🟢 Initializing socket event listeners...");

    this._io.on('connection', (socket: SocketIO) => {
      console.log(`🟢 New socket connected: ${socket.id}`);

      // User connection event
      socket.on('user:connect', (userId: string) => {
        console.log(`🔹 User ${userId} connected with socket ${socket.id}`);
        this.registerUserConnection(userId, socket.id);
      });

      // Message sending event
      socket.on('message:send', async (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>) => {
        console.log(`📨 Message received from user ${messageData.senderId}: ${messageData.text}`);

        // Create full message object
        const message: Message = {
          id: uuidv4(),
          ...messageData,
          timestamp: Date.now(),
          status: 'sent',
          type: 'sent'
        };

        // Update or create conversation
        this.updateConversation(message);

        console.log(`📢 Publishing message to Redis: ${JSON.stringify(message)}`);
        await this.pub.publish('MESSAGES', JSON.stringify(message));
      });

      // Conversation retrieval event
      socket.on('conversations:get', () => {
        const userConversations = this.getUserConversations(socket.id);
        socket.emit('conversations:list', userConversations);
      });

      socket.on('disconnect', () => {
        console.log(`🔴 Socket disconnected: ${socket.id}`);
        this.handleSocketDisconnect(socket.id);
      });
    });
  }

  private registerUserConnection(userId: string, socketId: string) {
    console.log(`📝 Registering user connection - UserID: ${userId}, SocketID: ${socketId}`);
    
    const connectionEvent: UserConnectionEvent = {
      userId,
      socketId,
      status: 'connected'
    };

    console.log(`📢 Publishing user connection event to Redis: ${JSON.stringify(connectionEvent)}`);
    this.pub.publish('USER_CONNECTIONS', JSON.stringify(connectionEvent));
  }

  private handleSocketDisconnect(socketId: string) {
    console.log(`🔴 Handling socket disconnect for ID: ${socketId}`);

    for (const [userId, connections] of this.userConnections.entries()) {
      const updatedConnections = connections.filter(conn => conn.socketId !== socketId);
      
      if (updatedConnections.length === 0) {
        console.log(`❌ Removing user ${userId} from active connections`);

        const disconnectEvent: UserConnectionEvent = {
          userId,
          status: 'disconnected'
        };
        
        this.userConnections.delete(userId);
        this.pub.publish('USER_CONNECTIONS', JSON.stringify(disconnectEvent));
      } else {
        console.log(`🔄 Updating active connections for user ${userId}`);
        this.userConnections.set(userId, updatedConnections);
      }
    }
  }

  private handleIncomingMessage(message: Message) {
    console.log(`📥 Received message for conversation: ${message.conversationId}, Message ID: ${message.id}`);

    // Find conversation participants
    const conversation = this.conversations.get(message.conversationId);
    
    if (conversation) {
      conversation.participants.forEach(userId => {
        const recipientConnections = this.userConnections.get(userId);
        if (recipientConnections) {
          recipientConnections.forEach(connection => {
            this._io.to(connection.socketId).emit('message:receive', message);
          });
        }
      });
    } else {
      console.log(`⚠️ No active conversation found for ID: ${message.conversationId}`);
    }
  }

  private updateConversation(message: Message) {
    let conversation = this.conversations.get(message.conversationId);
    
    if (!conversation) {
      // Create new conversation if it doesn't exist
      conversation = {
        id: message.conversationId,
        participants: [message.senderId], // Initially just the sender
        lastMessage: message
      };
    } else {
      // Update existing conversation
      conversation.lastMessage = message;
      
      // Ensure unique participants
      if (!conversation.participants.includes(message.senderId)) {
        conversation.participants.push(message.senderId);
      }
    }

    this.conversations.set(message.conversationId, conversation);
  }

  private getUserConversations(socketId: string): Conversation[] {
    // Find the user associated with this socket
    const userEntry = Array.from(this.userConnections.entries())
      .find(([userId, connections]) => 
        connections.some(conn => conn.socketId === socketId)
      );

    if (!userEntry) return [];

    const userId = userEntry[0];
    
    // Filter conversations where the user is a participant
    return Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(userId));
  }

  get io() {
    return this._io;
  }
}

export default SocketService;