'use client'

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
  UserSquare2
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

// =====================
// TYPES
// =====================
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
  herbal_given?: string;
  other_intervention?: string;

  // EMPLOYEE
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

  // =====================
  // AUTH
  // =====================
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

  // =====================
  // FETCH
  // =====================
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

  // =====================
  // ANALYTICS
  // =====================

  // MOST SUBJECTS
  const subjectAnalytics = useMemo(() => {

    const counts: Record<string, number> = {};

    visits.forEach(v => {

      const subject =
        v.subject_at_time || 'Unknown';

      counts[subject] =
        (counts[subject] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

  }, [visits]);

  // MOST REASONS
  const reasonAnalytics = useMemo(() => {

    const counts: Record<string, number> = {};

    visits.forEach(v => {

      const reason =
        v.reason || 'Unknown';

      counts[reason] =
        (counts[reason] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

  }, [visits]);

  // STUDENTS ONLY
  const studentVisits = useMemo(() => {

    return visits.filter(
      v => v.visitor_type !== 'Employee'
    );

  }, [visits]);

  // EMPLOYEES ONLY
  const employeeVisits = useMemo(() => {

    return visits.filter(
      v => v.visitor_type === 'Employee'
    );

  }, [visits]);

  // =====================
  // PDF EXPORT
  // =====================
  const exportFormalPDF = () => {

    const doc = new jsPDF({
      orientation: 'landscape'
    });

    doc.setFontSize(18);

    doc.text(
      'QNHS CLINIC REPORT',
      14,
      20
    );

    autoTable(doc, {

      startY: 30,

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

      body: visits.map(v => [

        v.visitor_type === 'Employee'
          ? v.full_name
          : v.students?.name,

        v.visitor_type === 'Employee'
          ? v.employee_type
          : 'Student',

        v.subject_at_time || 'N/A',

        v.reason,

        `
T:${v.temperature || '--'}
BP:${v.blood_pressure || '--'}
SpO2:${v.oxygen_saturation || '--'}
        `,

        v.medicine_given || 'None',

        v.status,

        new Date(v.visit_time)
          .toLocaleString()
      ])
    });

    doc.save(
      `QNHS_Clinic_Report.pdf`
    );
  };

  // =====================
  // LOADING
  // =====================
  if (loading) {

    return (
      <div className="p-10 font-black">
        Loading Reports...
      </div>
    );
  }

  // =====================
  // UI
  // =====================
  return (

    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky top-0 h-screen">

        <div className="flex items-center gap-3">

          <div className="bg-[#14B8A6] p-2 rounded-xl">
            <Activity size={24} />
          </div>

          <h1 className="font-black text-xl">
            QNHS Clinic
          </h1>
        </div>

        <nav className="flex-1 space-y-2">

          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-300"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            onClick={() => router.push('/logvisit')}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-300"
          >
            <PlusCircle size={20} />
            Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800 text-slate-300"
          >
            <Users size={20} />
            Students
          </button>

          <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#14B8A6] text-white">
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
          className="flex items-center gap-3 text-red-400 font-bold"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">

          <div>

            <h1 className="text-5xl font-black">
              Clinical Intelligence
            </h1>

            <p className="text-slate-400 font-bold uppercase text-xs mt-2">
              Reports & Analytics
            </p>
          </div>

          <button
            onClick={exportFormalPDF}
            className="bg-[#0F172A] text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-black"
          >
            <Printer size={18} />
            Export PDF
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white rounded-3xl p-6 shadow-xl">

            <div className="flex items-center gap-4">

              <div className="bg-teal-50 text-teal-600 p-4 rounded-2xl">
                <TrendingUp size={28} />
              </div>

              <div>

                <p className="text-xs uppercase text-slate-400 font-black">
                  Total Logs
                </p>

                <h2 className="text-4xl font-black">
                  {visits.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">

            <div className="flex items-center gap-4">

              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                <UserSquare2 size={28} />
              </div>

              <div>

                <p className="text-xs uppercase text-slate-400 font-black">
                  Student Logs
                </p>

                <h2 className="text-4xl font-black">
                  {studentVisits.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">

            <div className="flex items-center gap-4">

              <div className="bg-purple-50 text-purple-600 p-4 rounded-2xl">
                <Briefcase size={28} />
              </div>

              <div>

                <p className="text-xs uppercase text-slate-400 font-black">
                  Employee Logs
                </p>

                <h2 className="text-4xl font-black">
                  {employeeVisits.length}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">

          {/* SUBJECT ANALYTICS */}
          <div className="bg-white rounded-[2rem] p-8 shadow-xl">

            <h2 className="text-2xl font-black mb-6">
              Most Subjects
            </h2>

            <div className="h-80">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={subjectAnalytics}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar dataKey="value" radius={[10,10,0,0]} />

                </BarChart>

              </ResponsiveContainer>
            </div>
          </div>

          {/* REASON ANALYTICS */}
          <div className="bg-white rounded-[2rem] p-8 shadow-xl">

            <h2 className="text-2xl font-black mb-6">
              Most Reasons for Clinic Visits
            </h2>

            <div className="h-80">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={reasonAnalytics}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar dataKey="value" radius={[10,10,0,0]} />

                </BarChart>

              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* STUDENT TABLE */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden mb-16">

          <div className="px-10 py-8 border-b">

            <h2 className="text-3xl font-black">
              Student Records
            </h2>
          </div>

          <table className="w-full">

            <thead className="bg-slate-50">

              <tr>

                <th className="px-8 py-6 text-left">
                  Student
                </th>

                <th className="px-6 py-6 text-center">
                  Vitals
                </th>

                <th className="px-6 py-6 text-center">
                  Medicine
                </th>

                <th className="px-6 py-6 text-center">
                  Status
                </th>

                <th className="px-8 py-6 text-right">
                  Observation
                </th>

              </tr>
            </thead>

            <tbody>

              {studentVisits.map((v) => (

                <tr
                  key={v.id}
                  className="border-t hover:bg-slate-50"
                >

                  <td className="px-8 py-6">

                    <p className="font-black text-lg">
                      {v.students?.name}
                    </p>

                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Grade {v.students?.grade_level}
                    </p>
                  </td>

                  <td className="px-6 py-6 text-center text-sm font-bold">

                    <div>{v.temperature || '--'}°C</div>

                    <div>
                      BP: {v.blood_pressure || '--'}
                    </div>

                    <div>
                      SpO2: {v.oxygen_saturation || '--'}%
                    </div>

                    <div>
                      {v.weight || '--'}kg
                    </div>
                  </td>

                  <td className="px-6 py-6 text-center">

                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">

                      <Pill size={14} />

                      {v.medicine_given || 'None'}
                    </div>
                  </td>

                  <td className="px-6 py-6 text-center">

                    <span className={`px-4 py-2 rounded-xl text-xs font-black ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-teal-100 text-teal-600'
                    }`}>
                      {v.status}
                    </span>
                  </td>

                  <td className="px-8 py-6 text-right">

                    <p className="italic text-slate-500">
                      "{v.reason}"
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      {v.subject_at_time}
                    </p>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPLOYEE TABLE */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">

          <div className="px-10 py-8 border-b">

            <h2 className="text-3xl font-black">
              Employee Records
            </h2>
          </div>

          <table className="w-full">

            <thead className="bg-slate-50">

              <tr>

                <th className="px-8 py-6 text-left">
                  Employee
                </th>

                <th className="px-6 py-6 text-center">
                  Employee Type
                </th>

                <th className="px-6 py-6 text-center">
                  Vitals
                </th>

                <th className="px-6 py-6 text-center">
                  Medicine
                </th>

                <th className="px-6 py-6 text-center">
                  Status
                </th>

                <th className="px-8 py-6 text-right">
                  Observation
                </th>

              </tr>
            </thead>

            <tbody>

              {employeeVisits.map((v) => (

                <tr
                  key={v.id}
                  className="border-t hover:bg-slate-50"
                >

                  <td className="px-8 py-6">

                    <p className="font-black text-lg">
                      {v.full_name}
                    </p>

                    <p className="text-xs text-slate-400 uppercase font-bold">
                      Employee
                    </p>
                  </td>

                  <td className="px-6 py-6 text-center font-bold">

                    {v.employee_type || 'Staff'}

                  </td>

                  <td className="px-6 py-6 text-center text-sm font-bold">

                    <div>{v.temperature || '--'}°C</div>

                    <div>
                      BP: {v.blood_pressure || '--'}
                    </div>

                    <div>
                      SpO2: {v.oxygen_saturation || '--'}%
                    </div>

                    <div>
                      {v.weight || '--'}kg
                    </div>
                  </td>

                  <td className="px-6 py-6 text-center">

                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">

                      <Pill size={14} />

                      {v.medicine_given || 'None'}
                    </div>
                  </td>

                  <td className="px-6 py-6 text-center">

                    <span className={`px-4 py-2 rounded-xl text-xs font-black ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-teal-100 text-teal-600'
                    }`}>
                      {v.status}
                    </span>
                  </td>

                  <td className="px-8 py-6 text-right">

                    <p className="italic text-slate-500">
                      "{v.reason}"
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(v.visit_time)
                        .toLocaleDateString()}
                    </p>
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