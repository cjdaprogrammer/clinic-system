'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock3,
  CalendarDays
} from 'lucide-react';

export default function StudentKiosk() {

  // =========================
  // MAIN STATES
  // =========================
  const [visitorType, setVisitorType] = useState('Student');

  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [strand, setStrand] = useState('');
  const [section, setSection] = useState('');

  // NEW STATES
  const [employeeType, setEmployeeType] = useState('');
  const [gender, setGender] = useState('');

  const [reason, setReason] = useState('');
  const [subject, setSubject] = useState('');

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [message, setMessage] = useState('');

  // =========================
  // LIVE DATE & TIME
  // =========================
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================
  // AUTO FILL STUDENT INFO
  // =========================
  const handleIdChange = async (id: string) => {
    setStudentId(id);

    if (visitorType !== 'Student') return;

    if (id.trim().length > 3) {

      const { data } = await supabase
        .from('students')
        .select(`
          name,
          grade_level,
          section,
          strand,
          gender
        `)
        .ilike('student_id', id.trim())
        .maybeSingle();

      if (data) {
        setFullName(data.name || '');
        setGradeLevel(data.grade_level || '');
        setSection(data.section || '');
        setStrand(data.strand || '');
        setGender(data.gender || '');
      }
    }
  };

  // =========================
  // GRADE CHANGE
  // =========================
  const handleGradeChange = (val: string) => {
    setGradeLevel(val);

    if (val !== '11' && val !== '12') {
      setStrand('');
    }
  };

  // =========================
  // SUBMIT FORM
  // =========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus('loading');

    try {

      let finalStudentUuid = null;

      // =========================
      // STUDENT FLOW
      // =========================
      if (visitorType === 'Student') {

        let { data: student, error: fetchError } = await supabase
          .from('students')
          .select('id')
          .ilike('student_id', studentId.trim())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (student) {

          finalStudentUuid = student.id;

        } else {

          const { data: newStudent, error: insertError } = await supabase
            .from('students')
            .insert([{
              student_id: studentId.trim(),
              name: fullName.trim(),
              grade_level: gradeLevel,
              section: section.trim(),
              strand: strand,
              gender: gender,
              is_high_risk: false
            }])
            .select('id')
            .single();

          if (insertError) {

            if (insertError.code === '23505') {

              const { data: retryStudent } = await supabase
                .from('students')
                .select('id')
                .ilike('student_id', studentId.trim())
                .single();

              finalStudentUuid = retryStudent?.id;

            } else {

              throw insertError;

            }

          } else {

            finalStudentUuid = newStudent.id;

          }
        }
      }

      // =========================
      // CURRENT DATE & TIME
      // =========================
      const currentDateTime = new Date();

      const formattedDate = currentDateTime.toLocaleDateString(
        'en-PH',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

      const formattedTime = currentDateTime.toLocaleTimeString(
        'en-PH',
        {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }
      );

      // =========================
      // LOG CLINIC VISIT
      // =========================
      const { error: visitError } = await supabase
        .from('visits')
        .insert([{

          student_id: finalStudentUuid,

          // VISITOR DETAILS
          visitor_type: visitorType,

          employee_type:
            visitorType === 'Employee'
              ? employeeType
              : null,

          gender: gender,

          full_name: fullName.trim(),

          // CLINIC DETAILS
          reason: reason.trim(),

          subject_at_time:
            visitorType === 'Student'
              ? subject.trim()
              : 'N/A',

          status: 'Waiting',

          // EXACT DATE & TIME
          visit_time: currentDateTime.toISOString(),

          logged_date: formattedDate,

          logged_time: formattedTime,

          logged_in_at:
            `${formattedDate} • ${formattedTime}`

        }]);

      if (visitError) throw visitError;

      // =========================
      // SUCCESS
      // =========================
      setStatus('success');

      setMessage(
        `Done! Please wait for the nurse, ${
          fullName.trim().split(' ')[0]
        }.`
      );

      // RESET FORM
      setTimeout(() => {

        setVisitorType('Student');

        setStudentId('');
        setFullName('');
        setGradeLevel('');
        setStrand('');
        setSection('');

        setEmployeeType('');
        setGender('');

        setReason('');
        setSubject('');

        setStatus('idle');

      }, 4000);

    } catch (err: any) {

      console.error('KIOSK ERROR:', err);

      setStatus('error');

      setMessage(
        err.message ||
        'System error. Please notify the clinic staff.'
      );
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 font-sans tracking-tight">

      <div className="max-w-2xl w-full bg-[#1E293B] p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-700/50">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-8 text-center">

          <div className="bg-[#14B8A6] p-4 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
            <Activity size={40} className="text-white" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter">
            QNHS Clinic
          </h1>

          <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest">
            Student & Employee Intake Kiosk
          </p>

          {/* LIVE DATE & TIME */}
          <div className="mt-6 grid grid-cols-2 gap-4 w-full">

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-3">
              <CalendarDays className="text-teal-400" size={24} />

              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                  Current Date
                </p>

                <p className="font-black text-lg text-white">
                  {currentTime.toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-3">
              <Clock3 className="text-teal-400" size={24} />

              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                  Current Time
                </p>

                <p className="font-black text-lg text-white">
                  {currentTime.toLocaleTimeString('en-PH', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* SUCCESS */}
        {status === 'success' ? (

          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">

            <CheckCircle2
              size={100}
              className="text-[#14B8A6] mx-auto mb-6"
            />

            <p className="text-3xl font-black leading-tight">
              {message}
            </p>

          </div>

        ) : (

          // FORM
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* YOUR EXISTING FORM CONTENT HERE */}

            {/* ERROR */}
            {status === 'error' && (
              <div className="flex items-center gap-3 text-red-400 font-bold bg-red-400/10 p-4 rounded-2xl border border-red-400/20 text-sm">

                <AlertCircle size={20} />

                {message}

              </div>
            )}

            {/* BUTTON */}
            <button
              disabled={status === 'loading'}
              className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white p-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
            >

              {status === 'loading'
                ? <Loader2 className="animate-spin" />
                : 'Confirm Log-in'}

            </button>

          </form>
        )}

      </div>
    </div>
  );
}