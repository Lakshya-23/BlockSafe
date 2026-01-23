'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWeb3 } from '@/components/providers/Web3Provider';
import AuthGuard from '@/components/AuthGuard';
import { EncryptionKeyPrompt } from '@/components/EncryptionKeyPrompt';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Home, 
  FileText, 
  Users, 
  LogOut, 
  Menu,
  User,
  Share
} from 'lucide-react';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account } = useWeb3();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };


  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Files', href: '/my-files', icon: FileText },
    { name: 'Shared With Me', href: '/shared-with-me', icon: Share },
    { name: 'Organizations', href: '/organizations', icon: Users },
  ];

  return (
    <AuthGuard>
      <EncryptionKeyPrompt />
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">BlockSafe</span>
            </div>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-2 mt-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  ))}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="justify-start gap-3 mt-4"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/30 backdrop-blur-sm min-h-screen sticky top-0">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">BlockSafe</span>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'hover:bg-accent'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-muted">
                <User className="w-5 h-5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Connected</div>
                  <div className="text-xs font-mono truncate">
                    {account ? `${account.substring(0, 6)}...${account.substring(38)}` : 'Not connected'}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start gap-3"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
