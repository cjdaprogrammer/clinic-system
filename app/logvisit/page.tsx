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
  Pill,
  Briefcase,
  UserSquare2
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ======================
// TYPES
// ======================

interface Student {
  id: string;
  name: string;
  student_id: string;
  grade_level: string;
}

interface Visit {
  id: string;
  student_id?: string;

  visit_time: string;
  subject_at_time: string;
  reason: string;

  temperature: string;
  blood_pressure: string;
  oxygen_saturation: string;
  weight: string;
  medicine_given: string;

  status: string;

  visitor_type?: string;
  full_name?: string;
  employee_type?: string;

  students?: {
    name: string;
    grade_level: string;
  };
}

export default function LogVisitPage() {

  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  // ======================
  // VISITOR TYPE
  // ======================

  const [visitorType, setVisitorType] =
    useState<'Student' | 'Employee'>('Student');

  // ======================
  // STUDENT STATES
  // ======================

  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // ======================
  // EMPLOYEE STATES
  // ======================

  const [employeeName, setEmployeeName] = useState('');
  const [employeeType, setEmployeeType] = useState('Teacher');

  // ======================
  // FORM FIELDS
  // ======================

  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');

  const [temp, setTemp] = useState('');
  const [bp, setBp] = useState('');
  const [o2, setO2] = useState('');
  const [weight, setWeight] = useState('');
  const [medicine, setMedicine] = useState('');

  const [status, setStatus] =
    useState('Returned to Class');

  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [visitCount, setVisitCount] = useState(0);

  // ======================
  // AUTH
  // ======================

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

  // ======================
  // FETCH DATA
  // ======================

  async function fetchInitialData() {

    const { data: stds } = await supabase
      .from('students')
      .select('id, name, student_id, grade_level')
      .order('name', { ascending: true });

    const { data: vsts } = await supabase
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

    if (vsts) setVisits(vsts as any);
  }

  // ======================
  // FORMAT GRADE
  // ======================

  const formatGrade = (grade: string) => {

    if (!grade) return 'N/A';

    return grade
      .toLowerCase()
      .includes('grade')
      ? grade
      : `Grade ${grade}`;
  };

  // ======================
  // FILTER STUDENTS
  // ======================

  const filteredStudents = students.filter(s =>
    s.name
      .toLowerCase()
      .includes(studentSearch.toLowerCase()) ||

    s.student_id
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
  );

  // ======================
  // VISIT COUNT
  // ======================

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

  // ======================
  // PDF SLIP
  // ======================

  const generateSlip = (visit: Visit) => {

    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.setTextColor(20, 184, 166);

    doc.text(
      "QNHS CLINIC PASS",
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
                visit.students?.grade_level || ''
              )
        ],

        ['Subject', visit.subject_at_time],

        [
          'Vitals',
          `${visit.temperature || '--'}°C | ${visit.blood_pressure || '--'} | ${visit.oxygen_saturation || '--'}%`
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

    doc.save(`Clinic_Slip.pdf`);
  };

  // ======================
  // SUBMIT
  // ======================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setLoading(true);

    let payload: any = {

      visitor_type: visitorType,

      subject_at_time: subject,

      reason: reason,

      temperature: temp || null,

      blood_pressure: bp || null,

      oxygen_saturation: o2 || null,

      weight: weight || null,

      medicine_given: medicine || null,

      status: status
    };

    // STUDENT
    if (visitorType === 'Student') {

      if (!selectedStudentId) {
        alert('Please select a student');
        setLoading(false);
        return;
      }

      payload.student_id = selectedStudentId;
    }

    // EMPLOYEE
    if (visitorType === 'Employee') {

      if (!employeeName) {
        alert('Please enter employee name');
        setLoading(false);
        return;
      }

      payload.full_name = employeeName;
      payload.employee_type = employeeType;
    }

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

      alert(error.message);
    }

    setLoading(false);
  };

  // ======================
  // RESET FORM
  // ======================

  const resetForm = () => {

    setEditingId(null);

    setVisitorType('Student');

    setSelectedStudentId('');

    setStudentSearch('');

    setEmployeeName('');

    setEmployeeType('Teacher');

    setSubject('');

    setReason('');

    setTemp('');

    setBp('');

    setO2('');

    setWeight('');

    setMedicine('');

    setStatus('Returned to Class');
  };

  // ======================
  // SELECT STUDENT
  // ======================

  const selectStudent = (student: Student) => {

    setSelectedStudentId(student.id);

    setStudentSearch(student.name);

    setShowStudentList(false);
  };

  // ======================
  // EDIT
  // ======================

  const startEdit = (v: Visit) => {

    setEditingId(v.id);

    setVisitorType(
      v.visitor_type === 'Employee'
        ? 'Employee'
        : 'Student'
    );

    // STUDENT
    if (v.visitor_type !== 'Employee') {

      setSelectedStudentId(v.student_id || '');

      setStudentSearch(
        v.students?.name || ''
      );
    }

    // EMPLOYEE
    if (v.visitor_type === 'Employee') {

      setEmployeeName(v.full_name || '');

      setEmployeeType(
        v.employee_type || 'Teacher'
      );
    }

    setSubject(v.subject_at_time);

    setReason(v.reason);

    setTemp(v.temperature || '');

    setBp(v.blood_pressure || '');

    setO2(v.oxygen_saturation || '');

    setWeight(v.weight || '');

    setMedicine(v.medicine_given || '');

    setStatus(v.status);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // ======================
  // DELETE
  // ======================

  const handleDelete = async (
    id: string
  ) => {

    if (confirm('Delete this log?')) {

      await supabase
        .from('visits')
        .delete()
        .eq('id', id);

      fetchInitialData();
    }
  };

  // ======================
  // UI
  // ======================

  return (

    <div className="flex min-h-screen bg-slate-50 text-black">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 space-y-8 sticky h-screen top-0 shadow-2xl">

        <div className="flex items-center gap-3 px-2">

          <div className="bg-[#14B8A6] p-2 rounded-xl">
            <Activity size={24} />
          </div>

          <h1 className="text-xl font-black uppercase">
            QNHS Clinic
          </h1>
        </div>

        <nav className="flex-1 space-y-2 font-bold">

          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:bg-slate-800 rounded-2xl"
          >
            <LayoutDashboard size={20}/>
            Dashboard
          </button>

          <button className="flex items-center gap-3 w-full p-3.5 bg-[#14B8A6] rounded-2xl">
            <PlusCircle size={20}/>
            Log Visit
          </button>

          <button
            onClick={() => router.push('/students')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:bg-slate-800 rounded-2xl"
          >
            <Users size={20}/>
            Students
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-3 w-full p-3.5 text-slate-400 hover:bg-slate-800 rounded-2xl"
          >
            <FileText size={20}/>
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
          className="flex items-center gap-3 text-red-400"
        >
          <LogOut size={20}/>
          Sign Out
        </button>

      </aside>

      {/* MAIN */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <header className="mb-10">

          <h1 className="text-4xl font-black text-slate-800">
            {editingId
              ? 'Modify Clinic Record'
              : 'Clinic Visit Intake'}
          </h1>

          <p className="text-slate-500 uppercase text-xs tracking-widest font-bold mt-2">
            Student & Employee Health Logging
          </p>

        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* FORM */}
          <div className="lg:col-span-4">

            <form
              onSubmit={handleSubmit}
              className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-4 sticky top-8"
            >

              {/* VISITOR TYPE */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Visitor Type
                </label>

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setVisitorType('Student')
                    }
                    className={`p-4 rounded-2xl font-black transition-all ${
                      visitorType === 'Student'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <UserSquare2 size={18}/>
                      Student
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setVisitorType('Employee')
                    }
                    className={`p-4 rounded-2xl font-black transition-all ${
                      visitorType === 'Employee'
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Briefcase size={18}/>
                      Employee
                    </div>
                  </button>

                </div>
              </div>

              {/* STUDENT */}
              {visitorType === 'Student' && (

                <div className="relative">

                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Student Selection
                  </label>

                  <div className="relative">

                    <Search
                      className="absolute left-4 top-3.5 text-slate-300"
                      size={18}
                    />

                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#14B8A6]"
                      placeholder="Search student..."
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

                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-64 overflow-y-auto">

                      {filteredStudents.map(s => (

                        <div
                          key={s.id}
                          onClick={() =>
                            selectStudent(s)
                          }
                          className="p-4 hover:bg-teal-50 cursor-pointer border-b"
                        >
                          <p className="font-black">
                            {s.name}
                          </p>

                          <p className="text-xs text-slate-400 uppercase">
                            {s.student_id}
                          </p>
                        </div>

                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* EMPLOYEE */}
              {visitorType === 'Employee' && (

                <>
                  <div>

                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                      Employee Name
                    </label>

                    <input
                      className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter employee name"
                      value={employeeName}
                      onChange={(e) =>
                        setEmployeeName(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>

                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                      Employee Type
                    </label>

                    <select
                      className="w-full border border-slate-100 bg-slate-50 p-3.5 rounded-2xl font-bold outline-none"
                      value={employeeType}
                      onChange={(e) =>
                        setEmployeeType(
                          e.target.value
                        )
                      }
                    >
                      <option>Teacher</option>
                      <option>Staff</option>
                      <option>Nurse</option>
                      <option>Security</option>
                      <option>Utility</option>
                    </select>
                  </div>
                </>
              )}

              {visitCount > 2 &&
                visitorType === 'Student' && (

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700 text-xs font-black uppercase">
                  <AlertCircle size={18}/>
                  Frequent Visitor:
                  {visitCount} Records
                </div>
              )}

              {/* VITALS */}
              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Temp °C
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                    value={temp}
                    onChange={(e) =>
                      setTemp(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    BP
                  </label>

                  <input
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                    value={bp}
                    onChange={(e) =>
                      setBp(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    SpO2 %
                  </label>

                  <input
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                    value={o2}
                    onChange={(e) =>
                      setO2(e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                    Weight
                  </label>

                  <input
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                    value={weight}
                    onChange={(e) =>
                      setWeight(e.target.value)
                    }
                  />
                </div>

              </div>

              {/* MEDICINE */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Medicine Given
                </label>

                <input
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                  value={medicine}
                  onChange={(e) =>
                    setMedicine(e.target.value)
                  }
                />
              </div>

              {/* STATUS */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Status
                </label>

                <select
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >
                  <option>
                    Returned to Class
                  </option>

                  <option>
                    Resting in Clinic
                  </option>

                  <option>
                    Sent Home
                  </option>
                </select>
              </div>

              {/* SUBJECT */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Subject
                </label>

                <input
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  required
                />
              </div>

              {/* REASON */}
              <div>

                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Reason
                </label>

                <textarea
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-[#14B8A6] text-white font-black uppercase tracking-widest"
              >
                {loading
                  ? 'Please wait...'
                  : editingId
                  ? 'Update Record'
                  : 'Record Visit'}
              </button>

            </form>
          </div>

          {/* TABLE */}
          <div className="lg:col-span-8">

            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">

              <table className="w-full">

                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black">

                  <tr>

                    <th className="px-8 py-6 text-left">
                      Visitor
                    </th>

                    <th className="px-6 py-6 text-center">
                      Type
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
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {visits.map((v) => (

                    <tr
                      key={v.id}
                      className="hover:bg-slate-50"
                    >

                      {/* VISITOR */}
                      <td className="px-8 py-6">

                        <p className="font-black text-slate-800 text-lg">

                          {v.visitor_type === 'Employee'
                            ? v.full_name
                            : v.students?.name}

                        </p>

                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">

                          {v.visitor_type === 'Employee'
                            ? v.employee_type
                            : formatGrade(
                                v.students?.grade_level || ''
                              )}

                          {' • '}

                          {v.subject_at_time}

                        </p>

                      </td>

                      {/* TYPE */}
                      <td className="px-6 py-6 text-center">

                        <span className={`px-4 py-2 rounded-xl text-xs font-black ${
                          v.visitor_type === 'Employee'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>

                          {v.visitor_type || 'Student'}

                        </span>

                      </td>

                      {/* VITALS */}
                      <td className="px-6 py-6 text-center text-xs font-black">

                        <div>
                          {v.temperature || '--'}°C
                        </div>

                        <div>
                          {v.blood_pressure || '--'}
                        </div>

                        <div className="text-slate-400">
                          {v.oxygen_saturation || '--'}%
                          {' • '}
                          {v.weight || '--'}kg
                        </div>

                      </td>

                      {/* MEDICINE */}
                      <td className="px-6 py-6 text-center">

                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">

                          <Pill size={14}/>

                          {v.medicine_given || 'None'}

                        </div>

                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-6 text-center">

                        <span className={`px-4 py-2 rounded-xl text-xs font-black ${
                          v.status === 'Sent Home'
                            ? 'bg-red-100 text-red-600'
                            : v.status === 'Resting in Clinic'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-teal-100 text-teal-600'
                        }`}>

                          {v.status}

                        </span>

                      </td>

                      {/* ACTIONS */}
                      <td className="px-8 py-6">

                        <div className="flex justify-end gap-2">

                          <button
                            onClick={() =>
                              generateSlip(v)
                            }
                            className="p-2.5 text-slate-500 hover:text-teal-500"
                          >
                            <Printer size={18}/>
                          </button>

                          <button
                            onClick={() =>
                              startEdit(v)
                            }
                            className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl"
                          >
                            <Edit3 size={18}/>
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(v.id)
                            }
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={18}/>
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}