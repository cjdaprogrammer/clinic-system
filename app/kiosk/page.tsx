'use client';

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
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [strand, setStrand] = useState('');
  const [section, setSection] = useState('');
  const [reason, setReason] = useState('');
  const [subject, setSubject] = useState('');

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [message, setMessage] = useState('');

  // LIVE DATE & TIME
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // AUTO FILL STUDENT INFO
  const handleIdChange = async (id: string) => {
    setStudentId(id);

    if (id.trim().length > 3) {
      const { data } = await supabase
        .from('students')
        .select('name, grade_level, section, strand')
        .ilike('student_id', id.trim())
        .maybeSingle();

      if (data) {
        setFullName(data.name || '');
        setGradeLevel(data.grade_level || '');
        setSection(data.section || '');
        setStrand(data.strand || '');
      }
    }
  };

  const handleGradeChange = (val: string) => {
    setGradeLevel(val);

    if (val !== '11' && val !== '12') {
      setStrand('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus('loading');

    try {
      // CHECK IF STUDENT EXISTS
      let { data: student, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .ilike('student_id', studentId.trim())
        .maybeSingle();

      if (fetchError) throw fetchError;

      let finalStudentUuid;

      // IF STUDENT EXISTS
      if (student) {
        finalStudentUuid = student.id;
      } else {
        // CREATE NEW STUDENT
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert([
            {
              student_id: studentId.trim(),
              name: fullName.trim(),
              grade_level: gradeLevel,
              section: section.trim(),
              strand: strand,
              is_high_risk: false
            }
          ])
          .select('id')
          .single();

        if (insertError) throw insertError;

        finalStudentUuid = newStudent.id;
      }

      // INSERT VISIT
      const { error: visitError } = await supabase
        .from('visits')
        .insert([
          {
            student_id: finalStudentUuid,
            reason: reason.trim(),
            subject_at_time: subject.trim(),
            status: 'Waiting',
            visit_time: new Date().toISOString()
          }
        ]);

      if (visitError) throw visitError;

      setStatus('success');

      setMessage(
        `Done! Please wait for the nurse, ${
          fullName.trim().split(' ')[0]
        }.`
      );

      setTimeout(() => {
        setStudentId('');
        setFullName('');
        setGradeLevel('');
        setStrand('');
        setSection('');
        setReason('');
        setSubject('');
        setStatus('idle');
      }, 4000);
    } catch (err: any) {
      console.error('KIOSK ERROR:', err);

      setStatus('error');

      setMessage(
        err.message || 'System error. Please notify clinic staff.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 font-sans tracking-tight">
      <div className="max-w-2xl w-full bg-[#1E293B] p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-700/50">

        <div className="flex flex-col items-center mb-8 text-center">

          <div className="bg-[#14B8A6] p-4 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
            <Activity size={40} className="text-white" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter">
            QNHS Clinic
          </h1>

          <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest">
            Student Intake Kiosk
          </p>

          {/* DATE & TIME */}
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

        {status === 'success' ? (
          <div className="text-center py-20">
            <CheckCircle2
              size={100}
              className="text-[#14B8A6] mx-auto mb-6"
            />

            <p className="text-3xl font-black leading-tight">
              {message}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="kiosk-label">Student ID</label>

                <input
                  required
                  className="kiosk-input"
                  placeholder="2024-0001"
                  value={studentId}
                  onChange={(e) => handleIdChange(e.target.value)}
                />
              </div>

              <div>
                <label className="kiosk-label">Full Name</label>

                <input
                  required
                  className="kiosk-input"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="kiosk-label">Grade Level</label>

                <select
                  required
                  className="kiosk-input"
                  value={gradeLevel}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  <option value="">Select Grade</option>

                  {[7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g.toString()}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>

              {(gradeLevel === '11' || gradeLevel === '12') && (
                <div>
                  <label className="kiosk-label">Strand</label>

                  <select
                    required
                    className="kiosk-input"
                    value={strand}
                    onChange={(e) => setStrand(e.target.value)}
                  >
                    <option value="">Select Strand</option>
                    <option value="STEM">STEM</option>
                    <option value="ABM">ABM</option>
                    <option value="HUMSS">HUMSS</option>
                    <option value="TVL-ICT">TVL-ICT</option>
                    <option value="TVL-HE">TVL-HE</option>
                  </select>
                </div>
              )}

              <div>
                <label className="kiosk-label">Section</label>

                <input
                  required
                  className="kiosk-input"
                  placeholder="Newton"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>

              <div>
                <label className="kiosk-label">
                  Current Subject
                </label>

                <input
                  required
                  className="kiosk-input"
                  placeholder="Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="kiosk-label">
                  Reason for Visit
                </label>

                <textarea
                  required
                  rows={2}
                  className="kiosk-input resize-none"
                  placeholder="How are you feeling?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-3 text-red-400 font-bold bg-red-400/10 p-4 rounded-2xl border border-red-400/20 text-sm">
                <AlertCircle size={20} />
                {message}
              </div>
            )}

            <button
              disabled={status === 'loading'}
              className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white p-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Confirm Log-in'
              )}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}