import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import ChatPage from "@/pages/chat";
import AdminPage from "@/pages/admin";
import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { Chat } from "@/types";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading OpenMind AI...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  const handleChatSelect = (chat: Chat) => {
    setCurrentChatId(chat.id);
    // The chat page will handle the actual chat selection
  };

  const handleNewChat = () => {
    setCurrentChatId(undefined);
    // The chat page will handle creating a new chat
  };
  
  return (
    <Layout 
      onChatSelect={handleChatSelect}
      onNewChat={handleNewChat}
      currentChatId={currentChatId}
    >
      {children}
    </Layout>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-center">Access denied. Admin privileges required.</div>;
  }
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/admin">
        <AdminRoute>
          <AdminPage />
        </AdminRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;