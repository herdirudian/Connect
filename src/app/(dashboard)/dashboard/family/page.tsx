'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, UserPlus, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function FamilyPage() {
  const [family, setFamily] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHead, setIsHead] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Member Form State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Child');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchFamily();
  }, []);

  async function fetchFamily() {
    try {
      const res = await fetch('/api/family');
      if (res.ok) {
        const data = await res.json();
        if (data.family) {
          setFamily(data.family);
          setMembers(data.family.members);
        } else {
            // No family yet
            setFamily(null);
            setMembers([]);
        }
        setIsHead(data.isHead);
      }
    } catch (error) {
      console.error('Failed to fetch family', error);
    } finally {
      setLoading(false);
    }
  }

  async function createFamily() {
     setLoading(true);
     try {
        const res = await fetch('/api/family', { method: 'POST' });
        if (res.ok) {
           await fetchFamily();
        }
     } catch (error) {
        console.error(error);
     } finally {
        setLoading(false);
     }
  }

  async function handleAddMember(e: React.FormEvent) {
     e.preventDefault();
     setAddLoading(true);
     setAddError('');

     try {
        const res = await fetch('/api/family/members', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              email: newMemberEmail,
              relation: newMemberRelation
           })
        });

        const data = await res.json();
        if (res.ok) {
           setShowAddModal(false);
           setNewMemberEmail('');
           fetchFamily();
        } else {
           setAddError(data.error || 'Failed to add member');
        }
     } catch (error) {
        setAddError('Something went wrong');
     } finally {
        setAddLoading(false);
     }
  }

  async function handleRemoveMember(id: string) {
     if (!confirm('Are you sure you want to remove this member?')) return;
     
     try {
        const res = await fetch(`/api/family/members?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
           fetchFamily();
        } else {
           const data = await res.json();
           alert(data.error);
        }
     } catch (error) {
        alert('Failed to remove member');
     }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Family Members</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Manage your family group and memberships.</p>
        </div>
        
        {family && isHead && (
            <Button onClick={() => setShowAddModal(true)} variant="primary" className="flex items-center gap-2">
            <UserPlus size={16} />
            Add Member
            </Button>
        )}
      </div>

      {!family ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
             <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-brand" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">You don't have a family group yet</h3>
             <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-6">Create a family group to share benefits and manage memberships together.</p>
             <Button onClick={createFamily} size="lg" className="rounded-full font-bold">
                Create Family Group
             </Button>
          </div>
      ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand font-bold text-xl overflow-hidden">
                    {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                        member.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <p className="text-sm text-gray-500">{member.isFamilyHead ? 'Head of Family' : 'Member'}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Relation</span>
                      <span className="font-medium text-gray-700">{member.familyRelation || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Joined</span>
                      <span className="font-medium text-gray-700">
                         {new Date(member.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {isHead && !member.isFamilyHead && (
                       <Button 
                          onClick={() => handleRemoveMember(member.id)}
                          variant="outline" 
                          className="w-full mt-4 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                       >
                         <Trash2 size={16} className="mr-2" />
                         Remove
                       </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add New Member Card (Only for Head) */}
            {isHead && (
                <Card 
                   onClick={() => setShowAddModal(true)}
                   className="border-dashed border-2 border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-6 hover:border-brand-300 hover:bg-brand-50 transition cursor-pointer group"
                >
                  <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8 text-gray-400 group-hover:text-brand" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Add New Member</h3>
                  <p className="text-sm text-gray-500 mt-1">Invite family members to join your circle.</p>
                </Card>
            )}
          </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Add Family Member</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                     <X className="w-5 h-5 text-gray-500" />
                  </button>
               </div>

               <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                     <Input 
                        type="email" 
                        placeholder="Enter member's email" 
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        required
                     />
                     <p className="text-xs text-gray-500 mt-1">User must already be registered.</p>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                     <select 
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={newMemberRelation}
                        onChange={(e) => setNewMemberRelation(e.target.value)}
                     >
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                     </select>
                  </div>

                  {addError && (
                     <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">
                        {addError}
                     </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                     <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                     <Button type="submit" disabled={addLoading}>
                        {addLoading ? 'Adding...' : 'Add Member'}
                     </Button>
                  </div>
               </form>
            </div>
            <div className="absolute inset-0 -z-10" onClick={() => setShowAddModal(false)}></div>
         </div>,
         document.body
      )}
    </div>
  );
}
