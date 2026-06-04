'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, LogOut, Search, Activity,
  FileText, PlusCircle, AlertTriangle, Download, BookOpen, UserRound
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  temperature: string | null;
  blood_pressure: string | null;
  status: string;
  students?: Student;
}

export default function ClinicDashboard() {
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: visitData } = await supabase
      .from('visits')
      .select('*, students(name, grade_level, is_high_risk)')
      .order('visit_time', { ascending: false });

    setVisits((visitData as Visit[]) || []);

    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    setTotalStudents(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else fetchData();
    };

    checkUser();
  }, [router, fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('clinic-updates-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const formatGrade = (grade: string) =>
    !grade ? 'N/A' :
    grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;

  const sentHomeCount = visits.filter(v => v.status === 'Sent Home').length;

  const getTopSubject = () => {
    const counts: Record<string, number> = {};

    visits.forEach(v => {
      const subject = v.subject_at_time || 'Unknown';
      counts[subject] = (counts[subject] || 0) + 1;
    });

    return Object.keys(counts).reduce(
      (a, b) => counts[a] > counts[b] ? a : b,
      '---'
    );
  };

  const filteredVisits = visits.filter(v => {
    const name = v.students?.name?.toLowerCase() || '';
    const subject = v.subject_at_time?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();

    return name.includes(q) || subject.includes(q);
  });

  const generateStudentReport = (studentId: string, studentName: string) => {
    const doc = new jsPDF();
    const history = visits.filter(v => v.student_id === studentId);

    doc.setFontSize(18);
    doc.text('QNHS CLINIC REPORT', 105, 20, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: history.map(v => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time || '--',
        v.reason || '--',
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Waiting'
      ]),
    });

    doc.save(`${studentName.replace(/\s+/g, '_')}_report.pdf`);
  };

  if (loading) {
    return <div className="p-10 font-bold">Loading Dashboard...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-[320px] bg-[#0B1023] text-white p-8 flex flex-col">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-[#2CC6A3] p-3 rounded-xl shadow-lg shadow-teal-500/30">
            <Activity size={28} />
          </div>
          <h1 className="text-2xl font-black">QNHS CLINIC</h1>
        </div>

        <nav className="flex flex-col gap-5 text-lg font-bold">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-4 bg-[#2CC6A3] px-6 py-5 rounded-2xl text-white"
          >
            <LayoutDashboard /> Dashboard
          </button>

          <button
            onClick={() => router.push('/logvisit')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white"
          >
            <PlusCircle /> Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white"
          >
            <Users /> Students
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white"
          >
            <FileText /> Reports
          </button>
        </nav>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="mt-auto flex items-center gap-4 text-red-400 font-bold text-lg"
        >
          <LogOut /> Sign Out
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10">

        {/* TITLE + SEARCH */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-5xl font-black text-[#0F172A]">
              School Clinic Dashboard
            </h2>
            <p className="tracking-[0.25em] text-slate-500 font-bold mt-3">
              MEDICAL ANALYTICS OVERVIEW
            </p>
          </div>

          <div className="relative w-[330px]">
            <Search className="absolute left-5 top-5 text-slate-400" size={20} />
            <input
              className="w-full pl-14 pr-4 py-5 rounded-2xl bg-white shadow border border-slate-100 outline-none font-semibold"
              placeholder="Search student or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-7 mb-10">
          <StatCard title="TOTAL STUDENTS" value={totalStudents} icon={<Users />} color="blue" />
          <StatCard title="TOTAL VISITS" value={visits.length} icon={<Activity />} color="teal" />
          <StatCard title="SENT HOME" value={sentHomeCount} icon={<AlertTriangle />} color="red" />
          <StatCard title="TOP SUBJECT" value={getTopSubject()} icon={<BookOpen />} color="yellow" />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-8">
            <h3 className="text-2xl font-black">Recent Medical Visits</h3>
            <button
              onClick={() => router.push('/reports')}
              className="text-[#2CC6A3] font-black text-sm"
            >
              VIEW FULL LOGS ›
            </button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-xs tracking-[0.25em]">
              <tr>
                <th className="p-6">STUDENT PATIENT</th>
                <th>OBSERVATION</th>
                <th>OUTCOME</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredVisits.map(v => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                        {v.students?.name?.charAt(0) || <UserRound size={18} />}
                      </div>

                      <div>
                        <p className="font-black text-xl">{v.students?.name || 'Unknown'}</p>
                        <p className="text-xs font-black text-slate-400">
                          {formatGrade(v.students?.grade_level || '')} • {v.subject_at_time || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="text-sm font-bold text-slate-500">
                    🌡 {v.temperature || '--'} <br />
                    💗 {v.blood_pressure || '--'} BP
                  </td>

                  <td>
                    <span className={`px-5 py-2 rounded-full text-xs font-black ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-teal-50 text-teal-600 border border-teal-100'
                    }`}>
                      {v.status || 'WAITING'}
                    </span>
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        generateStudentReport(
                          v.student_id,
                          v.students?.name || 'student'
                        )
                      }
                      className="text-slate-300 hover:text-[#2CC6A3]"
                    >
                      <Download />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'teal' | 'red' | 'yellow';
}) {
  const colorClass = {
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-500',
    red: 'bg-red-50 text-red-500',
    yellow: 'bg-yellow-50 text-yellow-500',
  };

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl flex justify-between items-center">
      <div>
        <p className="text-xs tracking-[0.25em] text-slate-400 font-black">
          {title}
        </p>
        <p className="text-4xl font-black mt-3">{value}</p>
      </div>

      <div className={`p-5 rounded-2xl ${colorClass[color]}`}>
        {icon}
      </div>
    </div>
  );
}