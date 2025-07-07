import { useState, useEffect, useRef } from 'react';
import { useChats, useChatMutations } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import { Button } from '@/components/ui/button';
import { Brain, Code, Search, FileText, Plus, Sparkles } from 'lucide-react';
import { Message, Chat } from '@/types';
import { generateChatTitle } from '@/lib/utils';

export default function ChatPage() {
  const { user } = useAuth();
  const { data: chats, isLoading, refetch } = useChats();
  const { createChat, updateChat, sendMessage, isSendingMessage } = useChatMutations();
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (chats && chats.length > 0 && !currentChat) {
      const latestChat = chats[0];
      setCurrentChat(latestChat);
      setMessages(latestChat.messages);
    }
  }, [chats, currentChat]);

  const handleNewChat = () => {
    setCurrentChat(null);
    setMessages([]);
  };

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
    setMessages(chat.messages);
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      let chatToUpdate = currentChat;

      // If no current chat, create a new one
      if (!currentChat) {
        const newChatData = {
          title: generateChatTitle(content),
          messages: [userMessage],
          tags: [],
          isFavorite: false,
          isArchived: false,
          settings: {
            model: user?.settings.defaultModel || 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2000,
          },
          userId: user!.id,
        };

        await new Promise<void>((resolve, reject) => {
          createChat(newChatData as any, {
            onSuccess: (chat) => {
              chatToUpdate = chat;
              setCurrentChat(chat);
              refetch(); // Refresh the chat list
              resolve();
            },
            onError: reject,
          });
        });
      }

      // Send message to AI
      await sendMessageToAI(newMessages, chatToUpdate!);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages([...newMessages, errorMessage]);
    }
  };

  const sendMessageToAI = async (messagesArray: Message[], chat: Chat) => {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        sendMessage(
          { 
            messages: messagesArray, 
            options: chat.settings 
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        tokens: response.tokens,
        cost: response.cost,
      };

      const finalMessages = [...messagesArray, aiMessage];
      setMessages(finalMessages);

      // Update chat with AI response
      const updatedChat = {
        ...chat,
        messages: finalMessages,
        updatedAt: new Date(),
      };
      
      updateChat(updatedChat);
      refetch(); // Refresh the chat list to show updated chat
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages([...messagesArray, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts = {
      code: "I need help with coding. Can you assist me with writing, debugging, or explaining code?",
      research: "I need help with research. Can you help me find information and analyze topics?",
      document: "I'd like to analyze a document. Can you help me understand and summarize content?",
      creative: "I need help with creative writing. Can you help me brainstorm ideas or write content?",
    };
    
    handleSendMessage(prompts[action as keyof typeof prompts] || prompts.code);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentChat ? currentChat.title : 'New Conversation'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Powered by GPT-4 Free
              </p>
            </div>
          </div>
          <Button
            onClick={handleNewChat}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome to OpenMind AI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-lg">
              Your intelligent assistant for research, coding, analysis, and creative tasks!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
              <Button
                variant="outline"
                onClick={() => handleQuickAction('code')}
                className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                <Code className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Code Help</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickAction('research')}
                className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20 transition-all duration-200"
              >
                <Search className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Research</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickAction('document')}
                className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 transition-all duration-200"
              >
                <FileText className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium">Documents</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickAction('creative')}
                className="flex flex-col items-center gap-2 h-auto p-4 hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-900/20 transition-all duration-200"
              >
                <Sparkles className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium">Creative</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3 animate-fadeIn">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-gray-500 text-sm ml-2">OpenMind AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isSendingMessage || isTyping}
          currentChat={currentChat}
        />
      </div>
    </div>
  );
}