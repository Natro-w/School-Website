// إدارة المحتوى

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllContent, deleteContent } from '@/services/data';
import type { Content } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Eye } from 'lucide-react';

const ContentManagement: React.FC = () => {
  const [content, setContent] = useState<Content[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const allContent = await getAllContent();
    const sorted = allContent.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setContent(sorted);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      const result = await deleteContent(id);
      if (result.success) {
        toast.success('تم حذف المحتوى بنجاح');
        loadContent();
      } else {
        toast.error(result.error || 'فشل حذف المحتوى');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة المحتوى</h2>
        <Button onClick={() => navigate('/teacher')}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة محتوى
        </Button>
      </div>

      {content.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">لا يوجد محتوى</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {content.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge variant={item.type === 'news' ? 'default' : 'secondary'}>
                    {item.type === 'news' ? 'خبر' : 'تحضير'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.body}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/content/${item.id}`)}>
                    <Eye className="w-4 h-4 ml-2" />
                    عرض
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
