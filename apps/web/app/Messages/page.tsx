"use client";

import { Socket } from 'socket.io-client';
import React, { useState, useEffect } from 'react';
import { MessageSquare, Paperclip, Send, CheckCircle, XCircle } from 'lucide-react';
import { useSocket } from '../../context/SocketProvider';
import { Conversation, Message } from '../types/socket-types'; 

const FreelanceChatModule = () => {
    const { conversations, sendMessage } = useSocket();
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');

    // Update messages when conversation changes
    useEffect(() => {
      if (selectedConversation) {
          // Fetch or filter messages for the selected conversation
          const conversationMessages = conversations
              .find(conv => conv.id === selectedConversation.id)
              ?.lastMessage ? [conversations.find(conv => conv.id === selectedConversation.id)!.lastMessage!] : [];
          
          setMessages(conversationMessages);
      }
  }, [selectedConversation, conversations]);

    // Get current user ID (placeholder)
    const getCurrentUserId = () => {
        return localStorage.getItem('userId') || 'current_user_id';
    };

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConversation) return;

        const messageData = {
            senderId: getCurrentUserId(),
            conversationId: selectedConversation.id,
            text: messageInput
        };

        sendMessage(messageData);
        setMessageInput('');
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Conversations Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Messages</h2>
                    <MessageSquare className="text-gray-500" />
                </div>

                {conversations.map(conversation => (
                    <div 
                        key={conversation.id} 
                        className={`p-4 flex items-center hover:bg-gray-50 cursor-pointer 
                            ${selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedConversation(conversation)}
                    >
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">
                                    {conversation.participants.join(', ')}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                                {conversation.lastMessage?.text || 'No messages yet'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b flex items-center">
                            <div>
                                <h3 className="font-semibold">
                                    {selectedConversation.participants.join(', ')}
                                </h3>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(message => (
                                <div 
                                    key={message.id} 
                                    className={`flex ${message.senderId === getCurrentUserId() ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div 
                                        className={`
                                            max-w-md p-3 rounded-lg 
                                            ${message.senderId === getCurrentUserId() 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-gray-200 text-black'}
                                        `}
                                    >
                                        <p>{message.text}</p>
                                        <div className="text-xs mt-1 opacity-70 text-right">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 bg-white border-t flex items-center space-x-2">
                            <button className="text-gray-500 hover:text-gray-700">
                                <Paperclip />
                            </button>
                            <input 
                                type="text"
                                placeholder="Type your message..."
                                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button 
                                onClick={handleSendMessage}
                                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
                            >
                                <Send />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <p>Select a conversation to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FreelanceChatModule;