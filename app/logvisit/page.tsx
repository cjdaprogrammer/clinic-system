'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, PlusCircle, Users, LogOut, Trash2, Edit3,
  AlertCircle, Activity, Thermometer, HeartPulse, Search,
  FileText, Printer, Droplets, Scale, Pill
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------- TYPES ----------------

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
  } | null;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
}

// ---------------- COMPONENT ----------------

export default function LogVisitPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

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

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);

  // ---------------- AUTH CHECK ----------------

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
      else fetchInitialData();
    };
    checkUser();
  }, [router]);

  // ---------------- FETCH DATA ----------------

  async function fetchInitialData() {
    const { data: stds } = await supabase
      .from('students')
      .select('id, name, student_id, grade_level')
      .order('name', { ascending: true });

    const { data: vsts } = await supabase
      .from('visits')
      .select('*, students(name, grade_level)')
      .order('visit_time', { ascending: false });

    const { data: emps } = await supabase
      .from('employees')
      .select('id, name, position, department')
      .order('name', { ascending: true });

    if (stds) setStudents(stds);
    if (vsts) setVisits(vsts as unknown as Visit[]);
    if (emps) setEmployees(emps);
  }

  // ---------------- HELPERS ----------------

  const formatGrade = (grade: string) =>
    !grade ? 'N/A' :
    grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // ---------------- VISIT COUNT ----------------

  useEffect(() => {
    if (selectedStudentId) {
      setVisitCount(visits.filter(v => v.student_id === selectedStudentId).length);
    } else {
      setVisitCount(0);
    }
  }, [selectedStudentId, visits]);

  // ---------------- PDF ----------------

  const generateSlip = (visit: Visit) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("QNHS CLINIC PASS", 105, 20, { align: 'center' });

    autoTable(doc, {
      startY: 35,
      body: [
        ['Student Name', visit.students?.name],
        ['Grade', formatGrade(visit.students?.grade_level || '')],
        ['Subject', visit.subject_at_time],
        ['Vitals', `${visit.temperature || '--'}°C | ${visit.blood_pressure || '--'} BP | ${visit.oxygen_saturation || '--'}% SpO2`],
        ['Weight', `${visit.weight || '--'} kg`],
        ['Medicine', visit.medicine_given || 'None'],
        ['Reason', visit.reason],
        ['Status', visit.status],
      ],
    });

    doc.save(`Clinic_Slip_${visit.students?.name}.pdf`);
  };

  // ---------------- SUBMIT ----------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return alert("Select a student");

    setLoading(true);

    const payload = {
      student_id: selectedStudentId,
      subject_at_time: subject,
      reason,
      temperature: temp || null,
      blood_pressure: bp || null,
      oxygen_saturation: o2 || null,
      weight: weight || null,
      medicine_given: medicine || null,
      status
    };

    const { error } = editingId
      ? await supabase.from('visits').update(payload).eq('id', editingId)
      : await supabase.from('visits').insert([payload]);

    if (!error) {
      resetForm();
      fetchInitialData();
    } else {
      alert(error.message);
    }

    setLoading(false);
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

  const selectStudent = (s: Student) => {
    setSelectedStudentId(s.id);
    setStudentSearch(s.name);
    setShowStudentList(false);
  };

  const startEdit = (v: Visit) => {
    setEditingId(v.id);
    setSelectedStudentId(v.student_id);
    setStudentSearch(v.students?.name || '');
    setSubject(v.subject_at_time);
    setReason(v.reason);
    setTemp(v.temperature || '');
    setBp(v.blood_pressure || '');
    setO2(v.oxygen_saturation || '');
    setWeight(v.weight || '');
    setMedicine(v.medicine_given || '');
    setStatus(v.status);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this log?")) {
      await supabase.from('visits').delete().eq('id', id);
      fetchInitialData();
    }
  };

  // ---------------- SAFE TEMP CHECK ----------------

  const safeTemp = (t: string | null) => Number(t ?? 0);

  // ---------------- UI ----------------

  return (
    <div className="flex min-h-screen bg-slate-50 text-black">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] text-white p-6">
        <div className="flex items-center gap-2 mb-10">
          <Activity /> <span className="font-bold">QNHS Clinic</span>
        </div>

        <button onClick={() => router.push('/')} className="block mb-3">Dashboard</button>
        <button className="block mb-3">Log Visit</button>
        <button onClick={() => router.push('/students')} className="block mb-3">Students</button>
        <button onClick={() => router.push('/reports')} className="block mb-3">Reports</button>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="text-red-400 mt-10"
        >
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6">

        {/* VISITS TABLE */}
        <h2 className="text-xl font-bold mb-4">Visits</h2>

        <table className="w-full bg-white rounded-lg">
          <thead>
            <tr>
              <th>Student</th>
              <th>Vitals</th>
              <th>Medicine</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visits.map(v => (
              <tr key={v.id} className="border-t">
                <td className="p-2 font-bold">{v.students?.name}</td>

                <td className="p-2 text-sm">
                  <div className={safeTemp(v.temperature) >= 37.5 ? 'text-red-500' : ''}>
                    {v.temperature}°C | {v.blood_pressure}
                  </div>
                  <div className="text-xs text-gray-500">
                    {v.oxygen_saturation || '--'}% | {v.weight || '--'}kg
                  </div>
                </td>

                <td className="p-2">{v.medicine_given || 'None'}</td>
                <td className="p-2">{v.status}</td>

                <td className="p-2 flex gap-2">
                  <button onClick={() => generateSlip(v)}>Print</button>
                  <button onClick={() => startEdit(v)}>Edit</button>
                  <button onClick={() => handleDelete(v.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* EMPLOYEE TABLE (NEW) */}
        <h2 className="text-xl font-bold mt-10 mb-4">Employees</h2>

        <table className="w-full bg-white rounded-lg">
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Department</th>
            </tr>
          </thead>

          <tbody>
            {employees.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2 font-bold">{e.name}</td>
                <td className="p-2">{e.position}</td>
                <td className="p-2">{e.department}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </main>
    </div>
  );
}