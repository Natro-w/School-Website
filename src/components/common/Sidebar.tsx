// Sidebar

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, BookOpen, Grid3x3, Menu } from 'lucide-react';
import { getAllSubjects } from '@/services/data';
import type { Subject } from '@/types/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const SidebarContent: React.FC<{ onLinkClick?: () => void }> = ({ onLinkClick }) => {
  const location = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const loadSubjects = async () => {
      const data = await getAllSubjects();
      setSubjects(data);
    };
    loadSubjects();
  }, []);

  const mainLinks = [
    { path: '/', label: 'الرئيسية', icon: Home },
    { path: '/all', label: 'الكل', icon: Grid3x3 },
    { path: '/news', label: 'الأخبار', icon: Newspaper },
    { path: '/lessons', label: 'التحاضير', icon: BookOpen },
  ];

  return (
    <nav className="space-y-2">
      {/* Main links */}
      {mainLinks.map((link) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.path;
        
        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'hover:bg-muted'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{link.label}</span>
          </Link>
        );
      })}

      {/* Separator */}
      {subjects.length > 0 && (
        <div className="border-t border-border my-4 pt-4">
          <h3 className="text-sm font-semibold mb-2 px-4 text-muted-foreground">
            المواد الدراسية
          </h3>
        </div>
      )}

      {/* Subjects */}
      {subjects.map((subject) => {
        const isActive = location.pathname === `/subject/${subject.id}`;
        
        return (
          <Link
            key={subject.id}
            to={`/subject/${subject.id}`}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'hover:bg-muted'
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span>{subject.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* زر القائمة للجوال */}
      <div className="xl:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full w-14 h-14 shadow-lg">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">القائمة</h2>
            </div>
            <SidebarContent onLinkClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* الشريط الجانبي للشاشات الكبيرة */}
      <aside className="hidden xl:block w-64 bg-card border-l border-border min-h-[calc(100vh-4rem)] p-4 shadow-lg">
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
