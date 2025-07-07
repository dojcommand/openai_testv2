import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Chat, Message, ChatCompletionResponse } from '@/types';

export function useChats() {
  return useQuery<Chat[]>({
    queryKey: ['/api/chats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      return response.json();
    },
  });
}

export function useChat(chatId: string) {
  return useQuery<Chat>({
    queryKey: ['/api/chats', chatId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }
      
      return response.json();
    },
    enabled: !!chatId,
  });
}

export function useChatMutations() {
  const queryClient = useQueryClient();

  const createChatMutation = useMutation({
    mutationFn: async (data: { title: string; messages: Message[] }): Promise<Chat> => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Chat>): Promise<Chat> => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chats/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update chat');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats', data.id] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string): Promise<void> => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      messages, 
      options 
    }: { 
      messages: Message[]; 
      options?: { model?: string; temperature?: number; maxTokens?: number } 
    }): Promise<ChatCompletionResponse> => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, options }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
  });

  return {
    createChat: createChatMutation.mutate,
    updateChat: updateChatMutation.mutate,
    deleteChat: deleteChatMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    isCreatingChat: createChatMutation.isPending,
    isUpdatingChat: updateChatMutation.isPending,
    isDeletingChat: deleteChatMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    createChatError: createChatMutation.error,
    updateChatError: updateChatMutation.error,
    deleteChatError: deleteChatMutation.error,
    sendMessageError: sendMessageMutation.error,
  };
}
