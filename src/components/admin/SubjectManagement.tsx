// إدارة المواد الدراسية

import React, { useState, useEffect } from 'react';
import { getAllSubjects, createSubject, updateSubject, deleteSubject } from '@/services/data';
import type { Subject } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';

const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const subjectsData = await getAllSubjects();
    setSubjects(subjectsData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المادة');
      return;
    }

    if (editingSubject) {
      const result = await updateSubject(editingSubject.id, formData);
      if (result.success) {
        toast.success('تم تحديث المادة بنجاح');
        loadSubjects();
        handleCloseDialog();
      } else {
        toast.error(result.error || 'فشل تحديث المادة');
      }
    } else {
      const result = await createSubject(formData);
      if (result.success) {
        toast.success('تم إضافة المادة بنجاح');
        loadSubjects();
        handleCloseDialog();
      } else {
        toast.error(result.error || 'فشل إضافة المادة');
      }
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({ name: subject.name, description: subject.description || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      const result = await deleteSubject(id);
      if (result.success) {
        toast.success('تم حذف المادة بنجاح');
        loadSubjects();
      } else {
        toast.error(result.error || 'فشل حذف المادة');
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSubject(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة المواد الدراسية</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSubject(null); setFormData({ name: '', description: '' }); }}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مادة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}</DialogTitle>
              <DialogDescription>
                {editingSubject ? 'قم بتعديل بيانات المادة' : 'أدخل بيانات المادة الجديدة'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المادة *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الرياضيات"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المادة (اختياري)"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingSubject ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">لا توجد مواد دراسية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle>{subject.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {subject.description && (
                  <p className="text-sm text-muted-foreground mb-4">{subject.description}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(subject)}>
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(subject.id)}>
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

export default SubjectManagement;
