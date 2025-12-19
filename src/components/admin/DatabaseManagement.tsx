// إدارة قاعدة البيانات
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Upload, Trash2, Info, Loader2 } from 'lucide-react';
import { dataService } from '@/services/data';

interface DatabaseStats {
  users: number;
  subjects: number;
  content: number;
  files: number;
  totalFileSize: number;
}

const DatabaseManagement: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load database statistics
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const stats = await dataService.getDatabaseStats();
      setDbInfo(stats);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load database statistics';
      toast.error(errorMessage);
      console.error('Database stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  // تصدير قاعدة البيانات
  const handleExport = async () => {
    try {
      await dataService.exportDatabase();
      toast.success('تم تصدير قاعدة البيانات بنجاح');
    } catch (error) {
      toast.error('فشل تصدير قاعدة البيانات');
    }
  };

  // استيراد قاعدة البيانات
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          await dataService.importDatabase(data);
          toast.success('تم استيراد قاعدة البيانات بنجاح');
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          toast.error('فشل استيراد قاعدة البيانات - ملف غير صالح');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // مسح قاعدة البيانات
  const handleClear = async () => {
    if (!confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }
    
    try {
      await dataService.clearDatabase();
      toast.success('تم مسح قاعدة البيانات بنجاح');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('فشل مسح قاعدة البيانات');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            معلومات قاعدة البيانات
          </CardTitle>
          <CardDescription>
            إحصائيات وحجم البيانات المخزنة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : dbInfo ? (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">المستخدمون</p>
                <p className="text-2xl font-bold">{dbInfo.users}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">المواد الدراسية</p>
                <p className="text-2xl font-bold">{dbInfo.subjects}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">المحتوى</p>
                <p className="text-2xl font-bold">{dbInfo.content}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">الملفات</p>
                <p className="text-2xl font-bold">{dbInfo.files}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">حجم الملفات</p>
                <p className="text-2xl font-bold">{(dbInfo.totalFileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">فشل تحميل الإحصائيات</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إدارة قاعدة البيانات</CardTitle>
          <CardDescription>
            تصدير، استيراد، أو مسح البيانات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              تصدير قاعدة البيانات
            </Button>
            
            <Button onClick={handleImport} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              استيراد قاعدة البيانات
            </Button>
            
            <Button onClick={handleClear} variant="destructive" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              مسح جميع البيانات
            </Button>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>تحذير:</strong> عملية مسح البيانات لا يمكن التراجع عنها. تأكد من تصدير نسخة احتياطية قبل المسح.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseManagement;
