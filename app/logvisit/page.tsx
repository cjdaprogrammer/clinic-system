'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, Trash2, Edit3, 
  AlertCircle, Activity, Thermometer, HeartPulse, Search, 
  ChevronDown, FileText, Printer 
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LogVisitPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  
  // Searchable Student State
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  // Form Fields
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [status, setStatus] = useState('Returned to Class');
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else fetchInitialData();
    };
    checkUser();
  }, [router]);

  async function fetchInitialData() {
    const { data: stds } = await supabase.from('students').select('id, name, student_id, grade_level').order('name', { ascending: true });
    const { data: vsts } = await supabase.from('visits').select('*, students(name, grade_level)').order('visit_time', { ascending: false });
    if (stds) setStudents(stds);
    if (vsts) setVisits(vsts);
  }

  // --- SMART GRADE LOGIC ---
  const formatGrade = (grade: string) => {
    if (!grade) return 'N/A';
    const cleanGrade = grade.toString();
    return cleanGrade.toLowerCase().includes('grade') ? cleanGrade : `Grade ${cleanGrade}`;
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  useEffect(() => {
    if (selectedStudentId) {
      const count = visits.filter(v => v.student_id === selectedStudentId).length;
      setVisitCount(count);
    } else { setVisitCount(0); }
  }, [selectedStudentId, visits]);

  const generateSlip = (visit: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text("QNHS CLINIC PASS", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(visit.visit_time).toLocaleString()}`, 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      body: [
        ['Student Name', visit.students?.name],
        ['Grade / Sec', formatGrade(visit.students?.grade_level)],
        ['Subject', visit.subject_at_time],
        ['Vitals', `${visit.temperature || '--'}°C | ${visit.blood_pressure || '--'} BP`],
        ['Reason', visit.reason],
        ['Outcome', visit.status],
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold'} }
    });
    doc.save(`Clinic_Slip_${visit.students?.name}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return alert("Please select a student from the list");
    setLoading(true);

    const payload = { 
      student_id: selectedStudentId, 
      subject_at_time: subject, 
      reason: reason,
      temperature: temp || null,
      blood_pressure: bp || null,
      status: status
    };

    const { error } = editingId 
      ? await supabase.from('visits').update(payload).eq('id', editingId)
      : await supabase.from('visits').insert([payload]);

    if (!error) {
      alert(editingId ? "Log Updated!" : "Visit Recorded!");
      resetForm();
      fetchInitialData();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null); setSelectedStudentId(''); setStudentSearch(''); 
    setSubject(''); setReason(''); setTemp(''); setBp(''); setStatus('Returned to Class');
  };

  const selectStudent = (student: any) => {
    setSelectedStudentId(student.id);
    setStudentSearch(student.name);
    setShowStudentList(false);
  };

  const startEdit = (v: any) => {
    setEditingId(v.id); 
    setSelectedStudentId(v.student_id);
    setStudentSearch(v.students?.name || '');
    setSubject(v.subject_at_time); setReason(v.reason);
    setTemp(v.temperature || ''); setBp(v.blood_pressure || ''); setStatus(v.status || 'Returned to Class');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this log?")) {
      await supabase.from('visits').delete().eq('id', id);
      fetchInitialData();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight text-black">
      
      {/* SIDEBAR NAVIGATION (SYNCHRONIZED - NO ITALICS) */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg shadow-teal-500/20">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">QNHS Clinic</h1>
        </div>

        <nav className="flex-1 space-y-2 text-white font-bold">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"><LayoutDashboard size={20} /> Dashboard</button>
          
          {/* Active Link: Log Visit */}
          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl shadow-teal-500/10 font-bold transition-all transform active:scale-95">
            <PlusCircle size={20} /> Log Visit
          </button>
          
          <button onClick={() => router.push('/students')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"><Users size={20} /> Students</button>
          <button onClick={() => router.push('/reports')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"><FileText size={20} /> Reports</button>
        </nav>

        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all group">
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 text-black">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{editingId ? "Modify Record" : "Log Visit"}</h2>
          <p className="text-slate-500 font-semibold mt-2 text-sm uppercase tracking-widest">Intake Management</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-black">
          {/* INTAKE FORM */}
          <div className="lg:col-span-4">
            <form onSubmit={handleSubmit} className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white space-y-5 sticky top-8">
              
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Student Selection</label>
                <div className="relative font-bold">
                  <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input type="text" className="w-full pl-11 pr-10 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-black outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold shadow-inner" placeholder="Search name..." value={studentSearch} onFocus={() => setShowStudentList(true)} onChange={(e) => {setStudentSearch(e.target.value); setSelectedStudentId('');}} />
                </div>
                {showStudentList && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <div key={s.id} onClick={() => selectStudent(s)} className="p-4 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all">
                        <p className="font-black text-slate-800 text-sm tracking-tight">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{s.student_id} — {formatGrade(s.grade_level)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {visitCount > 2 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700 text-[11px] font-black uppercase tracking-tight animate-pulse">
                  <AlertCircle size={18} /> Frequent: {visitCount} Records
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Temp (°C)</label><input type="number" step="0.1" className="w-full px-4 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold" placeholder="36.5" value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">BP</label><input className="w-full px-4 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold" placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} /></div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Outcome Status</label>
                <select className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold appearance-none cursor-pointer" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Returned to Class">Returned to Class</option>
                  <option value="Sent Home">Sent Home</option>
                  <option value="Resting in Clinic">Resting in Clinic</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Subject</label>
                <input className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold" placeholder="Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Reason</label>
                <textarea className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold" placeholder="Findings..." rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black text-white bg-[#14B8A6] hover:bg-[#0D9488] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs">
                {loading ? 'Wait...' : editingId ? 'Update Log' : 'Record Visit'}
              </button>
            </form>
          </div>

          {/* LOGGED RECORDS LIST */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                  <tr><th className="px-8 py-6">Student</th><th className="px-6 py-6 text-center">Vitals</th><th className="px-6 py-6 text-center">Status</th><th className="px-8 py-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {visits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-800 text-lg leading-none group-hover:text-[#14B8A6] transition-colors">{v.students?.name}</p>
                        {/* INCLUDED GRADE LEVEL HERE */}
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{formatGrade(v.students?.grade_level)} — {v.subject_at_time}</p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col gap-1 text-[11px] font-black">
                          <span className={parseFloat(v.temperature) >= 37.5 ? 'text-red-500 animate-pulse' : 'text-slate-600'}>{v.temperature ? `${v.temperature}°C` : '--'}</span>
                          <span className="text-slate-400 text-[9px] uppercase font-bold">{v.blood_pressure || '--'} BP</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${v.status === 'Sent Home' ? 'bg-red-50 text-red-600 border-red-100' : v.status === 'Resting in Clinic' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>{v.status}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => generateSlip(v)} className="p-2.5 text-slate-400 hover:text-[#14B8A6] transition-all" title="Print Slip"><Printer size={18} /></button>
                          <button onClick={() => startEdit(v)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"><Edit3 size={18} /></button>
                          <button onClick={() => handleDelete(v.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}