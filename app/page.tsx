'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct!
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PlusCircle, Users, LogOut, Search, Clock, 
  BookOpen, Activity, Stethoscope, Thermometer, HeartPulse, 
  AlertTriangle, ChevronRight, FileText, Download, 
  Printer, AlertCircle 
} from 'lucide-react'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ADDED TYPES TO FIX ERRORS ---
interface Student {
  name: string;
  grade_level: string;
  is_high_risk: boolean;
}

interface Visit {
  id: string;
  student_id: string;
  visit_time: string;
  subject_at_time: string;
  reason: string;
  temperature: string;
  blood_pressure: string;
  status: string;
  students: Student; // This matches your Supabase join
}

export default function ClinicDashboard() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]); // Use the Visit type
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .select('*, students(name, grade_level, is_high_risk)')
      .order('visit_time', { ascending: false });

    if (visitError) {
      console.error("VISIT FETCH ERROR:", visitError.message);
    } else {
      setVisits((visitData as any) || []);
    }

    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      setTotalStudents(count || 0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
        { event: '*', schema: 'public', table: 'visits' }, 
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
    return grade.toLowerCase().includes('grade') ? grade : `Grade ${grade}`;
  };

  const generateStudentReport = (studentId: string, studentName: string) => {
    const doc = new jsPDF();
    const studentHistory = visits.filter(v => v.student_id === studentId);

    doc.setFontSize(20);
    doc.text("QNHS SCHOOL CLINIC", 105, 20, { align: 'center' });
    
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Subject', 'Reason', 'Vitals', 'Outcome']],
      body: studentHistory.map(v => [
        new Date(v.visit_time).toLocaleDateString(),
        v.subject_at_time,
        v.reason,
        `${v.temperature || '--'}°C / ${v.blood_pressure || '--'} BP`,
        v.status || 'Returned to Class'
      ]),
    });
    doc.save(`${studentName.replace(/\s+/g, '_')}_Clinic_Report.pdf`);
  };

  const getTopSubject = () => {
    if (visits.length === 0) return "---";
    const counts: Record<string, number> = {};
    visits.forEach(v => {
      const s = v.subject_at_time || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const filteredVisits = visits.filter((visit) => {
    const studentName = visit.students?.name?.toLowerCase() || '';
    const subject = visit.subject_at_time?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return studentName.includes(query) || subject.includes(query);
  });

  const sentHomeCount = visits.filter(v => v.status === 'Sent Home').length;

  if (loading) return <div className="p-10 font-bold">Loading Dashboard...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* ... (Your Sidebar and JSX remains exactly the same) ... */}
    </div>
  );
}