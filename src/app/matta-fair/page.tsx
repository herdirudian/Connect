'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Gift, MapPin, Phone, Mail, User, ArrowRight, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MattaFairPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    whatsapp: '',
    email: '',
    city: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/matta-fair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: data.message,
        });
        setFormData({ fullName: '', whatsapp: '', email: '', city: '' });
      } else {
        toast({
          title: "Error",
          description: data.message || 'Something went wrong',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Logos Section */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="flex items-center space-x-8">
            <div className="relative h-16 w-32">
              <Image 
                src="/logotlm.png" 
                alt="The Lodge Maribaya" 
                fill 
                className="object-contain"
              />
            </div>
            <div className="h-12 w-px bg-gray-300"></div>
            <div className="relative h-16 w-32">
              <Image 
                src="/img/matta-fair.jpg" 
                alt="Matta Fair" 
                fill 
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900 tracking-tight text-center italic">
            E-VOUCHER REWARDS
          </h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
          
          {/* Left Side - Benefits (Green) */}
          <div className="md:w-5/12 bg-[#1b4332] p-8 md:p-10 text-white flex flex-col justify-between">
            <div>
              <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-8">
                <Gift className="text-white w-6 h-6" />
              </div>
              
              <h2 className="text-4xl font-black mb-2 italic tracking-tighter">
                SPECIAL<br />REWARDS
              </h2>
              <p className="text-emerald-200 text-sm mb-8 font-medium">
                Exclusive for MATTA Fair participants to visit The Lodge Maribaya.
              </p>

              <div className="space-y-6">
                <div className="border-t border-white/20 pt-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-4 text-center">
                    TERMS & CONDITIONS
                  </p>
                  
                  <ul className="space-y-4">
                    {[
                      'Validity: Sept 7, 2026 - Aug 31, 2027',
                      'Free Access + Sky Tree Ride',
                      '20% Discount on F&B',
                      '10% Discount Stay (Code: MATTA)',
                      'Valid for 1 person per voucher',
                      'Cannot be combined with other promos'
                    ].map((tnc, idx) => (
                      <li key={idx} className="flex items-start space-x-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-emerald-50 leading-tight">{tnc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-white/10 flex flex-col items-center">
              <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase">
                The Lodge Maribaya Experience
              </p>
              <a 
                href="https://thelodgegroup.id/" 
                target="_blank" 
                className="mt-4 flex items-center space-x-2 text-xs text-white/70 hover:text-white transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span>thelodgegroup.id</span>
              </a>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:w-7/12 p-8 md:p-12 bg-white">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">VISITOR DATA</h3>
              <p className="text-gray-500 text-sm">Please fill in your details to receive your instant e-voucher via email.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    required
                    placeholder="Enter your full name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="tel"
                      required
                      placeholder="e.g. 0812345xxx"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Active Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="email"
                      required
                      placeholder="guest@email.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">City of Origin</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Kuala Lumpur, Jakarta"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#1b4332] hover:bg-[#081c15] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed mt-8 uppercase tracking-wider text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Claim Voucher Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center mt-6 leading-relaxed">
                By clicking the button above, you agree to receive voucher notifications via Email and WhatsApp.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
