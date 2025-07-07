import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AdminSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function AIRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      return response.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AdminSettings>) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Settings updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating settings', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const [formData, setFormData] = useState<Partial<AdminSettings>>({});

  // Update form data when settings load
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleContentFilteringChange = (key: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      contentFiltering: {
        ...prev.contentFiltering,
        [key]: value,
      },
    }));
  };

  const handleResponseGuidelinesChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      responseGuidelines: {
        ...prev.responseGuidelines,
        [key]: value,
      },
    }));
  };

  const handleRateLimitsChange = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      rateLimits: {
        ...prev.rateLimits,
        [key]: value,
      },
    }));
  };

  const handleApiSettingsChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      apiSettings: {
        ...prev.apiSettings,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleBlockedKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    handleResponseGuidelinesChange('blockedKeywords', keywords);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!settings || !formData.contentFiltering) {
    return <div>Error loading settings</div>;
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">AI Behavior Rules</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Filtering Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Content Filtering Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Block harmful content
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Prevent AI from generating harmful or dangerous content
                </p>
              </div>
              <Switch
                checked={formData.contentFiltering?.blockHarmfulContent || false}
                onCheckedChange={(checked) => 
                  handleContentFilteringChange('blockHarmfulContent', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adult content filter
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Block sexually explicit or adult-oriented content
                </p>
              </div>
              <Switch
                checked={formData.contentFiltering?.adultContentFilter || false}
                onCheckedChange={(checked) => 
                  handleContentFilteringChange('adultContentFilter', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Personal information protection
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Prevent AI from sharing personal information
                </p>
              </div>
              <Switch
                checked={formData.contentFiltering?.personalInfoProtection || false}
                onCheckedChange={(checked) => 
                  handleContentFilteringChange('personalInfoProtection', checked)
                }
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Response Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Response Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Default system prompt
              </Label>
              <Textarea
                value={formData.responseGuidelines?.systemPrompt || ''}
                onChange={(e) => handleResponseGuidelinesChange('systemPrompt', e.target.value)}
                rows={4}
                placeholder="Enter the system prompt that guides AI behavior..."
                className="w-full"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Blocked keywords
              </Label>
              <Input
                value={formData.responseGuidelines?.blockedKeywords?.join(', ') || ''}
                onChange={(e) => handleBlockedKeywordsChange(e.target.value)}
                placeholder="Enter comma-separated keywords to block..."
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separate keywords with commas
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Maximum response length
              </Label>
              <Input
                type="number"
                value={formData.responseGuidelines?.maxResponseLength || 2000}
                onChange={(e) => handleResponseGuidelinesChange('maxResponseLength', parseInt(e.target.value))}
                min={100}
                max={4000}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requests per minute
                </Label>
                <Input
                  type="number"
                  value={formData.rateLimits?.requestsPerMinute || 10}
                  onChange={(e) => handleRateLimitsChange('requestsPerMinute', parseInt(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requests per hour
                </Label>
                <Input
                  type="number"
                  value={formData.rateLimits?.requestsPerHour || 100}
                  onChange={(e) => handleRateLimitsChange('requestsPerHour', parseInt(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requests per day
                </Label>
                <Input
                  type="number"
                  value={formData.rateLimits?.requestsPerDay || 1000}
                  onChange={(e) => handleRateLimitsChange('requestsPerDay', parseInt(e.target.value))}
                  min={1}
                  max={10000}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle>API Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Default OpenAI Model
              </Label>
              <Input
                value={formData.apiSettings?.defaultModel || 'gpt-4o'}
                onChange={(e) => handleApiSettingsChange('defaultModel', e.target.value)}
                placeholder="gpt-4o"
                className="w-full"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Maximum tokens per request
              </Label>
              <Input
                type="number"
                value={formData.apiSettings?.maxTokensPerRequest || 4000}
                onChange={(e) => handleApiSettingsChange('maxTokensPerRequest', parseInt(e.target.value))}
                min={100}
                max={8000}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateSettingsMutation.isPending}
            className="px-6"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
