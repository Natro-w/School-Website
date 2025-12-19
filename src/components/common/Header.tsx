// رأس الصفحة - Header Component

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Shield, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { APP_CONFIG } from '@/config/app.config';
import SearchBar from '@/components/common/SearchBar';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    // تحميل الصورة الشخصية من localStorage
    const loadProfilePicture = () => {
      if (user?.profilePicture) {
        setProfilePicture(user.profilePicture);
      } else {
        setProfilePicture(null);
      }
    };

    loadProfilePicture();

    // تحديث دوري للصورة الشخصية
    const interval = setInterval(loadProfilePicture, 500);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-3 xl:px-4 py-3 xl:py-4">
        <div className="flex items-center justify-between gap-2 xl:gap-4">
          {/* العنوان */}
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-shrink">
            <h1 className="text-base xl:text-2xl font-bold truncate">{APP_CONFIG.appName}</h1>
          </Link>

          {/* Search Bar - Hidden on mobile, shown on desktop */}
          <div className="hidden xl:block flex-1 max-w-md">
            <SearchBar placeholder="Search..." />
          </div>

          {/* أزرار التنقل */}
          <div className="flex items-center gap-1 xl:gap-4 flex-shrink-0">
            {/* زر الوضع الليلي */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2 xl:px-3"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {isAuthenticated ? (
              <>
                {/* معلومات المستخدم - مخفية على الموبايل */}
                <div className="hidden xl:flex items-center gap-2 text-sm">
                  <Avatar className="w-7 h-7 border-2 border-primary-foreground/20">
                    <AvatarImage src={profilePicture || undefined} alt={user?.username} />
                    <AvatarFallback className="text-xs bg-primary-foreground text-primary">
                      {user?.username ? getInitials(user.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user?.username}</span>
                  {isAdmin && <Shield className="w-4 h-4" />}
                </div>

                {/* صورة المستخدم فقط على الموبايل */}
                <div className="flex xl:hidden items-center">
                  <Avatar className="w-8 h-8 border-2 border-primary-foreground/20">
                    <AvatarImage src={profilePicture || undefined} alt={user?.username} />
                    <AvatarFallback className="text-xs bg-primary-foreground text-primary">
                      {user?.username ? getInitials(user.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* أزرار سطح المكتب */}
                <div className="hidden xl:flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/admin')}
                    >
                      لوحة الإدارة
                    </Button>
                  )}
                  
                  {user?.role === 'teacher' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/teacher')}
                    >
                      صفحة المدرس
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </Button>
                </div>

                {/* زر القائمة للموبايل */}
                <div className="flex xl:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/settings')}
                    className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/login')}
              >
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
