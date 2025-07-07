import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, Paperclip, Mic, Upload, Zap } from 'lucide-react';
import { Chat } from '@/types';
import { calculateTokens, estimateCost } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
  currentChat?: Chat | null;
}

export default function ChatInput({ onSendMessage, disabled, currentChat }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [model, setModel] = useState(currentChat?.settings.model || 'gpt-4o');
  const [temperature, setTemperature] = useState(currentChat?.settings.temperature || 0.7);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message, attachedFiles.length > 0 ? attachedFiles : undefined);
    setMessage('');
    setAttachedFiles([]);
    setShowFileUpload(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const tokens = calculateTokens(message);
  const cost = estimateCost(tokens, model);

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="max-w-4xl mx-auto">
        {/* File Upload Area */}
        {showFileUpload && (
          <div className="file-upload-zone rounded-lg p-4 mb-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Supports PDF, DOCX, TXT files up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              multiple
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2"
            >
              Choose Files
            </Button>
          </div>
        )}

        {/* Attached Files */}
        {attachedFiles.length > 0 && (
          <div className="mb-4 space-y-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-2"
              >
                <div className="flex items-center space-x-2">
                  <span>📎</span>
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-600"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="min-h-[60px] max-h-[120px] resize-none pr-32 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
              disabled={disabled}
            />
            
            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Mic className="h-4 w-4" />
              </Button>
              
              <Button
                type="submit"
                disabled={!message.trim() || disabled}
                className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                size="icon"
              >
                {disabled ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label className="text-sm text-gray-500 dark:text-gray-400">Model:</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-32 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label className="text-sm text-gray-500 dark:text-gray-400">Temp:</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
                  {temperature}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>Free GPT-4</span>
              </div>
              <span>•</span>
              <span>Tokens: {tokens}/4,000</span>
              <span>•</span>
              <span>Cost: ${cost.toFixed(4)}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}