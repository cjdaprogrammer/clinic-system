'use client'

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  LogOut,
  Search,
  Clock,
  FileText
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =========================
// TYPES
// =========================
interface Student {
  name: string;
  grade_level: string;
  is_high_risk: boolean;
}

interface Visit {
  id: string;

  student_id: string;

  visit_time: string;

  logged_in_at?: string;

  full_name?: string;

  visitor_type?: string;

  employee_type?: string;

  subject_at_time: string;

  reason: string;

  temperature: string;

  blood_pressure: string;

  status: string;

  students?: Student;
}

export default function ClinicDashboard() {

  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);

  const [loading, setLoading] = useState(true);

  const [totalStudents, setTotalStudents] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');

  // =========================
  // FETCH DATA
  // =========================
  const fetchData = useCallback(async () => {

    setLoading(true);

    const {
      data: visitData,
      error: visitError
    } = await supabase
      .from('visits')
      .select(`
        *,
        students(
          name,
          grade_level,
          is_high_risk
        )
      `)
      .order('visit_time', {
        ascending: false
      });

    if (visitError) {

      console.error(
        'VISIT FETCH ERROR:',
        visitError.message
      );

    } else {

      setVisits((visitData as Visit[]) || []);

    }

    const {
      count,
      error: countError
    } = await supabase
      .from('students')
      .select('*', {
        count: 'exact',
        head: true
      });

    if (!countError) {
      setTotalStudents(count || 0);
    }

    setLoading(false);

  }, []);

  // =========================
  // AUTH CHECK
  // =========================
  useEffect(() => {

    const checkUser = async () => {

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {

        router.push('/login');

      } else {

        fetchData();

      }
    };

    checkUser();

  }, [router, fetchData]);

  // =========================
  // REALTIME
  // =========================
  useEffect(() => {

    const channel = supabase
      .channel('clinic-updates-channel')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits'
        },
        () => {
          fetchData();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchData]);

  // =========================
  // HELPERS
  // =========================
  const formatGrade = (grade: string) => {

    if (!grade) return 'N/A';

    return grade.toLowerCase().includes('grade')
      ? grade
      : `Grade ${grade}`;
  };

  // =========================
  // FORMAT LOGIN TIME
  // =========================
  const formatLoginTime = (visit: Visit) => {

    if (visit.logged_in_at) {

      return visit.logged_in_at;

    }

    if (!visit.visit_time) {

      return 'No Time Recorded';

    }

    return new Date(visit.visit_time)
      .toLocaleString('en-PH', {

        timeZone: 'Asia/Manila',

        year: 'numeric',

        month: 'long',

        day: 'numeric',

        hour: 'numeric',

        minute: '2-digit',

        second: '2-digit',

        hour12: true

      });
  };

  // =========================
  // PDF REPORT
  // =========================
  const generateStudentReport = (
    studentId: string,
    studentName: string
  ) => {

    const doc = new jsPDF();

    const studentHistory = visits.filter(
      v => v.student_id === studentId
    );

    doc.setFontSize(20);

    doc.text(
      'QNHS SCHOOL CLINIC',
      105,
      20,
      { align: 'center' }
    );

    autoTable(doc, {

      startY: 30,

      head: [[
        'Login Time',
        'Subject',
        'Reason',
        'Vitals',
        'Outcome'
      ]],

      body: studentHistory.map(v => [

        v.logged_in_at || formatLoginTime(v),

        v.subject_at_time,

        v.reason,

        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,

        v.status || 'Returned to Class'

      ]),
    });

    doc.save(
      `${studentName.replace(/\s+/g, '_')}_Clinic_Report.pdf`
    );
  };

  // =========================
  // SEARCH
  // =========================
  const filteredVisits = visits.filter(
    (visit) => {

      const visitorName =
        (
          visit.visitor_type === 'Employee'
            ? visit.full_name
            : visit.students?.name
        )?.toLowerCase() || '';

      const subject =
        visit.subject_at_time?.toLowerCase() || '';

      const query =
        searchQuery.toLowerCase();

      return (
        visitorName.includes(query) ||
        subject.includes(query)
      );
    }
  );

  // =========================
  // SEPARATE TABLES
  // =========================
  const studentVisits = filteredVisits.filter(
    (v) => v.visitor_type !== 'Employee'
  );

  const employeeVisits = filteredVisits.filter(
    (v) => v.visitor_type === 'Employee'
  );

  // =========================
  // LOADING
  // =========================
  if (loading) {

    return (
      <div className="p-10 font-bold">
        Loading Dashboard...
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (

    <div className="min-h-screen bg-slate-50 p-10">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">

        <div>

          <h1 className="text-4xl font-black">
            QNHS Clinic Dashboard
          </h1>

          <p className="text-slate-500 font-semibold mt-2">
            Student & Employee Monitoring System
          </p>

        </div>

        <button
          onClick={() =>
            supabase.auth
              .signOut()
              .then(() => router.push('/login'))
          }
          className="bg-red-500 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2"
        >

          <LogOut size={18} />

          Logout

        </button>

      </div>

      {/* SEARCH */}
      <div className="mb-8">

        <div className="bg-white rounded-2xl border p-4 flex items-center gap-3">

          <Search size={18} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search student, employee or subject..."
            className="outline-none w-full"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
          />

        </div>

      </div>

      {/* STUDENTS TABLE */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border mb-10">

        <div className="px-6 py-5 border-b bg-slate-100">

          <h2 className="text-2xl font-black">
            Students
          </h2>

        </div>

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr>

              <th className="text-left px-6 py-5">
                Student
              </th>

              <th className="text-left px-6 py-5">
                Login Time & Date
              </th>

              <th className="text-left px-6 py-5">
                Subject
              </th>

              <th className="text-left px-6 py-5">
                Reason
              </th>

              <th className="text-left px-6 py-5">
                Vitals
              </th>

              <th className="text-left px-6 py-5">
                Status
              </th>

              <th className="text-left px-6 py-5">
                PDF
              </th>

            </tr>

          </thead>

          <tbody>

            {studentVisits.map((v) => (

              <tr
                key={v.id}
                className="border-t hover:bg-slate-50 transition-all"
              >

                <td className="px-6 py-5">

                  <div>

                    <p className="font-black text-slate-800">

                      {v.students?.name}

                    </p>

                    <p className="text-xs text-slate-500 mt-1">

                      {formatGrade(
                        v.students?.grade_level || ''
                      )}

                    </p>

                  </div>

                </td>

                <td className="px-6 py-5">

                  <div className="flex flex-col">

                    <div className="flex items-center gap-2 text-teal-600 font-black text-sm">

                      <Clock size={15} />

                      {formatLoginTime(v)}

                    </div>

                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                      Kiosk Login Record
                    </p>

                  </div>

                </td>

                <td className="px-6 py-5">
                  {v.subject_at_time}
                </td>

                <td className="px-6 py-5">
                  {v.reason}
                </td>

                <td className="px-6 py-5">

                  <div className="space-y-1 text-sm">

                    <div>
                      Temp: {v.temperature || '--'}°C
                    </div>

                    <div>
                      BP: {v.blood_pressure || '--'}
                    </div>

                  </div>

                </td>

                <td className="px-6 py-5">

                  <span className={`
                    px-4 py-2 rounded-xl text-xs font-black
                    ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-teal-100 text-teal-600'
                    }
                  `}>

                    {v.status}

                  </span>

                </td>

                <td className="px-6 py-5">

                  <button
                    onClick={() =>
                      generateStudentReport(
                        v.student_id,
                        v.students?.name || 'Student'
                      )
                    }
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                  >

                    <FileText size={15} />

                    Export

                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* EMPLOYEES TABLE */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border">

        <div className="px-6 py-5 border-b bg-slate-100">

          <h2 className="text-2xl font-black">
            Employees
          </h2>

        </div>

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr>

              <th className="text-left px-6 py-5">
                Employee Name
              </th>

              <th className="text-left px-6 py-5">
                Employee Type
              </th>

              <th className="text-left px-6 py-5">
                Login Time & Date
              </th>

              <th className="text-left px-6 py-5">
                Reason
              </th>

              <th className="text-left px-6 py-5">
                Vitals
              </th>

              <th className="text-left px-6 py-5">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {employeeVisits.map((v) => (

              <tr
                key={v.id}
                className="border-t hover:bg-slate-50 transition-all"
              >

                <td className="px-6 py-5 font-black">

                  {v.full_name}

                </td>

                <td className="px-6 py-5">

                  <span className={`
                    px-3 py-1 rounded-full text-xs font-black uppercase
                    ${
                      v.employee_type === 'Teaching'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }
                  `}>

                    {v.employee_type || 'Non-Teaching'}

                  </span>

                </td>

                <td className="px-6 py-5">

                  <div className="flex flex-col">

                    <div className="flex items-center gap-2 text-teal-600 font-black text-sm">

                      <Clock size={15} />

                      {formatLoginTime(v)}

                    </div>

                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                      Kiosk Login Record
                    </p>

                  </div>

                </td>

                <td className="px-6 py-5">

                  {v.reason}

                </td>

                <td className="px-6 py-5">

                  <div className="space-y-1 text-sm">

                    <div>
                      Temp: {v.temperature || '--'}°C
                    </div>

                    <div>
                      BP: {v.blood_pressure || '--'}
                    </div>

                  </div>

                </td>

                <td className="px-6 py-5">

                  <span className={`
                    px-4 py-2 rounded-xl text-xs font-black
                    ${
                      v.status === 'Sent Home'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-teal-100 text-teal-600'
                    }
                  `}>

                    {v.status}

                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

