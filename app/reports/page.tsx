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
  Pill,
  Droplets,
  Scale,
  HeartPulse,
  Briefcase,
  UserSquare2,
  CalendarDays,
  Clock3,
  Filter,
  Stethoscope,
  ClipboardList
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
  Tooltip
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

  const [visitorFilter, setVisitorFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All');

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

    setVisits((data as any) || []);

    setLoading(false);
  }

  // =========================
  // FILTERS
  // =========================
  const filteredVisits = useMemo(() => {
    let data = [...visits];

    // VISITOR FILTER
    if (visitorFilter === 'Students') {
      data = data.filter(
        (v) => v.visitor_type !== 'Employee'
      );
    }

    if (visitorFilter === 'Employees') {
      data = data.filter(
        (v) => v.visitor_type === 'Employee'
      );
    }

    // TIME FILTER
    const now = new Date();

    if (timeFilter === 'Today') {
      data = data.filter((v) => {
        const d = new Date(v.visit_time);

        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }

    if (timeFilter === 'This Week') {
      data = data.filter((v) => {
        const d = new Date(v.visit_time);

        const diff =
          (now.getTime() - d.getTime()) /
          (1000 * 60 * 60 * 24);

        return diff <= 7;
      });
    }

    if (timeFilter === 'This Month') {
      data = data.filter((v) => {
        const d = new Date(v.visit_time);

        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }

    return data;
  }, [visits, visitorFilter, timeFilter]);

  // =========================
  // ANALYTICS
  // =========================
  const subjectAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredVisits.forEach((v) => {
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
  }, [filteredVisits]);

  const reasonAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredVisits.forEach((v) => {
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
  }, [filteredVisits]);

  // =========================
  // COUNTS
  // =========================
  const studentVisits = filteredVisits.filter(
    (v) => v.visitor_type !== 'Employee'
  );

  const employeeVisits = filteredVisits.filter(
    (v) => v.visitor_type === 'Employee'
  );

  const sentHomeCount = filteredVisits.filter(
    (v) => v.status === 'Sent Home'
  ).length;

  // =========================
  // PDF
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
        'Visitor',
        'Type',
        'Subject',
        'Reason',
        'Vitals',
        'Medicine',
        'Status',
        'Date'
      ]],

      body: filteredVisits.map((v) => [
        v.visitor_type === 'Employee'
          ? v.full_name
          : v.students?.name,

        v.visitor_type === 'Employee'
          ? v.employee_type
          : 'Student',

        v.subject_at_time || 'N/A',

        v.reason,

        `
Temp: ${v.temperature || '--'}
BP: ${v.blood_pressure || '--'}
SpO2: ${v.oxygen_saturation || '--'}
Weight: ${v.weight || '--'}
        `,

        v.medicine_given || 'None',

        v.status,

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
          Loading Clinical Reports...
        </div>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans tracking-tight">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0B1533] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">

        {/* LOGO */}
        <div className="flex items-center gap-3 px-2">

          <div className="bg-[#14B8A6] p-3 rounded-2xl shadow-lg shadow-teal-500/20">
            <Activity size={24} />
          </div>

          <h1 className="text-xl font-black tracking-tighter uppercase">
            QNHS Clinic
          </h1>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-2 text-white font-bold">

          <button
            onClick={() => router.push('/')}
            className="
              flex items-center gap-3 w-full p-3.5
              text-slate-400 hover:text-white
              hover:bg-slate-800 rounded-2xl
              transition-all font-semibold
            "
          >
            <LayoutDashboard size={20} />

            <span className="text-[1.02rem]">
              Dashboard
            </span>
          </button>

          <button
            onClick={() => router.push('/logvisit')}
            className="
              flex items-center gap-3 w-full p-3.5
              text-slate-400 hover:text-white
              hover:bg-slate-800 rounded-2xl
              transition-all font-semibold
            "
          >
            <PlusCircle size={20} />

            <span className="text-[1.02rem]">
              Log Visit
            </span>
          </button>

          <button
            onClick={() => router.push('/students')}
            className="
              flex items-center gap-3 w-full p-3.5
              text-slate-400 hover:text-white
              hover:bg-slate-800 rounded-2xl
              transition-all font-semibold
            "
          >
            <Users size={20} />

            <span className="text-[1.02rem]">
              Students
            </span>
          </button>

          <button
            className="
              flex items-center gap-3 w-full p-3.5
              bg-[#14B8A6] text-white
              rounded-2xl shadow-xl
              shadow-teal-500/10
              font-bold transition-all
            "
          >
            <FileText size={20} />

            <span className="text-[1.02rem]">
              Reports
            </span>
          </button>
        </nav>

        {/* SIGN OUT */}
        <button
          onClick={() =>
            supabase.auth
              .signOut()
              .then(() => router.push('/login'))
          }
          className="
            flex items-center gap-3 p-4
            text-red-400 hover:bg-red-500/10
            rounded-2xl font-bold
            transition-all group
          "
        >
          <LogOut
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />

          <span className="text-[1.02rem]">
            Sign Out
          </span>
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">

          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-800">
              Clinic Analytics & Reports
            </h1>

            <p className="uppercase text-xs tracking-[0.3em] text-slate-400 font-black mt-3">
              Health Monitoring & Patient Intelligence
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

          <select
            value={visitorFilter}
            onChange={(e) =>
              setVisitorFilter(e.target.value)
            }
            className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
          >
            <option>All</option>
            <option>Students</option>
            <option>Employees</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) =>
              setTimeFilter(e.target.value)
            }
            className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
          >
            <option>All</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between">

              <div>
                <p className="uppercase text-xs font-black text-slate-400 mb-2">
                  Total Visits
                </p>

                <h2 className="text-5xl font-black text-slate-800">
                  {filteredVisits.length}
                </h2>
              </div>

              <div className="bg-teal-50 p-4 rounded-2xl text-teal-600">
                <TrendingUp size={30} />
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between">

              <div>
                <p className="uppercase text-xs font-black text-slate-400 mb-2">
                  Student Visits
                </p>

                <h2 className="text-5xl font-black text-blue-600">
                  {studentVisits.length}
                </h2>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                <UserSquare2 size={30} />
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between">

              <div>
                <p className="uppercase text-xs font-black text-slate-400 mb-2">
                  Employee Visits
                </p>

                <h2 className="text-5xl font-black text-purple-600">
                  {employeeVisits.length}
                </h2>
              </div>

              <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                <Briefcase size={30} />
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] shadow-xl">
            <div className="flex items-center justify-between">

              <div>
                <p className="uppercase text-xs font-black text-slate-400 mb-2">
                  Sent Home
                </p>

                <h2 className="text-5xl font-black text-red-500">
                  {sentHomeCount}
                </h2>
              </div>

              <div className="bg-red-50 p-4 rounded-2xl text-red-500">
                <AlertTriangle size={30} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}