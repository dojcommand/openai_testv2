import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Eye, AlertTriangle, MessageCircle } from 'lucide-react';
import { Report, Chat } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ChatModeration() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/admin/reports'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      return response.json();
    },
  });

  const { data: chats, isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ['/api/admin/chats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/chats', {
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

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, updates }: { reportId: string; updates: Partial<Report> }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      toast({ title: 'Report updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating report', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      toast({ title: 'Chat deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting chat', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const filteredReports = reports?.filter(report => {
    return statusFilter === 'all' || report.status === statusFilter;
  }) || [];

  const handleApproveReport = (reportId: string) => {
    updateReportMutation.mutate({
      reportId,
      updates: { status: 'approved', moderatorNotes: 'Content approved by moderator' }
    });
  };

  const handleRejectReport = (reportId: string) => {
    updateReportMutation.mutate({
      reportId,
      updates: { status: 'rejected', moderatorNotes: 'Report rejected by moderator' }
    });
  };

  const handleDeleteChat = (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      deleteChatMutation.mutate(chatId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChat = (chatId: string) => {
    return chats?.find(chat => chat.id === chatId);
  };

  if (reportsLoading || chatsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chat Moderation</h3>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const chat = getChat(report.chatId);
            const isExpanded = expandedReport === report.id;
            
            return (
              <Card key={report.id} className="w-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(report.status)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Chat ID: #{report.chatId.slice(0, 8)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        User: {report.userId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isExpanded ? 'Hide' : 'View'} Details
                      </Button>
                      
                      {report.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveReport(report.id)}
                            disabled={updateReportMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectReport(report.id)}
                            disabled={updateReportMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteChat(report.chatId)}
                        disabled={deleteChatMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete Chat
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Flagged Content:
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {report.flaggedContent}
                      </p>
                      
                      {report.aiResponse && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            AI Response:
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {report.aiResponse}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Reason: {report.reason}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Reported: {formatRelativeTime(report.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && chat && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                          Full Chat Context:
                        </h4>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                          {chat.messages.map((message, index) => (
                            <div key={index} className="mb-3 last:mb-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`text-xs font-medium ${
                                  message.role === 'user' 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {message.role === 'user' ? 'User' : 'AI'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatRelativeTime(message.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {report.moderatorNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Moderator Notes:
                        </h5>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {report.moderatorNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No reports found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === 'all' 
                ? 'No moderation reports available' 
                : `No ${statusFilter} reports found`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
