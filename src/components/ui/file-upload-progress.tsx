// مكون رفع الملفات مع شريط التقدم

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, CheckCircle, AlertCircle, File } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProgressProps {
  onFileSelect: (file: File, dataUrl: string) => void;
  accept?: string;
  maxSizeMB?: number; // اختياري، افتراضياً غير محدود
  disabled?: boolean;
}

interface UploadState {
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  onFileSelect,
  accept = '*/*',
  maxSizeMB,
  disabled = false,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    progress: 0,
    status: 'idle',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const readFileWithProgress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadstart = () => {
        setUploadState(prev => ({
          ...prev,
          status: 'uploading',
          progress: 0,
        }));
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadState(prev => ({
            ...prev,
            progress: Math.round(percentComplete),
          }));
        }
      };

      reader.onload = () => {
        setUploadState(prev => ({
          ...prev,
          status: 'success',
          progress: 100,
        }));
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: 'فشل قراءة الملف',
        }));
        reject(new Error('فشل قراءة الملف'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من الحجم إذا كان محدداً
    if (maxSizeMB) {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > maxSizeMB) {
        toast.error(`حجم الملف كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`);
        return;
      }
    }

    setUploadState({
      file,
      progress: 0,
      status: 'idle',
    });

    try {
      const dataUrl = await readFileWithProgress(file);
      onFileSelect(file, dataUrl);
      toast.success('تم رفع الملف بنجاح');
    } catch (error) {
      toast.error('فشل رفع الملف');
      console.error('خطأ في رفع الملف:', error);
    }
  };

  const handleClear = () => {
    setUploadState({
      file: null,
      progress: 0,
      status: 'idle',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {uploadState.status === 'idle' && !uploadState.file && (
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="w-4 h-4 ml-2" />
          اختر ملف للرفع
          {maxSizeMB && ` (حتى ${maxSizeMB} ميجابايت)`}
          {!maxSizeMB && ' (بدون حد للحجم)'}
        </Button>
      )}

      {uploadState.file && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <File className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadState.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadState.file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {uploadState.status === 'uploading' && (
                    <div className="text-xs text-muted-foreground">
                      {uploadState.progress}%
                    </div>
                  )}
                  {uploadState.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {uploadState.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={uploadState.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {uploadState.status === 'uploading' && (
                <div className="space-y-1">
                  <Progress value={uploadState.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    جاري الرفع... {uploadState.progress}%
                  </p>
                </div>
              )}

              {uploadState.status === 'error' && uploadState.error && (
                <p className="text-xs text-red-500">{uploadState.error}</p>
              )}

              {uploadState.status === 'success' && (
                <p className="text-xs text-green-600">تم الرفع بنجاح ✓</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploadProgress;