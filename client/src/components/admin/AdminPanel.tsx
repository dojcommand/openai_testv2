import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Users, 
  MessageCircle, 
  Settings, 
  Shield, 
  X 
} from 'lucide-react';
import UserManagement from './UserManagement';
import ChatModeration from './ChatModeration';
import AIRules from './AIRules';
import AdminDashboard from './AdminDashboard';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <div className="flex h-full">
          {/* Admin Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center justify-between">
                Admin Panel
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <nav className="space-y-2">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('dashboard')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === 'users' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
              <Button
                variant={activeTab === 'moderation' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('moderation')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat Moderation
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant={activeTab === 'ai-rules' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('ai-rules')}
              >
                <Shield className="h-4 w-4 mr-2" />
                AI Rules
              </Button>
            </nav>
          </div>

          {/* Admin Content Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {activeTab === 'dashboard' && <AdminDashboard />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'moderation' && <ChatModeration />}
                {activeTab === 'settings' && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      System Settings
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      System settings configuration will be implemented here.
                    </p>
                  </div>
                )}
                {activeTab === 'ai-rules' && <AIRules />}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
