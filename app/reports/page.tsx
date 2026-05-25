'use client'

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, 
  Activity, Printer, RefreshCcw, FileText, 
  Search, TrendingUp, BarChart3,
  AlertTriangle, Calendar, Clock,
  Pill, Droplets, Scale, HeartPulse
} from 'lucide-react'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, 
  ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';

// --- TYPES ---
interface Visit {
  id: string;
  visit_time: string;
  reason: string;
  status: string;
  subject_at_time: string;

  // NEW FIELDS
  temperature?: string;
  blood_pressure?: string;
  oxygen_saturation?: string;
  weight?: string;
  medicine_given?: string;
  herbal_given?: string;
  other_intervention?: string;

  students: {
    name: string;
    grade_level: string;
    strand?: string;
    section?: string;
  }
}

export default function ReportsPage() {
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER STATES ---
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else {
        fetchAllData();
      }
    };

    checkUser();
  }, [router]);

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
      .order('visit_time', { ascending: false });

    setVisits(data || []);
    setLoading(false);
  }

  // RESET FILTERS
  const resetFilters = () => {
    setFilterSubject('All');
    setFilterStatus('All');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterSearch('');
  };

  // SUBJECT ANALYTICS
  const subjectAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    visits.forEach(v => {
      const sub = v.subject_at_time || 'General';
      counts[sub] = (counts[sub] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [visits]);

  // REASON ANALYTICS
  const reasonAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    visits.forEach(v => {
      const reason = v.reason?.trim() || 'Unspecified';
      counts[reason] = (counts[reason] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [visits]);

  // FILTERED DATA
  const filteredData = useMemo(() => {
    return visits.filter((v) => {

      const vDate = new Date(v.visit_time);
      vDate.setHours(0, 0, 0, 0);

      const matchSubject =
        filterSubject === 'All' ||
        v.subject_at_time === filterSubject;

      const matchStatus =
        filterStatus === 'All' ||
        v.status === filterStatus;

      const matchSearch =
        filterSearch === '' ||
        v.students?.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        v.reason?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        v.students?.strand?.toLowerCase().includes(filterSearch.toLowerCase());

      let matchDateRange = true;

      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0,0,0,0);

        if (vDate < start) {
          matchDateRange = false;
        }
      }

      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(0,0,0,0);

        if (vDate > end) {
          matchDateRange = false;
        }
      }

      return (
        matchSubject &&
        matchStatus &&
        matchSearch &&
        matchDateRange
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

  // PDF EXPORT
  const exportFormalPDF = (orientation: 'p' | 'l' = 'l') => {

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);

    doc.text(
      "QUEZON NATIONAL HIGH SCHOOL",
      pageWidth / 2,
      15,
      { align: 'center' }
    );

    doc.setFontSize(10);

    doc.text(
      "SCHOOL HEALTH AND CLINIC SERVICES - OFFICIAL LOG",
      pageWidth / 2,
      21,
      { align: 'center' }
    );

    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(0.5);

    doc.line(15, 25, pageWidth - 15, 25);

    doc.setFontSize(8);
    doc.setTextColor(100);

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth - 15,
      31,
      { align: 'right' }
    );

    autoTable(doc, {
      startY: 35,

      head: [[
        'Date/Time',
        'Student',
        'Grade',
        'Subject',
        'Vitals',
        'Medicine',
        'Intervention',
        'Reason',
        'Status'
      ]],

      body: filteredData.map(v => [

        new Date(v.visit_time).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),

        v.students?.name?.toUpperCase(),

        v.students?.strand
          ? `G${v.students?.grade_level}-${v.students?.strand}`
          : `G${v.students?.grade_level}`,

        v.subject_at_time,

        `
T:${v.temperature || '--'}°C
BP:${v.blood_pressure || '--'}
SpO2:${v.oxygen_saturation || '--'}%
W:${v.weight || '--'}kg
        `,

        v.medicine_given || 'None',

        `
Herbal: ${v.herbal_given || 'None'}
Other: ${v.other_intervention || 'None'}
        `,

        v.reason,

        v.status
      ]),

      headStyles: {
        fillColor: [15, 23, 42],
        fontSize: 8,
        halign: 'center'
      },

      bodyStyles: {
        fontSize: 7
      },

      alternateRowStyles: {
        fillColor: [250, 250, 250]
      }
    });

    doc.save(
      `QNHS_Clinic_Log_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  // FREQUENT VISITORS
  const frequentVisitors = useMemo(() => {

    const counts: Record<string, number> = {};

    visits.forEach(v => {
      if (v.students?.name) {
        counts[v.students.name] =
          (counts[v.students.name] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .filter(name => counts[name] >= 3);

  }, [visits]);

  // SUBJECTS
  const uniqueSubjects = useMemo(() => {

    const subjects = visits
      .map(v => v.subject_at_time)
      .filter(Boolean);

    return Array.from(new Set(subjects)).sort();

  }, [visits]);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans tracking-tight">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl z-30">

        <div className="flex items-center gap-3">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg">
            <Activity size={24} />
          </div>

          <h1 className="text-xl font-black uppercase tracking-tighter">
            QNHS Clinic
          </h1>
        </div>

        <nav className="flex-1 space-y-2 font-bold text-sm">

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

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl shadow-teal-500/10 font-bold transition-all">
            <FileText size={20} />
            Reports
          </button>
        </nav>

        <button
          onClick={() =>
            supabase.auth.signOut().then(() => router.push('/login'))
          }
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">

        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">

          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
              Clinical Intelligence
            </h2>

            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
              Formal Documentation Portal
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={() => exportFormalPDF('p')}
              className="bg-white border border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
            >
              <FileText size={16} />
              Portrait PDF
            </button>

            <button
              onClick={() => exportFormalPDF('l')}
              className="bg-[#0F172A] text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest"
            >
              <Printer size={18} className="text-teal-400" />
              Landscape PDF
            </button>
          </div>
        </header>

        {/* SUMMARY */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white mb-10 flex flex-wrap items-center justify-between gap-8">

          <div className="flex items-center gap-5">
            <div className="bg-teal-50 p-5 rounded-[1.5rem] text-teal-600">
              <TrendingUp size={30}/>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Logs Selected
              </p>

              <p className="text-4xl font-black text-slate-800 tracking-tight">
                {filteredData.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="bg-red-50 p-5 rounded-[1.5rem] text-red-500">
              <AlertTriangle size={30}/>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Sent Home Rate
              </p>

              <p className="text-4xl font-black text-red-600">
                {
                  filteredData.length > 0
                    ? Math.round(
                        (
                          filteredData.filter(
                            v => v.status === 'Sent Home'
                          ).length / filteredData.length
                        ) * 100
                      )
                    : 0
                }%
              </p>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-[4rem] shadow-2xl border border-white overflow-hidden mb-20">

          <table className="w-full text-left">

            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.3em] border-b border-slate-100">

              <tr>
                <th className="px-8 py-8">Patient</th>
                <th className="px-6 py-8 text-center">Vitals</th>
                <th className="px-6 py-8 text-center">Medicine</th>
                <th className="px-6 py-8 text-center">Intervention</th>
                <th className="px-6 py-8 text-center">Outcome</th>
                <th className="px-8 py-8 text-right">Observation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">

              {filteredData.map((v) => (

                <tr
                  key={v.id}
                  className="group hover:bg-slate-50/50 transition-all duration-300"
                >

                  {/* PATIENT */}
                  <td className="px-8 py-8">

                    <div className="flex items-center gap-5">

                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                        v.status === 'Sent Home'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-teal-50 text-teal-600'
                      }`}>
                        {v.students?.name.charAt(0)}
                      </div>

                      <div>

                        <p className="font-black text-slate-800 text-xl tracking-tighter flex items-center gap-2">
                          {v.students?.name}

                          {frequentVisitors.includes(v.students?.name) && (
                            <span className="bg-amber-100 text-amber-600 p-1 rounded-full animate-pulse">
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </p>

                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                          {v.students?.strand
                            ? `${v.students?.strand} • `
                            : ''
                          }
                          G{v.students?.grade_level}
                          {' • '}
                          {v.students?.section}
                        </p>

                      </div>
                    </div>
                  </td>

                  {/* VITALS */}
                  <td className="px-6 py-8 text-center">

                    <div className="space-y-2 text-[11px] font-black">

                      <div className="flex items-center justify-center gap-1 text-red-500">
                        <HeartPulse size={13} />
                        {v.temperature || '--'}°C
                      </div>

                      <div className="text-slate-500">
                        BP: {v.blood_pressure || '--'}
                      </div>

                      <div className="flex items-center justify-center gap-1 text-blue-500">
                        <Droplets size={13} />
                        {v.oxygen_saturation || '--'}%
                      </div>

                      <div className="flex items-center justify-center gap-1 text-slate-500">
                        <Scale size={13} />
                        {v.weight || '--'}kg
                      </div>

                    </div>
                  </td>

                  {/* MEDICINE */}
                  <td className="px-6 py-8 text-center">

                    <div className="flex flex-col items-center gap-2">

                      <div className="flex items-center gap-1 text-emerald-600 font-black text-xs">
                        <Pill size={14} />
                        {v.medicine_given || 'None'}
                      </div>

                      <p className="text-[10px] text-green-500 font-bold">
                        Herbal: {v.herbal_given || 'None'}
                      </p>

                    </div>
                  </td>

                  {/* INTERVENTION */}
                  <td className="px-6 py-8 text-center">

                    <p className="text-xs font-bold text-slate-600 max-w-[150px] mx-auto">
                      {v.other_intervention || 'None'}
                    </p>

                  </td>

                  {/* STATUS */}
                  <td className="px-6 py-8 text-center">

                    <span className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                      v.status === 'Sent Home'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : v.status === 'Resting in Clinic'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-teal-50 text-teal-600 border-teal-100'
                    }`}>
                      {v.status}
                    </span>

                  </td>

                  {/* OBSERVATION */}
                  <td className="px-8 py-8 text-right">

                    <p className="text-slate-500 font-bold italic text-sm leading-relaxed max-w-xs ml-auto">
                      "{v.reason}"
                    </p>

                    <p className="text-[9px] text-slate-300 uppercase mt-1">
                      {v.subject_at_time}
                      {' • '}
                      {new Date(v.visit_time).toLocaleDateString()}
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