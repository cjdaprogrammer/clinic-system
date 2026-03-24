'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct!
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, Search, Clock, 
  BookOpen, Activity, Stethoscope, Thermometer, HeartPulse, 
  AlertTriangle, ChevronRight, FileText, Download, 
  Printer, AlertCircle 
} from 'lucide-react'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ADDED TYPES TO FIX ERRORS ---
interface Student {
  name: string;
  grade_level: string;
  is_high_risk: boolean;
}

interface Visit {
  id: string;
  student_id: string;
  visit_time: string;
  subject_at_time: string;
  reason: string;
  temperature: string;
  blood_pressure: string;
  status: string;
  students: Student; // This matches your Supabase join
}

export default function ClinicDashboard() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]); // Use the Visit type
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*, students(name, grade_level, is_high_risk)')
      .order('visit_time', { ascending: false });

    if (visitError) {
      console.error("VISIT FETCH ERROR:", visitError.message);
    } else {
      setVisits((visitData as any) || []);
    }

    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      setTotalStudents(count || 0);
    }

    setLoading(false);
  }, []);

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

  useEffect(() => {
    const channel = supabase
      .channel('clinic-updates-channel')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'visits' }, 
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const formatGrade = (grade: string) => {
    if (!grade) return 'N/A';
    return grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;
  };

  const generateStudentReport = (studentId: string, studentName: string) => {
    const doc = new jsPDF();
    const studentHistory = visits.filter(v => v.student_id === studentId);

    doc.setFontSize(20);
    doc.text("QNHS SCHOOL CLINIC", 105, 20, { align: 'center' });
    
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: studentHistory.map(v => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time,
        v.reason,
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Returned to Class'
      ]),
    });
    doc.save(`${studentName.replace(/\s+/g, '_')}_Clinic_Report.pdf`);
  };

  const getTopSubject = () => {
    if (visits.length === 0) return "---";
    const counts: Record<string, number> = {};
    visits.forEach(v => {
      const s = v.subject_at_time || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const filteredVisits = visits.filter((visit) => {
    const studentName = visit.students?.name?.toLowerCase() || '';
    const subject = visit.subject_at_time?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || subject.includes(query);
  });

  const sentHomeCount = visits.filter(v => v.status === 'Sent Home').length;

  if (loading) return <div className="p-10 font-bold">Loading Dashboard...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg shadow-teal-500/20">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">QNHS Clinic</h1>
        </div>
        <nav className="flex-1 space-y-2 text-white font-bold">
          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl font-bold transition-all"><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => router.push('/logvisit')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><PlusCircle size={20} /> Log Visit</button>
          <button onClick={() => router.push('/students')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><Users size={20} /> Students</button>
          <button onClick={() => router.push('/reports')} className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><FileText size={20} /> Reports</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all transform active:scale-95"><LogOut size={20} /> Sign Out</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter">School Clinic Dashboard</h2>
              <p className="text-slate-500 font-semibold mt-2 text-sm uppercase tracking-widest">Medical Analytics Overview</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="Search student or subject..." 
                  className="pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#14B8A6] outline-none text-sm font-bold w-64 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </header>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{totalStudents}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl text-blue-500"><Users size={24} /></div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Visits</p>
                <p className="text-3xl font-black text-slate-800 mt-1">{visits.length}</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-2xl text-[#14B8A6]"><Activity size={24} /></div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent Home</p>
                <p className="text-3xl font-black text-red-600 mt-1">{sentHomeCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-red-500"><AlertTriangle size={24} /></div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Subject</p>
                <p className="text-xl font-black text-slate-800 mt-1 truncate max-w-[120px]">{getTopSubject()}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl text-amber-500"><BookOpen size={24} /></div>
            </div>
          </div>

          {/* RECENT VISITS TABLE */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800">Recent Medical Visits</h3>
              <button 
                onClick={() => router.push('/reports')}
                className="text-[10px] font-black uppercase text-[#14B8A6] hover:underline flex items-center gap-1"
              >
                View Full Logs <ChevronRight size={14} />
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                <tr>
                  <th className="px-10 py-5">Student Patient</th>
                  <th className="px-6 py-5 text-center">Observation</th>
                  <th className="px-6 py-5 text-center">Outcome</th>
                  <th className="px-10 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVisits.length > 0 ? filteredVisits.slice(0, 10).map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl font-black text-xs shadow-inner uppercase ${v.students?.is_high_risk ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                          {v.students?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-black text-lg tracking-tight leading-none ${v.students?.is_high_risk ? 'text-red-700' : 'text-slate-800'}`}>
                            {v.students?.name}
                            {v.students?.is_high_risk && <AlertCircle size={14} className="inline ml-1 text-red-500" />}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">
                            {formatGrade(v.students?.grade_level)} • {v.subject_at_time}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[11px] font-black text-slate-600 flex items-center gap-1">
                          <Thermometer size={12} className="text-orange-400" /> {v.temperature ? `${v.temperature}°C` : '--'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-300 uppercase letter-wider flex items-center gap-1">
                          <HeartPulse size={12} className="text-red-300" /> {v.blood_pressure || '--'} BP
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${v.status === 'Sent Home' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
                        {v.status || 'Resolved'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => generateStudentReport(v.student_id, v.students?.name)}
                        className="p-2.5 text-slate-300 hover:text-[#14B8A6] transition-all transform active:scale-90"
                        title="Download Report"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                      No medical records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}