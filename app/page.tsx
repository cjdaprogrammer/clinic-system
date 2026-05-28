'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard,
  PlusCircle,
  Users,
  LogOut,
  Search,
  Clock,
  FileText
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface Student {
  name: string;
  grade_level: string;
  is_high_risk: boolean;
}

interface Visit {
  id: string;

  student_id: string;

  visit_time: string;

  // LOGIN TIME
  logged_in_at?: string;

  // EMPLOYEE FIELDS
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
        "VISIT FETCH ERROR:",
        visitError.message
      );

    } else {

      setVisits((visitData as any) || []);

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


  const formatGrade = (grade: string) => {

    if (!grade) return 'N/A';

    return grade.toLowerCase().includes('grade')
      ? grade
      : `Grade ${grade}`;
  };

  const formatLoginTime = (visit: Visit) => {

    return (
      visit.logged_in_at ||
      new Date(visit.visit_time).toLocaleString()
    );
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
      "QNHS SCHOOL CLINIC",
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

        formatLoginTime(v),

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

      const studentName =
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
        studentName.includes(query) ||
        subject.includes(query)
      );
    }
  );


  if (loading) {

    return (
      <div className="p-10 font-bold">
        Loading Dashboard...
      </div>
    );
  }


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

      {/* TABLE */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>

              <th className="text-left px-6 py-5">
                Visitor
              </th>

              <th className="text-left px-6 py-5">
                Login Time
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

            {filteredVisits.map((v) => (

              <tr
                key={v.id}
                className="border-t hover:bg-slate-50 transition-all"
              >

                {/* VISITOR */}
                <td className="px-6 py-5">

                  <div>

                    <div className="flex items-center gap-2">

                      <p className="font-black text-slate-800">

                        {
                          v.visitor_type === 'Employee'
                            ? v.full_name
                            : v.students?.name
                        }

                      </p>

                      {v.visitor_type === 'Employee' && (

                        <span className="bg-blue-100 text-blue-600 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">

                          Employee

                        </span>

                      )}

                    </div>

                    <p className="text-xs text-slate-500 mt-1">

                      {
                        v.visitor_type === 'Employee'
                          ? `${v.employee_type || 'Staff'}`
                          : formatGrade(
                              v.students?.grade_level || ''
                            )
                      }

                    </p>

                  </div>

                </td>

                {/* LOGIN TIME */}
                <td className="px-6 py-5">

                  <div className="flex items-center gap-2 text-teal-600 font-bold text-sm">

                    <Clock size={15} />

                    {formatLoginTime(v)}

                  </div>

                </td>

                {/* SUBJECT */}
                <td className="px-6 py-5">

                  {
                    v.visitor_type === 'Employee'
                      ? 'N/A'
                      : v.subject_at_time
                  }

                </td>

                {/* REASON */}
                <td className="px-6 py-5">

                  {v.reason}

                </td>

                {/* VITALS */}
                <td className="px-6 py-5">

                  <div className="space-y-1 text-sm">

                    <div>
                      Temp:
                      {' '}
                      {v.temperature || '--'}°C
                    </div>

                    <div>
                      BP:
                      {' '}
                      {v.blood_pressure || '--'}
                    </div>

                  </div>

                </td>

                {/* STATUS */}
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

                {/* PDF */}
                <td className="px-6 py-5">

                  <button
                    onClick={() =>
                      generateStudentReport(
                        v.student_id,
                        v.visitor_type === 'Employee'
                          ? v.full_name || 'Employee'
                          : v.students?.name || 'Student'
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

    </div>
  );
}