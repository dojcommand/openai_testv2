import { useState } from 'react';
import { useChats, useChatMutations } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Plus, 
  Search, 
  MessageCircle, 
  Upload, 
  Code, 
  FileText,
  Star,
  X,
  Trash2,
  Edit,
  Sparkles,
  Clock,
  Archive
} from 'lucide-react';
import { Chat } from '@/types';
import { formatRelativeTime, truncateText } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatSidebarProps {
  onClose?: () => void;
  onChatSelect?: (chat: Chat) => void;
  onNewChat?: () => void;
  currentChatId?: string;
}

export default function ChatSidebar({ onClose, onChatSelect, onNewChat, currentChatId }: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { data: chats, isLoading, refetch } = useChats();
  const { createChat, deleteChat, updateChat } = useChatMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredChats = chats?.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) ||
    chat.tags.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  // Sort chats by most recent first
  const sortedChats = filteredChats.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const handleNewChat = () => {
    onNewChat?.();
    if (onClose) onClose();
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId, {
        onSuccess: () => {
          refetch();
        }
      });
    }
  };

  const handleEditChat = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveEdit = (chatId: string) => {
    if (editingTitle.trim()) {
      updateChat({ 
        ...chats?.find(c => c.id === chatId)!, 
        title: editingTitle.trim() 
      }, {
        onSuccess: () => {
          refetch();
        }
      });
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleToggleFavorite = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    updateChat({ 
      ...chat, 
      isFavorite: !chat.isFavorite 
    }, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const getChatPreview = (chat: Chat) => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage) return 'No messages';
    
    if (lastMessage.role === 'user') {
      return lastMessage.content;
    } else {
      return `AI: ${lastMessage.content}`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white">OpenMind AI</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Free GPT-4</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {/* Recent Chats */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Conversations
            </h3>
            <span className="text-xs text-gray-400">{sortedChats.length}</span>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : sortedChats.length > 0 ? (
            <div className="space-y-1">
              {sortedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 ${
                    currentChatId === chat.id ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
                  }`}
                  onClick={() => onChatSelect?.(chat)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="relative">
                      <MessageCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {chat.isFavorite && (
                        <Star className="h-2 w-2 text-yellow-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleSaveEdit(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(chat.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-6 text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {chat.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {truncateText(getChatPreview(chat), 50)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(new Date(chat.updatedAt))}
                            </span>
                            {chat.messages.length > 0 && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-xs text-gray-400">
                                  {chat.messages.length} messages
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleToggleFavorite(chat, e)}
                    >
                      <Star className={`h-3 w-3 ${chat.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleEditChat(chat, e)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:text-red-600"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Start a new chat to begin
              </p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => {/* Handle upload */}}
            >
              <Upload className="h-4 w-4 mr-3 text-blue-600" />
              Upload Document
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-left hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => {/* Handle code assistant */}}
            >
              <Code className="h-4 w-4 mr-3 text-green-600" />
              Code Assistant
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-left hover:bg-purple-50 dark:hover:bg-purple-900/20"
              onClick={() => {/* Handle research tool */}}
            >
              <Search className="h-4 w-4 mr-3 text-purple-600" />
              Research Tool
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Favorites */}
        {sortedChats.some(chat => chat.isFavorite) && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Favorites
            </h3>
            <div className="space-y-1">
              {sortedChats.filter(chat => chat.isFavorite).slice(0, 5).map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => onChatSelect?.(chat)}
                >
                  <Star className="h-4 w-4 text-yellow-400 flex-shrink-0 fill-current" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {truncateText(chat.title, 25)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {user ? getInitials(user.username) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.username || 'User'}
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user?.plan || 'Free'} Plan
                </span>
                {user?.plan === 'free' && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Free GPT-4
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}