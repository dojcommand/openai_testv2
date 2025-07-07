import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { Button } from '@/components/ui/button';
import { Menu, Settings, Shield, Share2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import SettingsModal from '@/components/settings/SettingsModal';
import AdminPanel from '@/components/admin/AdminPanel';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 h-full w-80 md:w-64 transition-transform duration-300 ease-in-out`}>
        <ChatSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Chat Session
              </h1>
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                Active
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {user?.role === 'admin' && (
              <>
                <div className="admin-badge text-white text-xs px-3 py-1 rounded-full font-medium">
                  <Shield className="h-3 w-3 mr-1 inline" />
                  Admin
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsAdminPanelOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Admin Panel
                </Button>
              </>
            )}
            
            <Button variant="secondary" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      
      {user?.role === 'admin' && (
        <AdminPanel 
          isOpen={isAdminPanelOpen} 
          onClose={() => setIsAdminPanelOpen(false)} 
        />
      )}
    </div>
  );
}
