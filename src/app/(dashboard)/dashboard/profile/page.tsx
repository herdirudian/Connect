'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, Save, Loader2, Shield, Camera } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    avatarUrl: ''
  });

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          name: data.user.name,
          email: data.user.email,
          phoneNumber: data.user.phoneNumber || '',
          dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
          avatarUrl: data.user.avatarUrl || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });

      const json = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, avatarUrl: json.url }));
        setMessage({ type: 'success', text: 'Image uploaded successfully. Click "Save Changes" to apply.' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while uploading image' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    // If changing password and not yet verified, send code first
    if (formData.password && !verificationStep) {
      setIsSendingCode(true);
      try {
        const res = await fetch('/api/auth/profile/send-verification', {
          method: 'POST'
        });
        const data = await res.json();
        
        if (res.ok) {
          setVerificationStep(true);
          setMessage({ type: 'success', text: 'Kode verifikasi telah dikirim ke email Anda' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Gagal mengirim kode verifikasi' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengirim kode verifikasi' });
      } finally {
        setIsSendingCode(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          avatarUrl: formData.avatarUrl,
          ...(formData.password ? { 
            password: formData.password,
            verificationCode: verificationCode 
          } : {})
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        setVerificationStep(false);
        setVerificationCode('');
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="border-b border-gray-100 pb-6">
        <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">My Profile</h2>
        <p className="text-gray-500 font-medium mt-1">Manage your personal information and security settings.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Summary Card */}
        <Card className="border-gray-100 shadow-md h-fit">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="w-24 h-24 rounded-full bg-brand text-white flex items-center justify-center text-3xl font-black shadow-lg ring-4 ring-brand-50 overflow-hidden">
                {formData.avatarUrl ? (
                  <img 
                    src={formData.avatarUrl} 
                    alt={user?.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 bg-white text-brand-dark p-1.5 rounded-full shadow-md border border-gray-100 cursor-pointer hover:bg-brand-50 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            <h3 className="text-xl font-black text-gray-900">{user?.name}</h3>
            <p className="text-sm font-medium text-gray-500 mb-4">{user?.email}</p>
            
            <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Membership Tier</span>
                <span className="text-xs font-black text-brand bg-brand-50 px-2 py-0.5 rounded-md uppercase">{user?.tier || 'MEMBER'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase">Points Balance</span>
                <span className="text-sm font-black text-brand-dark">{user?.points?.toLocaleString()} PTS</span>
              </div>
              {user?.referralCode && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Referral Code</span>
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-2 flex items-center justify-between group cursor-pointer hover:border-brand-300 transition-colors"
                       onClick={() => {
                         navigator.clipboard.writeText(user.referralCode);
                         setMessage({ type: 'success', text: 'Referral code copied to clipboard!' });
                       }}>
                    <code className="text-sm font-black text-gray-800 tracking-wider">{user.referralCode}</code>
                    <span className="text-[10px] font-bold text-brand bg-brand-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium leading-tight">
                    Share this code to earn 50 points for every friend who joins!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="lg:col-span-2 border-gray-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black text-brand-dark uppercase tracking-tight">
              <User className="h-5 w-5" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-500">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-500">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase text-gray-500">Phone Number</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-xs font-bold uppercase text-gray-500">Date of Birth</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="flex items-center gap-2 text-sm font-black text-brand-dark uppercase tracking-tight mb-4">
                  <Shield className="h-4 w-4" />
                  Security
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase text-gray-500">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase text-gray-500">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-9 border-gray-200 focus:border-brand focus:ring-brand"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={saving || isSendingCode}
                  className="bg-brand-dark hover:bg-brand text-white font-bold uppercase tracking-wider min-w-[140px]"
                >
                  {saving || isSendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSendingCode ? 'Mengirim Kode...' : 'Menyimpan...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {verificationStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-brand-dark mb-4 uppercase tracking-tight">Verifikasi Perubahan Password</h3>
            <p className="text-sm text-gray-500 mb-6">
              Kami telah mengirimkan kode verifikasi 6 digit ke email Anda. Silakan masukkan kode tersebut di bawah ini untuk mengonfirmasi perubahan password.
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-xs font-bold uppercase text-gray-500">Kode Verifikasi</Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14 border-gray-300 focus:border-brand focus:ring-brand"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => {
                    setVerificationStep(false);
                    setVerificationCode('');
                    setIsSendingCode(false);
                  }}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={saving || verificationCode.length !== 6}
                  className="bg-brand-dark hover:bg-brand text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    'Verifikasi & Simpan'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
