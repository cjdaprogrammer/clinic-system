'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard,
  PlusCircle,
  Users,
  LogOut,
  Activity,
  Printer,
  FileText,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  Search,
  RefreshCcw,
  BarChart3,
  Filter,
  UserSquare2,
  Briefcase
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

// =========================
// TYPES
// =========================
interface Visit {
  id: string;
  visit_time: string;
  reason: string;
  status: string;
  subject_at_time: string;

  temperature?: string;
  blood_pressure?: string;
  oxygen_saturation?: string;
  weight?: string;
  medicine_given?: string;

  visitor_type?: string;
  full_name?: string;
  employee_type?: string;

  students?: {
    name: string;
    grade_level: string;
    strand?: string;
    section?: string;
  };
}

export default function ReportsPage() {
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // =========================
  // AUTH
  // =========================
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else {
        fetchAllData();
      }
    };

    checkUser();
  }, [router]);

  // =========================
  // FETCH
  // =========================
  async function fetchAllData() {
    setLoading(true);

    const { data } = await supabase
      .from('visits')
      .select(`
        *,
        students(
          name,
          grade_level,
          strand,
          section
        )
      `)
      .order('visit_time', {
        ascending: false
      });

    setVisits((data as Visit[]) || []);

    setLoading(false);
  }

  // =========================
  // RESET FILTERS
  // =========================
  const resetFilters = () => {
    setFilterSubject('All');
    setFilterStatus('All');
    setFilterSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // =========================
  // ANALYTICS
  // =========================
  const subjectAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    visits.forEach((v) => {
      const sub = v.subject_at_time || 'General';

      counts[sub] = (counts[sub] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visits]);

  const reasonAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    visits.forEach((v) => {
      const reason = v.reason || 'Unspecified';

      counts[reason] = (counts[reason] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visits]);

  // =========================
  // FILTERS
  // =========================
  const filteredData = useMemo(() => {
    return visits.filter((v) => {
      const matchSubject =
        filterSubject === 'All' ||
        v.subject_at_time === filterSubject;

      const matchStatus =
        filterStatus === 'All' ||
        v.status === filterStatus;

      const matchSearch =
        filterSearch === '' ||
        v.students?.name
          ?.toLowerCase()
          .includes(filterSearch.toLowerCase()) ||
        v.reason
          ?.toLowerCase()
          .includes(filterSearch.toLowerCase());

      let matchDate = true;

      if (filterStartDate) {
        matchDate =
          new Date(v.visit_time) >=
          new Date(filterStartDate);
      }

      if (filterEndDate) {
        matchDate =
          matchDate &&
          new Date(v.visit_time) <=
            new Date(filterEndDate);
      }

      return (
        matchSubject &&
        matchStatus &&
        matchSearch &&
        matchDate
      );
    });
  }, [
    visits,
    filterSubject,
    filterStatus,
    filterSearch,
    filterStartDate,
    filterEndDate
  ]);

  // =========================
  // COUNTS
  // =========================
  const studentVisits = filteredData.filter(
    (v) => v.visitor_type !== 'Employee'
  );

  const employeeVisits = filteredData.filter(
    (v) => v.visitor_type === 'Employee'
  );

  const sentHomeCount = filteredData.filter(
    (v) => v.status === 'Sent Home'
  ).length;

  // =========================
  // PDF EXPORT
  // =========================
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape'
    });

    doc.setFontSize(20);

    doc.text(
      'QNHS CLINIC HEALTH REPORT',
      14,
      20
    );

    doc.setFontSize(10);

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 35,

      head: [[
        'Student',
        'Grade',
        'Section',
        'Subject',
        'Reason',
        'Status',
        'Date'
      ]],

      body: filteredData.map((v) => [
        v.students?.name || 'N/A',
        v.students?.grade_level || 'N/A',
        v.students?.section || 'N/A',
        v.subject_at_time || 'N/A',
        v.reason || 'N/A',
        v.status || 'N/A',
        new Date(v.visit_time).toLocaleString()
      ])
    });

    doc.save('QNHS_Clinic_Report.pdf');
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl font-black text-slate-700 animate-pulse">
          Loading Reports...
        </div>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">

        <div className="flex items-center gap-3">
          <div className="bg-[#14B8A6] p-3 rounded-2xl">
            <Activity size={24} />
          </div>

          <h1 className="text-xl font-black uppercase tracking-tighter">
            QNHS Clinic
          </h1>
        </div>

        <nav className="flex-1 space-y-2">

          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            onClick={() => router.push('/logvisit')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
          >
            <PlusCircle size={20} />
            Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
          >
            <Users size={20} />
            Students
          </button>

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl">
            <FileText size={20} />
            Reports
          </button>

        </nav>

        <button
          onClick={() =>
            supabase.auth
              .signOut()
              .then(() => router.push('/login'))
          }
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>

      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">

          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-800">
              Clinic Reports
            </h1>

            <p className="uppercase text-xs tracking-[0.3em] text-slate-400 font-black mt-3">
              Health Monitoring System
            </p>
          </div>

          <button
            onClick={exportPDF}
            className="bg-[#0F172A] text-white px-7 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-slate-800 transition-all"
          >
            <Printer size={18} />
            Export PDF
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6 mb-10 flex flex-wrap items-center gap-5 border border-slate-100">

          <div className="flex items-center gap-3">
            <Filter size={18} className="text-teal-600" />

            <p className="font-black text-sm text-slate-500 uppercase">
              Filters
            </p>
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={filterSearch}
            onChange={(e) =>
              setFilterSearch(e.target.value)
            }
            className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
          />

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
          >
            <option value="All">All Status</option>
            <option value="Waiting">Waiting</option>
            <option value="Returned to Class">
              Returned to Class
            </option>
            <option value="Sent Home">
              Sent Home
            </option>
          </select>

          <button
            onClick={resetFilters}
            className="bg-red-500 text-white px-5 py-3 rounded-2xl font-bold"
          >
            <RefreshCcw size={16} />
          </button>

        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <p className="uppercase text-xs font-black text-slate-400 mb-2">
              Total Visits
            </p>

            <h2 className="text-5xl font-black text-slate-800">
              {filteredData.length}
            </h2>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <p className="uppercase text-xs font-black text-slate-400 mb-2">
              Student Visits
            </p>

            <h2 className="text-5xl font-black text-blue-600">
              {studentVisits.length}
            </h2>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <p className="uppercase text-xs font-black text-slate-400 mb-2">
              Employee Visits
            </p>

            <h2 className="text-5xl font-black text-purple-600">
              {employeeVisits.length}
            </h2>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <p className="uppercase text-xs font-black text-slate-400 mb-2">
              Sent Home
            </p>

            <h2 className="text-5xl font-black text-red-500">
              {sentHomeCount}
            </h2>
          </div>

        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">

          <div className="bg-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-lg font-black mb-6">
              Visits per Subject
            </h3>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />

                  <Bar
                    dataKey="value"
                    fill="#14B8A6"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-lg font-black mb-6">
              Common Reasons
            </h3>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />

                  <Bar
                    dataKey="value"
                    fill="#F97316"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">

          <table className="w-full text-left">

            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-black">
              <tr>
                <th className="px-8 py-6">Student</th>
                <th className="px-8 py-6">Grade</th>
                <th className="px-8 py-6">Section</th>
                <th className="px-8 py-6">Subject</th>
                <th className="px-8 py-6">Reason</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredData.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-slate-50 transition-all"
                >
                  <td className="px-8 py-6 font-bold">
                    {v.students?.name}
                  </td>

                  <td className="px-8 py-6">
                    {v.students?.grade_level}
                  </td>

                  <td className="px-8 py-6">
                    {v.students?.section}
                  </td>

                  <td className="px-8 py-6">
                    {v.subject_at_time}
                  </td>

                  <td className="px-8 py-6">
                    {v.reason}
                  </td>

                  <td className="px-8 py-6">
                    <span
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                        v.status === 'Sent Home'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-teal-100 text-teal-600'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>

                  <td className="px-8 py-6">
                    {new Date(
                      v.visit_time
                    ).toLocaleDateString()}
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
