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
  Activity,
  Search,
  FileText,
  AlertCircle,
  RefreshCcw,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  student_id: string;
  grade_level: string;
  section: string;
  is_high_risk: boolean;
}

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [isHighRisk, setIsHighRisk] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const inputClass =
    'w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold';

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Students fetch warning:', error.message);
        setStudents([]);
        return;
      }

      setStudents((data as Student[]) || []);
    } catch (err) {
      console.warn('Students fetch failed:', err);
      setStudents([]);
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

        await fetchStudents();
      } catch (err) {
        console.warn('Auth check failed:', err);
        router.push('/login');
        setPageLoading(false);
      }
    };

    checkUser();
  }, [router, fetchStudents]);

  useEffect(() => {
    const channel = supabase
      .channel('student-directory-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => fetchStudents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStudents]);

  const resetForm = () => {
    setName('');
    setStudentId('');
    setGrade('');
    setSection('');
    setIsHighRisk(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !studentId.trim() || !grade || !section.trim()) {
      alert('Please complete all required fields.');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      student_id: studentId.trim(),
      grade_level: grade,
      section: section.trim(),
      is_high_risk: isHighRisk
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          alert(error.code === '23505' ? 'Student ID already exists!' : error.message);
          return;
        }
      } else {
        const { error } = await supabase
          .from('students')
          .insert([payload]);

        if (error) {
          alert(error.code === '23505' ? 'Student ID already exists!' : error.message);
          return;
        }
      }

      resetForm();
      await fetchStudents();
    } catch (err) {
      console.warn('Save student failed:', err);
      alert('Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      'Permanently delete this student? Make sure clinic visit history is safe before deleting.'
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        alert(error.message);
        return;
      }

      await fetchStudents();
    } catch (err) {
      console.warn('Delete failed:', err);
      alert('Something went wrong while deleting.');
    }
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setName(s.name || '');
    setStudentId(s.student_id || '');
    setGrade(s.grade_level || '');
    setSection(s.section || '');
    setIsHighRisk(Boolean(s.is_high_risk));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();

      const matchSearch =
        q === '' ||
        s.name?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q) ||
        s.section?.toLowerCase().includes(q);

      const matchGrade =
        gradeFilter === 'All' || s.grade_level === gradeFilter;

      const matchRisk =
        riskFilter === 'All' ||
        (riskFilter === 'High Risk' && s.is_high_risk) ||
        (riskFilter === 'Standard' && !s.is_high_risk);

      return matchSearch && matchGrade && matchRisk;
    });
  }, [students, searchTerm, gradeFilter, riskFilter]);

  const highRiskCount = students.filter((s) => s.is_high_risk).length;
  const standardCount = students.length - highRiskCount;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl font-black text-slate-700 animate-pulse">
          Loading Students...
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

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl font-bold">
            <Users size={20} />
            Students
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
          >
            <FileText size={20} />
            Reports
          </button>
        </nav>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
            <div>
              <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-none">
                Student Directory
              </h2>

              <p className="text-slate-500 font-semibold mt-3 text-sm uppercase tracking-widest">
                Medical Database
              </p>
            </div>

            <button
              onClick={fetchStudents}
              className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 font-black text-slate-600 hover:bg-slate-50"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title="Active Records"
              value={students.length}
              icon={<Users size={24} />}
              color="teal"
            />

            <SummaryCard
              title="High Risk"
              value={highRiskCount}
              icon={<ShieldAlert size={24} />}
              color="red"
            />

            <SummaryCard
              title="Standard"
              value={standardCount}
              icon={<UserCheck size={24} />}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-4">
              <form
                onSubmit={handleSubmit}
                className="bg-white p-7 rounded-[2.5rem] shadow-2xl border border-white space-y-5 sticky top-8"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-2xl text-slate-800 tracking-tight">
                    {editingId ? 'Edit Profile' : 'Register Student'}
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

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">
                    Full Name
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Juan Dela Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">
                    Student ID
                  </label>
                  <input
                    className={`${inputClass} font-mono`}
                    placeholder="2024-0001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">
                      Grade
                    </label>

                    <select
                      className={inputClass}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      {[7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g.toString()}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 block">
                      Section
                    </label>

                    <input
                      className={inputClass}
                      placeholder="Newton"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isHighRisk
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                  onClick={() => setIsHighRisk(!isHighRisk)}
                >
                  <div>
                    <p
                      className={`text-xs font-black uppercase ${
                        isHighRisk ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      High Risk Student
                    </p>

                    <p className="text-[10px] font-bold text-slate-400">
                      Flag for special medical attention
                    </p>
                  </div>

                  {isHighRisk ? (
                    <AlertCircle className="text-red-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest text-white disabled:opacity-60 ${
                    editingId
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                      : 'bg-[#14B8A6] hover:bg-[#0D9488] shadow-teal-500/20'
                  }`}
                >
                  {saving ? 'Processing...' : editingId ? 'Update Record' : 'Register Student'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />

                    <input
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold text-sm"
                      placeholder="Search by name, student ID, or section"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="px-5 py-3 rounded-2xl bg-white border border-slate-100 font-bold outline-none"
                    >
                      <option value="All">All Grades</option>
                      {[7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g.toString()}>
                          Grade {g}
                        </option>
                      ))}
                    </select>

                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="px-5 py-3 rounded-2xl bg-white border border-slate-100 font-bold outline-none"
                    >
                      <option value="All">All Status</option>
                      <option value="High Risk">High Risk</option>
                      <option value="Standard">Standard</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Student Info</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-8 py-16 text-center text-slate-400 font-black"
                        >
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50/50 group transition-all ${
                            s.is_high_risk ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-xs shadow-inner uppercase ${
                                  s.is_high_risk
                                    ? 'bg-red-500 text-white'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {s.name?.charAt(0) || '?'}
                              </div>

                              <div>
                                <p
                                  className={`font-black text-lg leading-tight flex items-center gap-2 ${
                                    s.is_high_risk ? 'text-red-700' : 'text-slate-800'
                                  }`}
                                >
                                  {s.name}
                                  {s.is_high_risk && <AlertCircle size={16} />}
                                </p>

                                <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
                                  Grade {s.grade_level || 'N/A'} — {s.section || 'N/A'} • ID:{' '}
                                  {s.student_id || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-5 text-center">
                            {s.is_high_risk ? (
                              <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                High Risk
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                Standard
                              </span>
                            )}
                          </td>

                          <td className="px-8 py-5">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => startEdit(s)}
                                className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl active:scale-90 transition-all"
                              >
                                <Edit3 size={18} />
                              </button>

                              <button
                                onClick={() => handleDelete(s.id)}
                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl active:scale-90 transition-all"
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
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'teal' | 'red' | 'blue';
}) {
  const colorClass = {
    teal: 'bg-teal-50 text-teal-600',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div className="bg-white px-8 py-6 rounded-[1.5rem] shadow-xl border border-white flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {title}
        </p>

        <p className="text-4xl font-black text-slate-800 leading-none mt-2">
          {value}
        </p>
      </div>

      <div className={`p-4 rounded-2xl ${colorClass[color]}`}>
        {icon}
      </div>
    </div>
  );
}