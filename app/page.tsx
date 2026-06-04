'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard,
  Users,
  LogOut,
  Search,
  Activity,
  FileText,
  PlusCircle,
  AlertTriangle,
  Download,
  BookOpen,
  UserRound,
  RefreshCcw,
  Calendar,
  Thermometer,
  ShieldAlert
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

    try {
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .select('*, students(name, grade_level, is_high_risk)')
        .order('visit_time', { ascending: false });

      if (visitError) {
        console.warn('Visit warning:', visitError.message);
        setVisits([]);
      } else {
        setVisits((visitData as Visit[]) || []);
      }

      const { count, error: studentError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (studentError) {
        console.warn('Student count warning:', studentError.message);
      }

      setTotalStudents(count || 0);
    } catch (err) {
      console.warn('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Auth warning:', error.message);
          router.push('/login');
          setLoading(false);
          return;
        }

        if (!data.session) {
          router.push('/login');
          setLoading(false);
          return;
        }

        await fetchData();
      } catch (err) {
        console.warn('Auth check failed:', err);
        router.push('/login');
        setLoading(false);
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
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const formatGrade = (grade: string | undefined) => {
    if (!grade) return 'N/A';
    return grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;
  };

  const sentHomeCount = visits.filter((v) => v.status === 'Sent Home').length;

  const todayVisitCount = visits.filter(
    (v) => new Date(v.visit_time).toDateString() === new Date().toDateString()
  ).length;

  const feverAlertCount = visits.filter(
    (v) => Number(v.temperature || 0) >= 37.5
  ).length;

  const highRiskVisitCount = visits.filter(
    (v) => v.students?.is_high_risk
  ).length;

  const getTopSubject = () => {
    const counts: Record<string, number> = {};

    visits.forEach((v) => {
      const subject = v.subject_at_time || 'Unknown';
      counts[subject] = (counts[subject] || 0) + 1;
    });

    const subjects = Object.keys(counts);
    if (subjects.length === 0) return '---';

    return subjects.reduce((a, b) => (counts[a] > counts[b] ? a : b));
  };

  const filteredVisits = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return visits.filter((v) => {
      const name = v.students?.name?.toLowerCase() || '';
      const subject = v.subject_at_time?.toLowerCase() || '';
      const reason = v.reason?.toLowerCase() || '';
      const status = v.status?.toLowerCase() || '';

      return (
        q === '' ||
        name.includes(q) ||
        subject.includes(q) ||
        reason.includes(q) ||
        status.includes(q)
      );
    });
  }, [visits, searchQuery]);

  const recentVisits = filteredVisits.slice(0, 10);

  const generateStudentReport = (studentId: string, studentName: string) => {
    const doc = new jsPDF();

    const history = visits.filter((v) => v.student_id === studentId);

    doc.setFontSize(18);
    doc.text('QNHS CLINIC STUDENT REPORT', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Student: ${studentName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    doc.text(`Total Visits: ${history.length}`, 14, 42);

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: history.map((v) => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time || '--',
        v.reason || '--',
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Waiting'
      ])
    });

    doc.save(`${studentName.replace(/\s+/g, '_')}_report.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl font-black text-slate-700 animate-pulse">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">

      <aside className="w-[320px] bg-[#0B1023] text-white p-8 flex flex-col sticky top-0 h-screen">
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
            <LayoutDashboard />
            Dashboard
          </button>

          <button
            onClick={() => router.push('/logvisit')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl"
          >
            <PlusCircle />
            Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl"
          >
            <Users />
            Students
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl"
          >
            <FileText />
            Reports
          </button>
        </nav>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="mt-auto flex items-center gap-4 text-red-400 font-bold text-lg"
        >
          <LogOut />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-10">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
          <div>
            <h2 className="text-5xl font-black text-[#0F172A]">
              School Clinic Dashboard
            </h2>

            <p className="tracking-[0.25em] text-slate-500 font-bold mt-3">
              MEDICAL ANALYTICS OVERVIEW
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="bg-white border border-slate-100 px-5 py-4 rounded-2xl flex items-center gap-3 font-black text-slate-600 shadow hover:bg-slate-50"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>

            <div className="relative w-[330px]">
              <Search className="absolute left-5 top-5 text-slate-400" size={20} />

              <input
                className="w-full pl-14 pr-4 py-5 rounded-2xl bg-white shadow border border-slate-100 outline-none font-semibold"
                placeholder="Search student, subject, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
          <StatCard title="TOTAL STUDENTS" value={totalStudents} icon={<Users />} color="blue" />
          <StatCard title="TOTAL VISITS" value={visits.length} icon={<Activity />} color="teal" />
          <StatCard title="TODAY" value={todayVisitCount} icon={<Calendar />} color="teal" />
          <StatCard title="SENT HOME" value={sentHomeCount} icon={<AlertTriangle />} color="red" />
          <StatCard title="FEVER ALERT" value={feverAlertCount} icon={<Thermometer />} color="red" />
          <StatCard title="HIGH RISK" value={highRiskVisitCount} icon={<ShieldAlert />} color="yellow" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-[2rem] p-7 shadow-xl">
            <p className="text-xs tracking-[0.25em] text-slate-400 font-black mb-3">
              TOP SUBJECT
            </p>

            <div className="flex items-center gap-4">
              <div className="bg-yellow-50 text-yellow-500 p-4 rounded-2xl">
                <BookOpen />
              </div>

              <p className="text-3xl font-black text-slate-800">
                {getTopSubject()}
              </p>
            </div>
          </div>

          <div className="xl:col-span-2 bg-gradient-to-r from-[#0B1023] to-slate-800 rounded-[2rem] p-7 shadow-xl text-white">
            <p className="text-xs tracking-[0.25em] text-slate-300 font-black mb-3">
              CLINIC REMINDER
            </p>

            <p className="text-2xl font-black">
              Monitor fever alerts and frequent high-risk visits daily.
            </p>

            <p className="text-slate-300 font-semibold mt-2">
              Use the Reports page for complete records and PDF exports.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
          <div className="flex justify-between items-center p-8">
            <div>
              <h3 className="text-2xl font-black">Recent Medical Visits</h3>
              <p className="text-sm text-slate-400 font-bold mt-1">
                Showing latest {recentVisits.length} record(s)
              </p>
            </div>

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
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {recentVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center font-bold text-slate-400">
                    No visits found.
                  </td>
                </tr>
              ) : (
                recentVisits.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                            v.students?.is_high_risk
                              ? 'bg-red-100 text-red-500'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {v.students?.name?.charAt(0) || <UserRound size={18} />}
                        </div>

                        <div>
                          <p className="font-black text-xl flex items-center gap-2">
                            {v.students?.name || 'Unknown'}
                            {v.students?.is_high_risk && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                HIGH RISK
                              </span>
                            )}
                          </p>

                          <p className="text-xs font-black text-slate-400">
                            {formatGrade(v.students?.grade_level)} • {v.subject_at_time || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="text-sm font-bold text-slate-500">
                      <span className={Number(v.temperature || 0) >= 37.5 ? 'text-red-500' : ''}>
                        🌡 {v.temperature || '--'}°C
                      </span>
                      <br />
                      💗 {v.blood_pressure || '--'} BP
                    </td>

                    <td>
                      <span
                        className={`px-5 py-2 rounded-full text-xs font-black ${
                          v.status === 'Sent Home'
                            ? 'bg-red-100 text-red-600'
                            : v.status === 'Resting in Clinic'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-teal-50 text-teal-600 border border-teal-100'
                        }`}
                      >
                        {v.status || 'WAITING'}
                      </span>
                    </td>

                    <td className="text-sm font-bold text-slate-400">
                      {new Date(v.visit_time).toLocaleDateString()}
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
                ))
              )}
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
    yellow: 'bg-yellow-50 text-yellow-500'
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-xl flex justify-between items-center">
      <div>
        <p className="text-[10px] tracking-[0.25em] text-slate-400 font-black">
          {title}
        </p>

        <p className="text-3xl font-black mt-3">{value}</p>
      </div>

      <div className={`p-4 rounded-2xl ${colorClass[color]}`}>
        {icon}
      </div>
    </div>
  );
}