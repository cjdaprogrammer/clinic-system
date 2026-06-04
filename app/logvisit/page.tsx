'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard,
  PlusCircle,
  Users,
  LogOut,
  Trash2,
  Edit3,
  AlertCircle,
  Activity,
  Thermometer,
  HeartPulse,
  Search,
  FileText,
  Printer,
  Droplets,
  Scale,
  Pill,
  RefreshCcw,
  Calendar,
  Home,
  ClipboardList
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Student {
  id: string;
  name: string;
  student_id: string;
  grade_level: string;
}

interface Visit {
  id: string;
  student_id: string;
  visit_time: string;
  subject_at_time: string;
  reason: string;
  temperature: string | null;
  blood_pressure: string | null;
  oxygen_saturation: string | null;
  weight: string | null;
  medicine_given: string | null;
  status: string;
  students?: {
    name: string;
    grade_level: string;
  };
}

export default function LogVisitPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [o2, setO2] = useState('');
  const [weight, setWeight] = useState('');
  const [medicine, setMedicine] = useState('');
  const [status, setStatus] = useState('Returned to Class');

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitSearch, setVisitSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const inputClass =
    'w-full px-4 py-3 border border-slate-100 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold';

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: stds, error: studentsError } = await supabase
        .from('students')
        .select('id, name, student_id, grade_level')
        .order('name', { ascending: true });

      if (studentsError) {
        console.warn('Students fetch warning:', studentsError.message);
        setStudents([]);
      } else {
        setStudents((stds as Student[]) || []);
      }

      const { data: vsts, error: visitsError } = await supabase
        .from('visits')
        .select('*, students(name, grade_level)')
        .order('visit_time', { ascending: false });

      if (visitsError) {
        console.warn('Visits fetch warning:', visitsError.message);
        setVisits([]);
      } else {
        setVisits((vsts as Visit[]) || []);
      }
    } catch (err) {
      console.warn('Fetch failed:', err);
      setStudents([]);
      setVisits([]);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Auth warning:', error.message);
          router.push('/login');
          setPageLoading(false);
          return;
        }

        if (!data.session) {
          router.push('/login');
          setPageLoading(false);
          return;
        }

        await fetchInitialData();
      } catch (err) {
        console.warn('Auth check failed:', err);
        router.push('/login');
        setPageLoading(false);
      }
    };

    checkUser();
  }, [router, fetchInitialData]);

  useEffect(() => {
    const channel = supabase
      .channel('visits-log-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => fetchInitialData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  const formatGrade = (grade: string | undefined) => {
    if (!grade) return 'N/A';
    return grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedVisitCount = useMemo(() => {
    if (!selectedStudentId) return 0;
    return visits.filter((v) => v.student_id === selectedStudentId).length;
  }, [selectedStudentId, visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const q = visitSearch.toLowerCase();

      const matchSearch =
        q === '' ||
        v.students?.name?.toLowerCase().includes(q) ||
        v.subject_at_time?.toLowerCase().includes(q) ||
        v.reason?.toLowerCase().includes(q) ||
        v.status?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'All' || v.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [visits, visitSearch, statusFilter]);

  const todayCount = visits.filter(
    (v) => new Date(v.visit_time).toDateString() === new Date().toDateString()
  ).length;

  const sentHomeCount = visits.filter((v) => v.status === 'Sent Home').length;

  const feverCount = visits.filter(
    (v) => Number(v.temperature || 0) >= 37.5
  ).length;

  const selectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentSearch(student.name);
    setShowStudentList(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedStudentId('');
    setStudentSearch('');
    setSubject('');
    setReason('');
    setTemp('');
    setBp('');
    setO2('');
    setWeight('');
    setMedicine('');
    setStatus('Returned to Class');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId) {
      alert('Please select a student from the list.');
      return;
    }

    setSaving(true);

    const payload = {
      student_id: selectedStudentId,
      subject_at_time: subject.trim(),
      reason: reason.trim(),
      temperature: temp || null,
      blood_pressure: bp || null,
      oxygen_saturation: o2 || null,
      weight: weight || null,
      medicine_given: medicine.trim() || null,
      status
    };

    try {
      const { error } = editingId
        ? await supabase.from('visits').update(payload).eq('id', editingId)
        : await supabase.from('visits').insert([payload]);

      if (error) {
        alert('Error saving: ' + error.message);
        return;
      }

      alert(editingId ? 'Log updated!' : 'Visit recorded!');
      resetForm();
      await fetchInitialData();
    } catch (err) {
      console.warn('Save visit failed:', err);
      alert('Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v: Visit) => {
    setEditingId(v.id);
    setSelectedStudentId(v.student_id);
    setStudentSearch(v.students?.name || '');
    setSubject(v.subject_at_time || '');
    setReason(v.reason || '');
    setTemp(v.temperature || '');
    setBp(v.blood_pressure || '');
    setO2(v.oxygen_saturation || '');
    setWeight(v.weight || '');
    setMedicine(v.medicine_given || '');
    setStatus(v.status || 'Returned to Class');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this clinic log?')) return;

    try {
      const { error } = await supabase.from('visits').delete().eq('id', id);

      if (error) {
        alert(error.message);
        return;
      }

      await fetchInitialData();
    } catch (err) {
      console.warn('Delete failed:', err);
      alert('Something went wrong while deleting.');
    }
  };

  const generateSlip = (visit: Visit) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text('QNHS CLINIC PASS', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(visit.visit_time).toLocaleString()}`, 105, 28, {
      align: 'center'
    });

    autoTable(doc, {
      startY: 35,
      body: [
        ['Student Name', visit.students?.name || 'N/A'],
        ['Grade', formatGrade(visit.students?.grade_level)],
        ['Subject', visit.subject_at_time || 'N/A'],
        [
          'Vitals',
          `${visit.temperature || '--'}°C | ${visit.blood_pressure || '--'} BP | ${
            visit.oxygen_saturation || '--'
          }% SpO2`
        ],
        ['Weight', `${visit.weight || '--'} kg`],
        ['Medicine', visit.medicine_given || 'None'],
        ['Reason', visit.reason || 'N/A'],
        ['Outcome', visit.status || 'N/A']
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } }
    });

    doc.save(`Clinic_Slip_${visit.students?.name || 'Student'}.pdf`);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl font-black text-slate-700 animate-pulse">
          Loading Log Visit...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-[#14B8A6] p-2 rounded-xl shadow-lg shadow-teal-500/20">
            <Activity size={24} />
          </div>

          <h1 className="text-xl font-black tracking-tighter uppercase">
            QNHS Clinic
          </h1>
        </div>

        <nav className="flex-1 space-y-2 text-white font-bold">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl shadow-teal-500/10 font-bold transition-all">
            <PlusCircle size={20} />
            Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"
          >
            <Users size={20} />
            Students
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-semibold"
          >
            <FileText size={20} />
            Reports
          </button>
        </nav>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div>
            <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-none">
              {editingId ? 'Modify Record' : 'Log Visit'}
            </h2>

            <p className="text-slate-500 font-semibold mt-3 text-sm uppercase tracking-widest">
              Intake Management
            </p>
          </div>

          <button
            onClick={fetchInitialData}
            className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 font-black text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Logs" value={visits.length} icon={<ClipboardList />} />
          <SummaryCard title="Today" value={todayCount} icon={<Calendar />} />
          <SummaryCard title="Sent Home" value={sentHomeCount} icon={<Home />} danger />
          <SummaryCard title="Fever Alert" value={feverCount} icon={<Thermometer />} danger />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white space-y-4 sticky top-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-black text-2xl text-slate-800">
                  {editingId ? 'Edit Visit' : 'New Visit'}
                </h3>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Student Selection
                </label>

                <div className="relative font-bold">
                  <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />

                  <input
                    type="text"
                    className={`${inputClass} pl-11 pr-10`}
                    placeholder="Search name or ID..."
                    value={studentSearch}
                    onFocus={() => setShowStudentList(true)}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudentId('');
                      setShowStudentList(true);
                    }}
                  />
                </div>

                {showStudentList && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-sm font-bold text-slate-400">
                        No student found.
                      </div>
                    ) : (
                      filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => selectStudent(s)}
                          className="p-4 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all"
                        >
                          <p className="font-black text-slate-800 text-sm tracking-tight">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                            {s.student_id} — {formatGrade(s.grade_level)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedVisitCount > 2 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700 text-[11px] font-black uppercase tracking-tight">
                  <AlertCircle size={18} />
                  Frequent visitor: {selectedVisitCount} records
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                    <Thermometer size={12} />
                    Temp
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={inputClass}
                    placeholder="36.5"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                    <HeartPulse size={12} />
                    BP
                  </label>
                  <input
                    className={inputClass}
                    placeholder="120/80"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                    <Droplets size={12} />
                    SpO2
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="98"
                    value={o2}
                    onChange={(e) => setO2(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                    <Scale size={12} />
                    Weight
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="60"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                  <Pill size={12} />
                  Medicine Given
                </label>
                <input
                  className={inputClass}
                  placeholder="Paracetamol / None"
                  value={medicine}
                  onChange={(e) => setMedicine(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Outcome Status
                </label>
                <select
                  className={inputClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Returned to Class">Returned to Class</option>
                  <option value="Sent Home">Sent Home</option>
                  <option value="Resting in Clinic">Resting in Clinic</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Subject
                </label>
                <input
                  className={inputClass}
                  placeholder="Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">
                  Reason
                </label>
                <textarea
                  className={inputClass}
                  placeholder="Findings..."
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-white bg-[#14B8A6] hover:bg-[#0D9488] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-60"
              >
                {saving ? 'Processing...' : editingId ? 'Update Log' : 'Record Visit'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold text-sm"
                    placeholder="Search logs..."
                    value={visitSearch}
                    onChange={(e) => setVisitSearch(e.target.value)}
                  />
                </div>

                <select
                  className="px-5 py-3 rounded-2xl bg-white border border-slate-100 font-bold outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Returned to Class">Returned to Class</option>
                  <option value="Sent Home">Sent Home</option>
                  <option value="Resting in Clinic">Resting in Clinic</option>
                </select>
              </div>

              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6">Student</th>
                    <th className="px-6 py-6 text-center">Vitals/Metrics</th>
                    <th className="px-6 py-6 text-center">Medicine</th>
                    <th className="px-6 py-6 text-center">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50 font-bold">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-black">
                        No visit logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 text-lg leading-none group-hover:text-[#14B8A6] transition-colors">
                            {v.students?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                            {formatGrade(v.students?.grade_level)} — {v.subject_at_time || 'N/A'}
                          </p>
                          <p className="text-[10px] text-slate-300 font-bold mt-1">
                            {new Date(v.visit_time).toLocaleString()}
                          </p>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <div className="flex flex-col gap-1 text-[11px] font-black">
                            <span className={Number(v.temperature || 0) >= 37.5 ? 'text-red-500' : 'text-slate-600'}>
                              {v.temperature || '--'}°C | {v.blood_pressure || '--'} BP
                            </span>
                            <span className="text-slate-400 text-[9px] uppercase font-bold">
                              {v.oxygen_saturation || '--'}% SpO2 | {v.weight || '--'}kg
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <p className="text-[11px] text-slate-600 font-black italic">
                            {v.medicine_given || 'None'}
                          </p>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${
                              v.status === 'Sent Home'
                                ? 'bg-red-50 text-red-600 border-red-100'
                                : v.status === 'Resting in Clinic'
                                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                                  : 'bg-teal-50 text-teal-600 border-teal-100'
                            }`}
                          >
                            {v.status || 'N/A'}
                          </span>
                        </td>

                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => generateSlip(v)}
                              className="p-2.5 text-slate-400 hover:text-[#14B8A6] transition-all"
                              title="Print Slip"
                            >
                              <Printer size={18} />
                            </button>

                            <button
                              onClick={() => startEdit(v)}
                              className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                            >
                              <Edit3 size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    <div className="bg-white p-6 rounded-[1.5rem] shadow-xl border border-white flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {title}
        </p>

        <p className={`text-4xl font-black mt-2 ${danger ? 'text-red-500' : 'text-slate-800'}`}>
          {value}
        </p>
      </div>

      <div className={`p-4 rounded-2xl ${danger ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-600'}`}>
        {icon}
      </div>
    </div>
  );
}