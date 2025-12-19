// بطاقة المحتوى - Content Card Component

import React, { useState, useEffect, memo } from 'react';
import type { Content, User, ContentFile } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, User as UserIcon, FileText, Image as ImageIcon, Video, Music, Link as LinkIcon, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { fetchWithRetry } from '@/lib/performance';

interface ContentCardProps {
  content: Content;
  onClick?: () => void;
  showFileCount?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = memo(({ content, onClick, showFileCount = true }) => {
  const [authorProfilePicture, setAuthorProfilePicture] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>(content.authorName);
  const [updateKey, setUpdateKey] = useState<number>(0);
  const [fileCount, setFileCount] = useState<number>(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // Detect media types from URLs
  const detectMediaTypes = () => {
    const urls = content.urls || [];
    const types = {
      videos: 0,
      links: 0,
      images: 0
    };

    urls.forEach(url => {
      const lowerUrl = url.toLowerCase();
      // Check for video files
      if (lowerUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/)) {
        types.videos++;
      }
      // Check for image files
      else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) {
        types.images++;
      }
      // Check for external links (http/https)
      else if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
        types.links++;
      }
    });

    return types;
  };

  const mediaTypes = detectMediaTypes();

  // Fetch file count for this content
  useEffect(() => {
    if (!showFileCount) return;

    const fetchFileCount = async () => {
      setIsLoadingFiles(true);
      try {
        const response = await fetchWithRetry(`/api/files/content/${content.id}`, {}, 2, 500);
        if (response.ok) {
          const files: ContentFile[] = await response.json();
          setFileCount(files.length);
        }
      } catch (error) {
        // Silently fail - file count is not critical
        console.error('Error fetching file count:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchFileCount();
  }, [content.id, showFileCount]);

  useEffect(() => {
    // Get author profile picture from localStorage
    const loadAuthorInfo = () => {
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
        const author = users.find((u) => u.id === content.authorId);
        
        if (author) {
          // Update profile picture
          if (author.profilePicture) {
            setAuthorProfilePicture(author.profilePicture);
            setUpdateKey(prev => prev + 1); // Force re-render
          } else {
            setAuthorProfilePicture(null);
          }
          
          // Update author name
          if (author.username) {
            setAuthorName(author.username);
          }
        }
      } catch (error) {
        console.error('Error loading author info:', error);
      }
    };

    loadAuthorInfo();

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'users' || e.key === 'currentUser') {
        loadAuthorInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic update every 500ms to ensure latest data
    const interval = setInterval(loadAuthorInfo, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [content.authorId]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'url':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
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
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg xl:text-xl line-clamp-2">{content.title}</CardTitle>
          <Badge variant={content.type === 'news' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
            {content.type === 'news' ? 'خبر' : 'تحضير'}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 whitespace-pre-line text-sm">
          {content.body}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs xl:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar key={`avatar-${content.id}-${updateKey}`} className="w-5 h-5 xl:w-6 xl:h-6 flex-shrink-0">
              <AvatarImage 
                src={authorProfilePicture || undefined} 
                alt={authorName}
                key={`img-${updateKey}`}
              />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getInitials(authorName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{authorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">
              {format(new Date(content.createdAt), 'PPP', { locale: ar })}
            </span>
          </div>
          {showFileCount && fileCount > 0 && (
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">
                {fileCount} {fileCount === 1 ? 'ملف' : 'ملفات'}
              </span>
            </div>
          )}
          {mediaTypes.videos > 0 && (
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="text-xs">
                {mediaTypes.videos} {mediaTypes.videos === 1 ? 'فيديو' : 'فيديوهات'}
              </span>
            </div>
          )}
          {mediaTypes.links > 0 && (
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 flex-shrink-0 text-accent" />
              <span className="text-xs">
                {mediaTypes.links} {mediaTypes.links === 1 ? 'رابط' : 'روابط'}
              </span>
            </div>
          )}
          {mediaTypes.images > 0 && (
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 flex-shrink-0 text-secondary" />
              <span className="text-xs">
                {mediaTypes.images} {mediaTypes.images === 1 ? 'صورة' : 'صور'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ContentCard.displayName = 'ContentCard';

export default ContentCard;

