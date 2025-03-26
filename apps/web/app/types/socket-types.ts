// export interface User {
//     id: string;
//     name: string;
//     avatar?: string;
//   }
  
//   export interface Message {
//     id: string;
//     senderId: string;
//     conversationId: string;
//     text: string;
//     timestamp: number;
//     status: 'sent' | 'delivered' | 'read';
//     type: 'sent' | 'received';
//   }
  
//   export interface Conversation {
//     id: string;
//     participants: string[];
//     lastMessage?: Message;
//   }

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
