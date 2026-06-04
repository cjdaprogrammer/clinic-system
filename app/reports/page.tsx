'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCcw,
  Filter,
  Search,
  AlertTriangle,
  UserSquare2,
  Briefcase,
  Calendar,
  BookOpen
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
  const [filterVisitorType, setFilterVisitorType] = useState('All');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchAllData = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
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

      if (error) {
        console.warn('Reports fetch warning:', error.message);
        setVisits([]);
        return;
      }

      setVisits((data as Visit[]) || []);
    } catch (err) {
      console.warn('Reports fetch failed:', err);
      setVisits([]);
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

        await fetchAllData();
      } catch (err) {
        console.warn('Auth check failed:', err);
        router.push('/login');
        setLoading(false);
      }
    };

    checkUser();
  }, [router, fetchAllData]);

  const resetFilters = () => {
    setFilterSubject('All');
    setFilterStatus('All');
    setFilterVisitorType('All');
    setFilterSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const subjectOptions = useMemo(() => {
    const subjects = visits
      .map((v) => v.subject_at_time)
      .filter(Boolean);

    return ['All', ...Array.from(new Set(subjects))];
  }, [visits]);

  const filteredData = useMemo(() => {
    return visits.filter((v) => {
      const patientName =
        v.visitor_type === 'Employee'
          ? v.full_name || ''
          : v.students?.name || '';

      const matchSubject =
        filterSubject === 'All' ||
        v.subject_at_time === filterSubject;

      const matchStatus =
        filterStatus === 'All' ||
        v.status === filterStatus;

      const matchVisitorType =
        filterVisitorType === 'All' ||
        v.visitor_type === filterVisitorType;

      const q = filterSearch.toLowerCase();

      const matchSearch =
        q === '' ||
        patientName.toLowerCase().includes(q) ||
        v.reason?.toLowerCase().includes(q) ||
        v.subject_at_time?.toLowerCase().includes(q) ||
        v.status?.toLowerCase().includes(q);

      let matchDate = true;

      if (filterStartDate) {
        matchDate =
          new Date(v.visit_time) >= new Date(filterStartDate);
      }

      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);

        matchDate =
          matchDate && new Date(v.visit_time) <= end;
      }

      return (
        matchSubject &&
        matchStatus &&
        matchVisitorType &&
        matchSearch &&
        matchDate
      );
    });
  }, [
    visits,
    filterSubject,
    filterStatus,
    filterVisitorType,
    filterSearch,
    filterStartDate,
    filterEndDate
  ]);

  const studentVisits = filteredData.filter(
    (v) => v.visitor_type !== 'Employee'
  );

  const employeeVisits = filteredData.filter(
    (v) => v.visitor_type === 'Employee'
  );

  const sentHomeCount = filteredData.filter(
    (v) => v.status === 'Sent Home'
  ).length;

  const todayVisits = filteredData.filter((v) => {
    const today = new Date().toDateString();
    return new Date(v.visit_time).toDateString() === today;
  }).length;

  const subjectAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredData.forEach((v) => {
      const subject = v.subject_at_time || 'General';
      counts[subject] = (counts[subject] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredData]);

  const reasonAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredData.forEach((v) => {
      const reason = v.reason || 'Unspecified';
      counts[reason] = (counts[reason] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredData]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(20);
    doc.text('QNHS CLINIC HEALTH REPORT', 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Total Visits: ${filteredData.length}`, 14, 33);
    doc.text(`Student Visits: ${studentVisits.length}`, 65, 33);
    doc.text(`Employee Visits: ${employeeVisits.length}`, 125, 33);
    doc.text(`Sent Home: ${sentHomeCount}`, 190, 33);

    autoTable(doc, {
      startY: 42,
      head: [[
        'Patient',
        'Type',
        'Grade/Employee Type',
        'Section',
        'Subject',
        'Reason',
        'Status',
        'Date'
      ]],
      body: filteredData.map((v) => [
        v.visitor_type === 'Employee'
          ? v.full_name || 'N/A'
          : v.students?.name || 'N/A',
        v.visitor_type || 'Student',
        v.visitor_type === 'Employee'
          ? v.employee_type || 'N/A'
          : v.students?.grade_level || 'N/A',
        v.students?.section || 'N/A',
        v.subject_at_time || 'N/A',
        v.reason || 'N/A',
        v.status || 'N/A',
        new Date(v.visit_time).toLocaleString()
      ])
    });

    doc.save('QNHS_Clinic_Report.pdf');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl font-black text-slate-700 animate-pulse">
          Loading Reports...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
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
            supabase.auth.signOut().then(() => router.push('/login'))
          }
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-800">
              Clinic Reports
            </h1>

            <p className="uppercase text-xs tracking-[0.3em] text-slate-400 font-black mt-3">
              Health Monitoring System
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchAllData}
              className="bg-white border border-slate-200 text-slate-700 px-6 py-4 rounded-2xl flex items-center gap-3 font-black shadow-lg hover:bg-slate-50 transition-all"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>

            <button
              onClick={exportPDF}
              className="bg-[#0F172A] text-white px-7 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-slate-800 transition-all"
            >
              <Printer size={18} />
              Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl p-6 mb-10 border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <Filter size={18} className="text-teal-600" />
            <p className="font-black text-sm text-slate-500 uppercase">
              Filters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
              />
            </div>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === 'All' ? 'All Subjects' : subject}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
            >
              <option value="All">All Status</option>
              <option value="Waiting">Waiting</option>
              <option value="Returned to Class">Returned to Class</option>
              <option value="Sent Home">Sent Home</option>
            </select>

            <select
              value={filterVisitorType}
              onChange={(e) => setFilterVisitorType(e.target.value)}
              className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
            >
              <option value="All">All Visitors</option>
              <option value="Student">Students</option>
              <option value="Employee">Employees</option>
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
            />

            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold outline-none"
            />
          </div>

          <button
            onClick={resetFilters}
            className="mt-5 bg-red-500 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
          <SummaryCard title="Total Visits" value={filteredData.length} icon={<Activity />} />
          <SummaryCard title="Today" value={todayVisits} icon={<Calendar />} />
          <SummaryCard title="Students" value={studentVisits.length} icon={<UserSquare2 />} />
          <SummaryCard title="Employees" value={employeeVisits.length} icon={<Briefcase />} />
          <SummaryCard title="Sent Home" value={sentHomeCount} icon={<AlertTriangle />} danger />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              <BookOpen size={20} />
              Visits per Subject
            </h3>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#14B8A6" radius={[10, 10, 0, 0]} />
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
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#F97316" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-2xl font-black">Detailed Visit Records</h2>
            <p className="text-sm text-slate-400 font-bold mt-1">
              Showing {filteredData.length} record(s)
            </p>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-black">
              <tr>
                <th className="px-8 py-6">Patient</th>
                <th className="px-8 py-6">Type</th>
                <th className="px-8 py-6">Grade/Employee</th>
                <th className="px-8 py-6">Section</th>
                <th className="px-8 py-6">Subject</th>
                <th className="px-8 py-6">Reason</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center text-slate-400 font-black">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-6 font-bold">
                      {v.visitor_type === 'Employee'
                        ? v.full_name || 'N/A'
                        : v.students?.name || 'N/A'}
                    </td>

                    <td className="px-8 py-6">
                      {v.visitor_type || 'Student'}
                    </td>

                    <td className="px-8 py-6">
                      {v.visitor_type === 'Employee'
                        ? v.employee_type || 'N/A'
                        : v.students?.grade_level || 'N/A'}
                    </td>

                    <td className="px-8 py-6">
                      {v.students?.section || 'N/A'}
                    </td>

                    <td className="px-8 py-6">
                      {v.subject_at_time || 'N/A'}
                    </td>

                    <td className="px-8 py-6">
                      {v.reason || 'N/A'}
                    </td>

                    <td className="px-8 py-6">
                      <span
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                          v.status === 'Sent Home'
                            ? 'bg-red-100 text-red-600'
                            : v.status === 'Waiting'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-teal-100 text-teal-600'
                        }`}
                      >
                        {v.status || 'Waiting'}
                      </span>
                    </td>

                    <td className="px-8 py-6">
                      {new Date(v.visit_time).toLocaleDateString()}
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

function SummaryCard({
  title,
  value,
  icon,
  danger = false
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="bg-white p-7 rounded-[2rem] shadow-xl flex justify-between items-center">
      <div>
        <p className="uppercase text-xs font-black text-slate-400 mb-2">
          {title}
        </p>

        <h2 className={`text-5xl font-black ${danger ? 'text-red-500' : 'text-slate-800'}`}>
          {value}
        </h2>
      </div>

      <div className={`p-4 rounded-2xl ${danger ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-600'}`}>
        {icon}
      </div>
    </div>
  );
}