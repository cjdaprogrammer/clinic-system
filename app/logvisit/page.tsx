'use client'

import { useState, useEffect } from 'react';
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
  Pill
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =========================
// TYPES
// =========================
interface Student {
  id: string;
  name: string;
  student_id: string;
  grade_level: string;
}

interface Employee {
  id: string;
  full_name: string;
  employee_type: string;
}

interface Visit {
  id: string;

  student_id: string;

  visit_time: string;

  visitor_type?: string;

  full_name?: string;

  employee_type?: string;

  subject_at_time: string;

  reason: string;

  temperature: string;

  blood_pressure: string;

  oxygen_saturation: string;

  weight: string;

  medicine_given: string;

  status: string;

  students: {
    name: string;
    grade_level: string;
  };
}

export default function LogVisitPage() {

  const router = useRouter();

  const [students, setStudents] =
    useState<Student[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [visits, setVisits] =
    useState<Visit[]>([]);

  // SEARCHABLE STATE
  const [studentSearch, setStudentSearch] =
    useState('');

  const [showStudentList, setShowStudentList] =
    useState(false);

  const [selectedStudentId, setSelectedStudentId] =
    useState('');

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [selectedVisitorType, setSelectedVisitorType] =
    useState<'Student' | 'Employee'>('Student');

  // FORM FIELDS
  const [subject, setSubject] =
    useState('');

  const [reason, setReason] =
    useState('');

  const [temp, setTemp] =
    useState('');

  const [bp, setBp] =
    useState('');

  const [o2, setO2] =
    useState('');

  const [weight, setWeight] =
    useState('');

  const [medicine, setMedicine] =
    useState('');

  const [status, setStatus] =
    useState('Returned to Class');

  const [loading, setLoading] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [visitCount, setVisitCount] =
    useState(0);

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

        fetchInitialData();

      }
    };

    checkUser();

  }, [router]);

  // =========================
  // FETCH DATA
  // =========================
  async function fetchInitialData() {

    const { data: stds } =
      await supabase
        .from('students')
        .select(
          'id, name, student_id, grade_level'
        )
        .order('name', {
          ascending: true
        });

    const { data: empData } =
      await supabase
        .from('employees')
        .select(
          'id, full_name, employee_type'
        )
        .order('full_name', {
          ascending: true
        });

    const { data: vsts } =
      await supabase
        .from('visits')
        .select(`
          *,
          students(
            name,
            grade_level
          )
        `)
        .order('visit_time', {
          ascending: false
        });

    if (stds) setStudents(stds);

    if (empData) setEmployees(empData);

    if (vsts) setVisits(vsts as any);
  }

  // =========================
  // HELPERS
  // =========================
  const formatGrade = (grade: string) => {

    if (!grade) return 'N/A';

    return grade
      .toLowerCase()
      .includes('grade')
      ? grade
      : `Grade ${grade}`;
  };

  // =========================
  // FILTERS
  // =========================
  const filteredStudents = students.filter(
    s =>
      s.name
        .toLowerCase()
        .includes(
          studentSearch.toLowerCase()
        ) ||

      s.student_id
        .toLowerCase()
        .includes(
          studentSearch.toLowerCase()
        )
  );

  const filteredEmployees =
    employees.filter(e =>
      e.full_name
        .toLowerCase()
        .includes(
          studentSearch.toLowerCase()
        )
    );

  // =========================
  // VISIT COUNT
  // =========================
  useEffect(() => {

    if (selectedStudentId) {

      const count = visits.filter(
        v => v.student_id === selectedStudentId
      ).length;

      setVisitCount(count);

    } else {

      setVisitCount(0);

    }

  }, [selectedStudentId, visits]);

  // =========================
  // PDF
  // =========================
  const generateSlip = (
    visit: Visit
  ) => {

    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.setTextColor(20, 184, 166);

    doc.text(
      'QNHS CLINIC PASS',
      105,
      20,
      { align: 'center' }
    );

    doc.setFontSize(10);

    doc.setTextColor(100);

    doc.text(
      `Date: ${new Date(
        visit.visit_time
      ).toLocaleString()}`,
      105,
      28,
      { align: 'center' }
    );

    autoTable(doc, {

      startY: 35,

      body: [

        [
          'Visitor',
          visit.visitor_type === 'Employee'
            ? visit.full_name
            : visit.students?.name
        ],

        [
          'Type',
          visit.visitor_type === 'Employee'
            ? visit.employee_type
            : formatGrade(
                visit.students?.grade_level
              )
        ],

        [
          'Subject',
          visit.subject_at_time
        ],

        [
          'Vitals',
          `${visit.temperature || '--'}°C | ${visit.blood_pressure || '--'} BP | ${visit.oxygen_saturation || '--'}% SpO2`
        ],

        [
          'Weight',
          `${visit.weight || '--'} kg`
        ],

        [
          'Medicine',
          visit.medicine_given || 'None'
        ],

        [
          'Reason',
          visit.reason
        ],

        [
          'Outcome',
          visit.status
        ],

      ],

      theme: 'grid',

      styles: {
        fontSize: 11,
        cellPadding: 5
      },

      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 40
        }
      }

    });

    doc.save('Clinic_Slip.pdf');
  };

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (
      selectedVisitorType === 'Student' &&
      !selectedStudentId
    ) {

      return alert(
        'Please select a student'
      );
    }

    if (
      selectedVisitorType === 'Employee' &&
      !selectedEmployee
    ) {

      return alert(
        'Please select an employee'
      );
    }

    setLoading(true);

    const payload = {

      student_id:
        selectedVisitorType === 'Student'
          ? selectedStudentId
          : null,

      visitor_type:
        selectedVisitorType,

      full_name:
        selectedVisitorType === 'Employee'
          ? selectedEmployee?.full_name
          : null,

      employee_type:
        selectedVisitorType === 'Employee'
          ? selectedEmployee?.employee_type
          : null,

      subject_at_time:
        selectedVisitorType === 'Employee'
          ? 'N/A'
          : subject,

      reason: reason,

      temperature: temp || null,

      blood_pressure: bp || null,

      oxygen_saturation: o2 || null,

      weight: weight || null,

      medicine_given: medicine || null,

      status: status
    };

    const { error } = editingId

      ? await supabase
          .from('visits')
          .update(payload)
          .eq('id', editingId)

      : await supabase
          .from('visits')
          .insert([payload]);

    if (!error) {

      alert(
        editingId
          ? 'Log Updated!'
          : 'Visit Recorded!'
      );

      resetForm();

      fetchInitialData();

    } else {

      alert(
        'Error saving: ' +
        error.message
      );
    }

    setLoading(false);
  };

  // =========================
  // RESET
  // =========================
  const resetForm = () => {

    setEditingId(null);

    setSelectedStudentId('');

    setSelectedEmployee(null);

    setStudentSearch('');

    setSubject('');

    setReason('');

    setTemp('');

    setBp('');

    setO2('');

    setWeight('');

    setMedicine('');

    setStatus(
      'Returned to Class'
    );
  };

  // =========================
  // SELECT STUDENT
  // =========================
  const selectStudent = (
    student: Student
  ) => {

    setSelectedStudentId(student.id);

    setStudentSearch(student.name);

    setShowStudentList(false);
  };

  // =========================
  // EDIT
  // =========================
  const startEdit = (
    v: Visit
  ) => {

    setEditingId(v.id);

    setSelectedStudentId(v.student_id);

    setStudentSearch(
      v.visitor_type === 'Employee'
        ? v.full_name || ''
        : v.students?.name || ''
    );

    setSubject(v.subject_at_time);

    setReason(v.reason);

    setTemp(v.temperature || '');

    setBp(v.blood_pressure || '');

    setO2(
      v.oxygen_saturation || ''
    );

    setWeight(v.weight || '');

    setMedicine(
      v.medicine_given || ''
    );

    setStatus(
      v.status || 'Returned to Class'
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (
    id: string
  ) => {

    if (confirm(
      'Delete this log?'
    )) {

      await supabase
        .from('visits')
        .delete()
        .eq('id', id);

      fetchInitialData();
    }
  };

  return (

    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight text-black">

      {/* SIDEBAR */}
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

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] text-white rounded-2xl shadow-xl shadow-teal-500/10 font-bold transition-all transform active:scale-95">

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
          onClick={() =>
            supabase.auth
              .signOut()
              .then(() =>
                router.push('/login')
              )
          }
          className="flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold transition-all group"
        >

          <LogOut
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />

          Sign Out

        </button>

      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        <header className="mb-10 text-black">

          <h2 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">

            {editingId
              ? 'Modify Record'
              : 'Log Visit'}

          </h2>

          <p className="text-slate-500 font-semibold mt-2 text-sm uppercase tracking-widest">
            Intake Management
          </p>

        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-black">

          {/* FORM */}
          <div className="lg:col-span-4">

            <form
              onSubmit={handleSubmit}
              className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white space-y-4 sticky top-8"
            >

              {/* VISITOR TYPE */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">

                  Visitor Type

                </label>

                <select
                  value={selectedVisitorType}
                  onChange={(e) => {

                    setSelectedVisitorType(
                      e.target.value as
                      'Student' | 'Employee'
                    );

                    setStudentSearch('');

                    setSelectedStudentId('');

                    setSelectedEmployee(null);
                  }}
                  className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold"
                >

                  <option value="Student">
                    Student
                  </option>

                  <option value="Employee">
                    Employee
                  </option>

                </select>

              </div>

              {/* SEARCH */}
              <div className="relative">

                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">

                  Student / Employee Selection

                </label>

                <div className="relative font-bold">

                  <Search
                    className="absolute left-4 top-3.5 text-slate-300"
                    size={18}
                  />

                  <input
                    type="text"
                    className="w-full pl-11 pr-10 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-black outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold shadow-inner"
                    placeholder="Search..."
                    value={studentSearch}
                    onFocus={() =>
                      setShowStudentList(true)
                    }
                    onChange={(e) => {

                      setStudentSearch(
                        e.target.value
                      );

                      setSelectedStudentId('');
                    }}
                  />

                </div>

                {showStudentList && (

                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">

                    {selectedVisitorType === 'Student' ? (

                      filteredStudents.map(s => (

                        <div
                          key={s.id}
                          onClick={() =>
                            selectStudent(s)
                          }
                          className="p-4 hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all"
                        >

                          <p className="font-black text-slate-800 text-sm tracking-tight">

                            {s.name}

                          </p>

                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">

                            {s.student_id}
                            {' — '}
                            {formatGrade(
                              s.grade_level
                            )}

                          </p>

                        </div>

                      ))

                    ) : (

                      filteredEmployees.map(emp => (

                        <div
                          key={emp.id}
                          onClick={() => {

                            setSelectedEmployee(emp);

                            setStudentSearch(
                              emp.full_name
                            );

                            setShowStudentList(false);
                          }}
                          className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all"
                        >

                          <p className="font-black text-slate-800 text-sm tracking-tight">

                            {emp.full_name}

                          </p>

                          <p className="text-[10px] text-blue-500 font-bold uppercase mt-0.5">

                            {emp.employee_type}

                          </p>

                        </div>

                      ))

                    )}

                  </div>

                )}

              </div>

              {/* ALERT */}
              {visitCount > 2 && (

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700 text-[11px] font-black uppercase tracking-tight">

                  <AlertCircle size={18} />

                  Frequent:
                  {' '}
                  {visitCount}
                  {' '}
                  Records

                </div>

              )}

              {/* VITALS */}
              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 flex items-center gap-1">

                    <Thermometer size={12} />

                    Temp (°C)

                  </label>

                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-4 py-3 border border-slate-100 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#14B8A6] font-bold"
                    placeholder="36.5"
                    value={temp}
                    onChange={(e) =>
                      setTemp(e.target.value)
                    }
                  />

                </div>

              </div>

            </form>

          </div>

        </div>

      </main>

    </div>
  );
}