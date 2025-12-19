// إدارة المستخدمين

import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser, getAllSubjects } from '@/services/data';
import type { User, Subject } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, User as UserIcon } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'teacher' as 'admin' | 'teacher' | 'user',
    assignedSubjectId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const subjectsData = await getAllSubjects();
    setSubjects(subjectsData);
    const usersData = await getAllUsers();
    setUsers(usersData);
  };

  const loadUsers = async () => {
    const usersData = await getAllUsers();
    setUsers(usersData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Please enter username');
      return;
    }

    // Password is required only when creating new user
    if (!editingUser && !formData.password.trim()) {
      toast.error('Please enter password');
      return;
    }

    if (formData.role === 'teacher' && !formData.assignedSubjectId) {
      toast.error('Please select a subject for the teacher');
      return;
    }

    if (editingUser) {
      const result = await updateUser(editingUser.id, {
        ...formData,
        assignedSubjectId: formData.role === 'teacher' ? formData.assignedSubjectId : undefined,
      });
      if (result.success) {
        toast.success('User updated successfully');
        await loadUsers();
        handleCloseDialog();
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } else {
      const result = await createUser({
        ...formData,
        assignedSubjectId: formData.role === 'teacher' ? formData.assignedSubjectId : undefined,
      });
      if (result.success) {
        toast.success('User added successfully');
        await loadUsers();
        handleCloseDialog();
      } else {
        toast.error(result.error || 'Failed to add user');
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't populate password when editing
      fullName: user.fullName || '',
      role: user.role,
      assignedSubjectId: user.assignedSubjectId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const result = await deleteUser(id);
      if (result.success) {
        toast.success('User deleted successfully');
        loadUsers();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', fullName: '', role: 'teacher', assignedSubjectId: '' });
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return '-';
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إدارة المستخدمين</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingUser(null); setFormData({ username: '', password: '', fullName: '', role: 'teacher', assignedSubjectId: '' }); }}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'تعديل معلومات المستخدم' : 'أدخل معلومات المستخدم الجديد'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="اسم المستخدم"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور {!editingUser && '*'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "اتركه فارغًا للحفاظ على كلمة المرور الحالية" : "كلمة المرور"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">الدور *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'teacher') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="teacher">معلم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'teacher' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">المادة المخصصة *</Label>
                  <Select
                    value={formData.assignedSubjectId}
                    onValueChange={(value) => setFormData({ ...formData, assignedSubjectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingUser ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                    {user.username}
                  </CardTitle>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'مدير' : 'مدرس'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {user.role === 'teacher' && (
                  <p className="text-sm text-muted-foreground mb-4">
                    المادة: {getSubjectName(user.assignedSubjectId)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
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

export default UserManagement;
