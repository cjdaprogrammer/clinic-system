// Force Redeploy 1
'use client'

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, Search, Clock, 
  BookOpen, Activity, Stethoscope, Thermometer, HeartPulse, 
  AlertTriangle, ChevronRight, FileText, Download, 
  Printer, AlertCircle 
} from 'lucide-react'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ClinicDashboard() {
  const router = useRouter();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // --- 1. THE FETCH FUNCTION ---
  // Wrapped in useCallback to ensure it can be safely used in useEffect
  const fetchData = useCallback(async () => {
    setLoading(true);
    console.log("Fetching fresh data from Supabase...");

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*, students(name, grade_level, is_high_risk)')
      .order('visit_time', { ascending: false });

    if (visitError) {
      console.error("VISIT FETCH ERROR:", visitError.message);
    } else {
      setVisits(visitData || []);
    }

    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      setTotalStudents(count || 0);
    }

    setLoading(false);
  }, []);

  // --- 2. INITIAL LOAD & AUTH CHECK ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        fetchData();
      }
    };
    checkUser();
  }, [router, fetchData]);

  // --- 3. REALTIME UPDATES ---
  useEffect(() => {
    console.log("Initializing Realtime connection...");
    
    const channel = supabase
      .channel('clinic-updates-channel')
      .on(
        'postgres_changes', 
        { 
          event: '*', // Listen for ALL changes (INSERT, UPDATE, DELETE)
          schema: 'public', 
          table: 'visits' 
        }, 
        (payload) => {
          console.log('Realtime change detected!', payload);
          fetchData(); // Trigger a full refresh so we get the joined student data
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // --- HELPERS ---
  const formatGrade = (grade: string) => {
    if (!grade) return 'N/A';
    return grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;
  };

  const generateStudentReport = (studentId: string, studentName: string, grade: string) => {
    const doc = new jsPDF();
    const studentHistory = visits.filter(v => v.student_id === studentId);

    doc.setFontSize(20);
    doc.setTextColor(20, 184, 166);
    doc.text("QNHS SCHOOL CLINIC", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Student Medical History Report", 105, 28, { align: 'center' });
    doc.line(20, 35, 190, 35);
    
    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: studentHistory.map(v => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time,
        v.reason,
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Returned to Class'
      ]),
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`${studentName.replace(/\s+/g, '_')}_Clinic_Report.pdf`);
  };

  const filteredVisits = visits.filter((visit) => {
    const studentName = visit.students?.name?.toLowerCase() || '';
    const subject = visit.subject_at_time?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || subject.includes(query);
  });

  const getTopSubject = () => {
    if (visits.length === 0) return "---";
    const counts: any = {};
    visits.forEach(v => {
      const s = v.subject_at_time || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const sentHomeCount = visits.filter(v => v.status === 'Sent Home').length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg shadow-teal-500/20"><Activity size={24} /></div>
          <h1 className="text-xl font-black tracking-tighter uppercase">QNHS Clinic</h1>
        </div>
        <nav className="flex-1 space-y-2 text-white font-bold">
          <button onClick={() => router.push('/')} className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl font-bold"><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => router.push('/logvisit')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><PlusCircle size={20} /> Log Visit</button>
          <button onClick={() => router.push('/students')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><Users size={20} /> Students</button>
          <button onClick={() => router.push('/reports')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><FileText size={20} /> Reports</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold group"><LogOut size={20} /> Sign Out</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div><h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Clinic Overview</h2><p className="text-slate-500 font-semibold mt-2">Health Status & Analytics Dashboard</p></div>
          <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-4 top-4 text-slate-300" size={18} />
                <input className="pl-12 pr-6 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#14B8A6] outline-none w-full md:w-72 bg-white text-slate-800 font-medium shadow-sm" placeholder="Quick search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             </div>
             <button onClick={fetchData} className="bg-white border border-slate-200 p-3.5 rounded-2xl hover:bg-slate-50 text-slate-600 transition-all active:rotate-180"><Clock size={20} /></button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 text-black">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex flex-col justify-between group hover:border-[#14B8A6]/30 transition-all"><div className="flex justify-between items-center mb-4"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Total Visits</p><div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Stethoscope size={20} /></div></div><p className="text-4xl font-black text-slate-800">{visits.length}</p></div>
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex flex-col justify-between group hover:border-[#14B8A6]/30 transition-all"><div className="flex justify-between items-center mb-4"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Hotspot Subject</p><div className="bg-teal-50 text-[#14B8A6] p-3 rounded-2xl"><BookOpen size={20} /></div></div><p className="text-2xl font-black text-[#14B8A6] leading-tight truncate">{getTopSubject()}</p></div>
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex flex-col justify-between group hover:border-[#14B8A6]/30 transition-all"><div className="flex justify-between items-center mb-4"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Registered Students</p><div className="bg-slate-50 text-slate-800 p-3 rounded-2xl"><Users size={20} /></div></div><p className="text-4xl font-black text-blue-600">{totalStudents}</p></div>
          <div className="bg-[#14B8A6] p-6 rounded-[2rem] shadow-xl text-white flex flex-col justify-between transition-all hover:scale-[1.02]"><div className="flex justify-between items-center mb-4"><p className="text-teal-100 font-bold text-[10px] uppercase tracking-widest">Sent Home</p><div className="bg-teal-400/30 p-3 rounded-2xl"><AlertTriangle size={20} /></div></div><p className="text-4xl font-black">{sentHomeCount}</p></div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden text-black font-bold">
          <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center"><h3 className="font-black text-2xl text-slate-800 tracking-tighter">Live Medical Logs</h3><button onClick={() => router.push('/logvisit')} className="flex items-center gap-2 text-[#14B8A6] text-sm font-black hover:underline group">Manage All Logs <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
             <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                <tr>
                  <th className="px-10 py-6">Student</th>
                  <th className="px-6 py-6 text-center">Vital Signs</th>
                  <th className="px-6 py-6 text-center">Triage Outcome</th>
                  <th className="px-6 py-6">Reason / Subject</th>
                  <th className="px-6 py-6 text-center">Print</th> 
                  <th className="px-10 py-6 text-right">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVisits.map((visit) => {
                  const isHighRisk = visit.students?.is_high_risk;
                  return (
                    <tr key={visit.id} className={`transition-all group ${isHighRisk ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-10 py-6 flex items-center gap-4">
                        <div className={`${isHighRisk ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'} p-3 rounded-full font-black text-xs uppercase`}>
                          {visit.students?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className={`font-black text-lg leading-none flex items-center gap-2 ${isHighRisk ? 'text-red-700' : 'text-slate-800'}`}>
                            {visit.students?.name || 'Unknown'}
                            {isHighRisk && <AlertCircle size={16} className="text-red-600" />}
                          </p>
                          <p className={`text-xs font-bold mt-1.5 uppercase tracking-wider ${isHighRisk ? 'text-red-400' : 'text-slate-400'}`}>
                            {formatGrade(visit.students?.grade_level)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`flex items-center gap-1 text-xs font-black ${parseFloat(visit.temperature) >= 37.5 ? 'text-red-500' : 'text-slate-600'}`}><Thermometer size={14} /> {visit.temperature ? `${visit.temperature}°C` : '--'}</div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter"><HeartPulse size={12} /> {visit.blood_pressure || '--'} BP</div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm border ${visit.status === 'Sent Home' ? 'bg-red-50 text-red-600 border-red-100' : visit.status === 'Resting in Clinic' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>{visit.status || 'Returned'}</span></td>
                      <td className="px-6 py-6">
                        <p className={`text-sm font-bold leading-tight ${isHighRisk ? 'text-red-800' : 'text-slate-700'}`}>{visit.reason}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-1 block uppercase ${isHighRisk ? 'text-red-500' : 'text-[#14B8A6]'}`}>During {visit.subject_at_time}</span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button 
                          onClick={() => generateStudentReport(visit.student_id, visit.students.name, visit.students.grade_level)} 
                          className={`p-3 rounded-2xl transition-all border border-transparent ${isHighRisk ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'}`}
                        >
                          <Printer size={20} />
                        </button>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <p className={`font-black text-sm leading-none tracking-tight ${isHighRisk ? 'text-red-700' : 'text-slate-700'}`}>{new Date(visit.visit_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${isHighRisk ? 'text-red-400' : 'text-slate-400'}`}>{new Date(visit.visit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}