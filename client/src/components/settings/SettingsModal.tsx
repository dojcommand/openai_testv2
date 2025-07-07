import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    defaultModel: 'gpt-4o',
    saveChatHistory: true,
    usePersonalApiKey: false,
    personalOpenaiApiKey: '',
  });

  useEffect(() => {
    if (user) {
      setSettings({
        theme: user.settings.theme,
        language: user.settings.language,
        defaultModel: user.settings.defaultModel,
        saveChatHistory: user.settings.saveChatHistory,
        usePersonalApiKey: user.settings.usePersonalApiKey || false,
        personalOpenaiApiKey: '', // Don't populate API key for security
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: newSettings }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Settings updated successfully' });
      onClose();
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating settings', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare settings update
    const settingsUpdate = {
      theme: settings.theme,
      language: settings.language,
      defaultModel: settings.defaultModel,
      saveChatHistory: settings.saveChatHistory,
      usePersonalApiKey: settings.usePersonalApiKey,
      personalOpenaiApiKey: settings.personalOpenaiApiKey,
    };

    updateSettingsMutation.mutate(settingsUpdate);
  };

  const handleCancel = () => {
    // Reset to user's current settings
    if (user) {
      setSettings({
        theme: user.settings.theme,
        language: user.settings.language,
        defaultModel: user.settings.defaultModel,
        saveChatHistory: user.settings.saveChatHistory,
        usePersonalApiKey: user.settings.usePersonalApiKey || false,
        personalOpenaiApiKey: '',
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Key Preference */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Use Personal OpenAI API Key
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use your own API key instead of the free service
                </p>
              </div>
              <Switch
                checked={settings.usePersonalApiKey}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, usePersonalApiKey: checked }))
                }
              />
            </div>
            
            {settings.usePersonalApiKey && (
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  OpenAI API Key
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.personalOpenaiApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, personalOpenaiApiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored securely and never shared
                </p>
              </div>
            )}
            
            {!settings.usePersonalApiKey && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Free Service Active
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      You're using our free AI service. Enable your personal API key for faster responses and higher rate limits.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Default Model */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Default Model
            </Label>
            <Select 
              value={settings.defaultModel} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, defaultModel: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Language */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Language
            </Label>
            <Select 
              value={settings.language} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Theme */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Theme
            </Label>
            <Select 
              value={settings.theme} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Save Chat History */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Save Chat History
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically save conversations
              </p>
            </div>
            <Switch
              checked={settings.saveChatHistory}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, saveChatHistory: checked }))
              }
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
