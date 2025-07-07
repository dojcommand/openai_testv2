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
  Edit
} from 'lucide-react';
import { Chat } from '@/types';
import { formatRelativeTime, truncateText } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatSidebarProps {
  onClose?: () => void;
  onChatSelect?: (chat: Chat) => void;
}

export default function ChatSidebar({ onClose, onChatSelect }: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { data: chats, isLoading } = useChats();
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

  const handleNewChat = () => {
    // This will be handled by the parent component
    if (onClose) onClose();
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId);
    }
  };

  const handleEditChat = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveEdit = (chatId: string) => {
    if (editingTitle.trim()) {
      updateChat({ id: chatId, title: editingTitle.trim() });
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">OpenMind AI</span>
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
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
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
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {/* Recent Chats */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Recent Chats
          </h3>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => onChatSelect?.(chat)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <MessageCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
                            {chat.messages.length > 0 
                              ? truncateText(chat.messages[chat.messages.length - 1].content, 40)
                              : 'No messages'
                            }
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {chat.tags.length > 0 && (
                      <span className="text-xs text-gray-400 px-1">
                        {chat.tags[0]}
                      </span>
                    )}
                    {chat.isFavorite && (
                      <Star className="h-3 w-3 text-yellow-400" />
                    )}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => {/* Handle upload */}}
            >
              <Upload className="h-4 w-4 mr-3" />
              Upload Document
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => {/* Handle code assistant */}}
            >
              <Code className="h-4 w-4 mr-3" />
              Code Assistant
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => {/* Handle research tool */}}
            >
              <Search className="h-4 w-4 mr-3" />
              Research Tool
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Favorites */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Favorites
          </h3>
          <div className="space-y-1">
            {chats?.filter(chat => chat.isFavorite).map((chat) => (
              <div
                key={chat.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => onChatSelect?.(chat)}
              >
                <Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {truncateText(chat.title, 25)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-blue-600 text-white">
                {user ? getInitials(user.username) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.plan || 'Free'} Plan
              </p>
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
