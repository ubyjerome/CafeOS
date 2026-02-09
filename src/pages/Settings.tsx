import React, { useState, useEffect } from 'react';
import { db, tx, hashPassword, verifyPassword } from '@/lib/instantdb';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/cloudinary';
import { setDarkMode, getInitialTheme } from '@/lib/theme';
import { Building, User, Palette, Upload, Lock } from 'lucide-react';
import type { CompanySettings, User as UserType } from '@/lib/instantdb';

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isDark, setIsDark] = useState(getInitialTheme() === 'dark');
  const [isUploading, setIsUploading] = useState(false);

  const { data: settingsData } = db.useQuery({ companySettings: {} });
  const settings = (settingsData?.companySettings?.[0] || {}) as CompanySettings;

  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  });

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (settings.name) {
      setCompanyForm({
        name: settings.name || '',
        description: settings.description || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
      });
    }
  }, [settings]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleThemeToggle = (dark: boolean) => {
    setIsDark(dark);
    setDarkMode(dark);
    if (user) {
      db.transact([
        tx.users[user.id].update({
          theme: dark ? 'dark' : 'light',
          updatedAt: Date.now(),
        }),
      ]);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await updateProfile({ name: profileForm.name, phone: profileForm.phone });
    toast.success('Profile updated');
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!passwordForm.current || !passwordForm.newPassword || !passwordForm.confirm) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const isValid = await verifyPassword(passwordForm.current, user.passwordHash);
      if (!isValid) {
        toast.error('Current password is incorrect');
        return;
      }

      const newHash = await hashPassword(passwordForm.newPassword);
      await db.transact([
        tx.users[user.id].update({
          passwordHash: newHash,
          updatedAt: Date.now(),
        }),
      ]);
      toast.success('Password changed successfully');
      setPasswordForm({ current: '', newPassword: '', confirm: '' });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveCompany = () => {
    if (!settings.id) return;
    db.transact([
      tx.companySettings[settings.id].update({
        ...companyForm,
        updatedAt: Date.now(),
      }),
    ]);
    toast.success('Company settings updated');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings.id) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      db.transact([
        tx.companySettings[settings.id].update({
          logoUrl: url,
          updatedAt: Date.now(),
        }),
      ]);
      toast.success('Logo updated');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const isManager = user?.role === 'manager';

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" /> Appearance
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="company">
              <Building className="h-4 w-4 mr-2" /> Company
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <img
                      src={settings.logoUrl || '/placeholder.svg'}
                      alt="Logo"
                      className="h-16 w-16 object-contain rounded bg-muted"
                    />
                    <div>
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-muted"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload Logo'}
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyForm.name}
                    onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={companyForm.description}
                    onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={companyForm.address}
                    onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={companyForm.phone}
                      onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={companyForm.email}
                      onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveCompany}>Save Company Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
