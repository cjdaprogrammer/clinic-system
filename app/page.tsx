'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, LogOut, Search,
  Clock, Activity, AlertTriangle, FileText
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------- TYPES ----------------

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

// ---------------- COMPONENT ----------------

export default function ClinicDashboard() {
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------- FETCH DATA ----------------

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*, students(name, grade_level, is_high_risk)')
      .order('visit_time', { ascending: false });

    if (visitError) {
      console.error(visitError.message);
    } else {
      setVisits((visitData as Visit[]) || []);
    }

    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    setTotalStudents(count || 0);

    setLoading(false);
  }, []);

  // ---------------- AUTH CHECK ----------------

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else fetchData();
    };

    checkUser();
  }, [router, fetchData]);

  // ---------------- REALTIME UPDATES ----------------

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

  // ---------------- HELPERS ----------------

  const formatGrade = (grade: string) =>
    !grade ? 'N/A' :
    grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;

  const sentHomeCount = visits.filter(v => v.status === 'Sent Home').length;

  const getTopSubject = () => {
    const counts: Record<string, number> = {};

    visits.forEach(v => {
      const s = v.subject_at_time || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
      '---'
    );
  };

  const filteredVisits = visits.filter(v => {
    const name = v.students?.name?.toLowerCase() || '';
    const subject = v.subject_at_time?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();

    return name.includes(q) || subject.includes(q);
  });

  // ---------------- PDF REPORT ----------------

  const generateStudentReport = (studentId: string, studentName: string) => {
    const doc = new jsPDF();

    const history = visits.filter(v => v.student_id === studentId);

    doc.setFontSize(18);
    doc.text("QNHS CLINIC REPORT", 105, 20, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: history.map(v => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time,
        v.reason,
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Returned'
      ]),
    });

    doc.save(`${studentName.replace(/\s+/g, '_')}_report.pdf`);
  };

  // ---------------- LOADING ----------------

  if (loading) {
    return <div className="p-10 font-bold">Loading Dashboard...</div>;
  }

  // ---------------- UI ----------------

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 font-bold">
          <Activity /> QNHS Clinic
        </div>

        <button onClick={() => router.push('/')} className="flex gap-2 items-center">
          <LayoutDashboard size={18} /> Dashboard
        </button>

        <button onClick={() => router.push('/students')} className="flex gap-2 items-center">
          <Users size={18} /> Students
        </button>

        <button onClick={() => router.push('/reports')} className="flex gap-2 items-center">
          <FileText size={18} /> Reports
        </button>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="text-red-400 mt-auto"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6">

        {/* HEADER STATS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">Total Students</p>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">Sent Home</p>
            <p className="text-2xl font-bold text-red-500">{sentHomeCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">Top Subject</p>
            <p className="text-lg font-bold">{getTopSubject()}</p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-4 flex gap-2 items-center">
          <Search size={18} />
          <input
            className="border p-2 rounded w-full"
            placeholder="Search student or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-sm">
              <tr>
                <th className="p-3">Student</th>
                <th>Subject</th>
                <th>Reason</th>
                <th>Vitals</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredVisits.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-3 font-bold">
                    {v.students?.name}
                    <p className="text-xs text-gray-500">
                      {formatGrade(v.students?.grade_level || '')}
                    </p>
                  </td>

                  <td>{v.subject_at_time}</td>
                  <td>{v.reason}</td>

                  <td className="text-sm">
                    {v.temperature || '--'}°C / {v.blood_pressure || '--'} BP
                  </td>

                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {v.status}
                    </span>
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