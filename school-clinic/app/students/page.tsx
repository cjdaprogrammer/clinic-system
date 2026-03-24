'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, Trash2, Edit3, 
  Activity, Search, FileText, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';

export default function StudentsPage() {
  const router = useRouter();
  
  // List State
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // Form State
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState(''); 
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [isHighRisk, setIsHighRisk] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- 1. FETCH DATA ---
  const fetchStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });
    if (data) setStudents(data);
  }, []);

  // --- 2. AUTH & INITIAL LOAD ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else fetchStudents();
    };
    checkUser();
  }, [router, fetchStudents]);

  // --- 3. REALTIME SYNC (Kiosk to Directory) ---
  useEffect(() => {
    const channel = supabase
      .channel('student-directory-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStudents]);

  // --- 4. HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { 
      name: name.trim(), 
      student_id: studentId.trim(), 
      grade_level: grade, 
      section: section.trim(),
      is_high_risk: isHighRisk 
    };

    if (editingId) {
      const { error } = await supabase.from('students').update(payload).eq('id', editingId);
      if (error) alert(error.code === '23505' ? "ID already exists!" : error.message);
      else { setEditingId(null); resetForm(); }
    } else {
      const { error } = await supabase.from('students').insert([payload]);
      if (error) alert(error.code === '23505' ? "ID already exists!" : error.message);
      else { resetForm(); }
    }
    fetchStudents();
    setLoading(false);
  };

  const resetForm = () => { 
    setName(''); setStudentId(''); setGrade(''); setSection(''); 
    setIsHighRisk(false); setEditingId(null); 
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this student and ALL their clinic visit history?")) {
      await supabase.from('students').delete().eq('id', id);
      fetchStudents();
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.id); 
    setName(s.name); 
    setStudentId(s.student_id);
    setGrade(s.grade_level || ''); 
    setSection(s.section || '');
    setIsHighRisk(s.is_high_risk || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg shadow-teal-500/20"><Activity size={24} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">QNHS Clinic</h1>
        </div>
        <nav className="flex-1 space-y-2 text-white font-bold">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => router.push('/logvisit')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><PlusCircle size={20} /> Log Visit</button>
          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl font-bold"><Users size={20} /> Students</button>
          <button onClick={() => router.push('/reports')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><FileText size={20} /> Reports</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold"><LogOut size={20} /> Sign Out</button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8">
             <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Student Directory</h2>
                <p className="text-slate-500 font-semibold mt-2 text-sm uppercase tracking-widest">Medical Database</p>
             </div>
             <div className="bg-white px-8 py-4 rounded-[1.5rem] shadow-xl border border-white flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Records</p>
                  <p className="text-3xl font-black text-[#14B8A6] leading-none mt-1">{students.length}</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-2xl text-[#14B8A6]"><Users size={24} /></div>
             </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* ENHANCED FORM */}
            <div className="lg:col-span-4">
              <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[2.5rem] shadow-2xl border border-white space-y-5 sticky top-8">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-2xl text-slate-800 tracking-tight">
                    {editingId ? 'Edit Profile' : 'Register'}
                    </h3>
                    {editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-red-500 hover:underline">Cancel</button>}
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Full Name</label>
                  <input className="directory-input" placeholder="Juan Dela Cruz" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Student ID</label>
                  <input className="directory-input font-mono" placeholder="2024-0001" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">Grade</label>
                    <select className="directory-input" value={grade} onChange={(e) => setGrade(e.target.value)} required>
                        <option value="">Select</option>
                        {[7,8,9,10,11,12].map(g => <option key={g} value={g.toString()}>Grade {g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">Section</label>
                    <input className="directory-input" placeholder="Newton" value={section} onChange={(e) => setSection(e.target.value)} required />
                  </div>
                </div>

                {/* HIGH RISK TOGGLE */}
                <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isHighRisk ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
                     onClick={() => setIsHighRisk(!isHighRisk)}>
                    <div>
                        <p className={`text-xs font-black uppercase ${isHighRisk ? 'text-red-600' : 'text-slate-500'}`}>High Risk Student</p>
                        <p className="text-[10px] font-bold text-slate-400">Flag for special medical attention</p>
                    </div>
                    {isHighRisk ? <AlertCircle className="text-red-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                </div>

                <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest text-white ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-[#14B8A6] hover:bg-[#0D9488] shadow-teal-500/20'}`}>
                  {loading ? 'Processing...' : editingId ? 'Update Record' : 'Register Student'}
                </button>
              </form>
            </div>

            {/* DIRECTORY LIST */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
                   <div className="relative flex-1">
                      <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
                      <input 
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold text-sm" 
                        placeholder="Search by Name or Student ID"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                    <tr>
                        <th className="px-8 py-5">Student Info</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className={`hover:bg-slate-50/50 group transition-all ${s.is_high_risk ? 'bg-red-50/30' : ''}`}>
                        <td className="px-8 py-5 flex items-center gap-4">
                          <div className={`p-3 rounded-full font-black text-xs shadow-inner uppercase ${s.is_high_risk ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                            {s.name?.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-black text-lg leading-tight flex items-center gap-2 ${s.is_high_risk ? 'text-red-700' : 'text-slate-800'}`}>
                                {s.name}
                                {s.is_high_risk && <AlertCircle size={16} />}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
                                Grade {s.grade_level} — {s.section} • Student ID: {s.student_id}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           {s.is_high_risk ? (
                               <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tighter">High Risk</span>
                           ) : (
                               <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">Standard</span>
                           )}
                        </td>
                        <td className="px-8 py-5 text-right flex justify-end gap-1">
                          <button onClick={() => startEdit(s)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl active:scale-90 transition-all"><Edit3 size={18} /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl active:scale-90 transition-all"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .directory-input {
          width: 100%; border: 1px solid #f1f5f9; background: #f8fafc; 
          padding: 0.875rem; border-radius: 1rem; outline: none; 
          font-weight: 700; color: #1e293b; transition: all 0.2s;
        }
        .directory-input:focus {
          border-color: #14B8A6; ring: 2px; ring-color: #14B8A6; background: white;
        }
      `}</style>
    </div>
  );
}