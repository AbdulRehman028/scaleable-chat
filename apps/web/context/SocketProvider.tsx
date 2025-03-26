'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, Conversation } from "../app/types/socket-types";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  sendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  conversations: [],
  sendMessage: () => {}
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });
    
    // Connection event handlers
    newSocket.on('connect', () => {
      console.log("Socket connected:", newSocket.id);

      setSocket(newSocket);
      setIsConnected(true);
      
      // Authenticate user and fetch conversations
      const userId = localStorage.getItem('userId') || 'default_user';
      console.log("Emitting user:connect event for:", userId);

      newSocket.emit('user:connect', userId);
      newSocket.emit('conversations:get');
    });

    // Listen for conversations list
    newSocket.on('conversations:list', (convos: Conversation[]) => {
      console.log('Received conversations:', convos);
      setConversations(convos);
    });

    // Message receive handler
    newSocket.on('message:receive', (message: Message) => {
      console.log('Received message:', message);
      // Update conversations with new message
      setConversations(prevConvos => 
        prevConvos.map(conv => 
          conv.id === message.conversationId 
            ? { ...conv, lastMessage: message } 
            : conv
        )
      );
    });

    newSocket.on('disconnect', () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    // Error handling
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up socket connection...");
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>) => {
    if (socket && isConnected) {
      console.log("Sending message:", messageData);
      socket.emit('message:send', messageData);
    } else {
      console.error('Cannot send message: Socket not connected');
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      conversations, 
      sendMessage 
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);