'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock3,
  CalendarDays,
  UserRound,
  Briefcase,
  GraduationCap,
  Mail,
  Ticket
} from 'lucide-react';

type VisitorType = 'Student' | 'Employee';
type Gender = 'Male' | 'Female';
type EmployeeType = 'Teaching' | 'Non-Teaching';

export default function ClinicKiosk() {
  const [visitorType, setVisitorType] = useState<VisitorType>('Student');

  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [strand, setStrand] = useState('');
  const [section, setSection] = useState('');

  const [employeeType, setEmployeeType] = useState<EmployeeType | ''>('');

  const [reason, setReason] = useState('');
  const [subject, setSubject] = useState('');

  const [ticketNumber, setTicketNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const inputClass =
    'w-full h-[52px] rounded-2xl bg-slate-800/70 border border-slate-700 px-4 text-white placeholder:text-slate-500 font-bold outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all';

  const labelClass =
    'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateTicketNumber = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(100000 + Math.random() * 900000);

    return `QNHS-${y}${m}${d}-${random}`;
  };

  const resetFields = () => {
    setStudentId('');
    setFullName('');
    setEmail('');
    setGender('');
    setGradeLevel('');
    setStrand('');
    setSection('');
    setEmployeeType('');
    setReason('');
    setSubject('');
    setTicketNumber('');
  };

  const changeVisitorType = (type: VisitorType) => {
    setVisitorType(type);
    resetFields();
    setStatus('idle');
    setMessage('');
  };

  const handleIdChange = async (id: string) => {
    setStudentId(id);

    if (id.trim().length > 3) {
      const { data } = await supabase
        .from('students')
        .select('name, grade_level, section, strand, gender, email')
        .ilike('student_id', id.trim())
        .maybeSingle();

      if (data) {
        setFullName(data.name || '');
        setGradeLevel(data.grade_level || '');
        setSection(data.section || '');
        setStrand(data.strand || '');
        setGender(data.gender || '');
        setEmail(data.email || '');
      }
    }
  };

  const handleGradeChange = (val: string) => {
    setGradeLevel(val);

    if (val !== '11' && val !== '12') {
      setStrand('');
    }
  };

  const sendEmailNotification = async ({
    email,
    fullName,
    ticketNumber,
    visitorType,
    reason,
    visitTime
  }: {
    email: string;
    fullName: string;
    ticketNumber: string;
    visitorType: string;
    reason: string;
    visitTime: string;
  }) => {
    const res = await fetch('/api/send-visit-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        fullName,
        ticketNumber,
        visitorType,
        reason,
        visitTime
      })
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Email notification failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const newTicketNumber = generateTicketNumber();
    const visitTime = new Date().toISOString();

    try {
      let finalStudentUuid: string | null = null;

      if (visitorType === 'Student') {
        const { data: student, error: fetchError } = await supabase
          .from('students')
          .select('id')
          .ilike('student_id', studentId.trim())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (student) {
          finalStudentUuid = student.id;

          await supabase
            .from('students')
            .update({
              name: fullName.trim(),
              email: email.trim(),
              gender,
              grade_level: gradeLevel,
              section: section.trim(),
              strand: strand || null
            })
            .eq('id', student.id);
        } else {
          const { data: newStudent, error: insertError } = await supabase
            .from('students')
            .insert([
              {
                student_id: studentId.trim(),
                name: fullName.trim(),
                email: email.trim(),
                gender,
                grade_level: gradeLevel,
                section: section.trim(),
                strand: strand || null,
                is_high_risk: false
              }
            ])
            .select('id')
            .single();

          if (insertError) throw insertError;

          finalStudentUuid = newStudent.id;
        }
      }

      const { error: visitError } = await supabase
        .from('visits')
        .insert([
          {
            student_id: visitorType === 'Student' ? finalStudentUuid : null,
            visitor_type: visitorType,
            full_name: fullName.trim(),
            email: email.trim(),
            employee_type: visitorType === 'Employee' ? employeeType : null,
            gender,
            ticket_number: newTicketNumber,
            reason: reason.trim(),
            subject_at_time:
              visitorType === 'Student'
                ? subject.trim()
                : employeeType || 'Employee',
            status: 'Waiting',
            visit_time: visitTime
          }
        ]);

      if (visitError) throw visitError;

      await sendEmailNotification({
        email: email.trim(),
        fullName: fullName.trim(),
        ticketNumber: newTicketNumber,
        visitorType,
        reason: reason.trim(),
        visitTime: new Date(visitTime).toLocaleString('en-PH')
      });

      setTicketNumber(newTicketNumber);
      setStatus('success');

      setMessage(
        `Done! Your clinic number is ${newTicketNumber}. A confirmation was sent to ${email}.`
      );

      setTimeout(() => {
        resetFields();
        setStatus('idle');
      }, 6000);
    } catch (err: any) {
      console.error('KIOSK ERROR:', err);
      setStatus('error');
      setMessage(err.message || 'System error. Please notify clinic staff.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 font-sans tracking-tight">
      <div className="max-w-3xl w-full bg-[#1E293B] p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-700/50">

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-[#14B8A6] p-4 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
            <Activity size={40} className="text-white" />
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter">
            QNHS Clinic
          </h1>

          <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest">
            Clinic Intake Kiosk
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
            <CheckCircle2 size={100} className="text-[#14B8A6] mx-auto mb-6" />

            <p className="text-3xl font-black leading-tight">
              {message}
            </p>

            <div className="mt-6 bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center justify-center gap-3">
              <Ticket className="text-teal-400" />

              <p className="text-2xl font-black text-teal-400">
                {ticketNumber}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => changeVisitorType('Student')}
                className={`p-5 rounded-2xl border font-black flex items-center justify-center gap-3 ${
                  visitorType === 'Student'
                    ? 'bg-[#14B8A6] border-[#14B8A6] text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <GraduationCap />
                Student
              </button>

              <button
                type="button"
                onClick={() => changeVisitorType('Employee')}
                className={`p-5 rounded-2xl border font-black flex items-center justify-center gap-3 ${
                  visitorType === 'Employee'
                    ? 'bg-[#14B8A6] border-[#14B8A6] text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Briefcase />
                Employee
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {visitorType === 'Student' && (
                <div>
                  <label className={labelClass}>Student ID</label>

                  <input
                    required
                    className={inputClass}
                    placeholder="2024-0001"
                    value={studentId}
                    onChange={(e) => handleIdChange(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Full Name</label>

                <input
                  required
                  className={inputClass}
                  placeholder={visitorType === 'Student' ? 'Juan Dela Cruz' : 'Maria Santos'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>

                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={18}
                  />

                  <input
                    required
                    type="email"
                    className={`${inputClass} pl-12`}
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Gender</label>

                <select
                  required
                  className={inputClass}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {visitorType === 'Student' && (
                <>
                  <div>
                    <label className={labelClass}>Grade Level</label>

                    <select
                      required
                      className={inputClass}
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
                      <label className={labelClass}>Strand</label>

                      <select
                        required
                        className={inputClass}
                        value={strand}
                        onChange={(e) => setStrand(e.target.value)}
                      >
                        <option value="">Select Strand</option>
                        <option value="STEM">STEM</option>
                        <option value="ABM">ABM</option>
                        <option value="HUMSS">HUMSS</option>
                        <option value="GAS">GAS</option>
                        <option value="TVL-ICT">TVL-ICT</option>
                        <option value="TVL-HE">TVL-HE</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Section</label>

                    <input
                      required
                      className={inputClass}
                      placeholder="Newton"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Current Subject</label>

                    <input
                      required
                      className={inputClass}
                      placeholder="Mathematics"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </>
              )}

              {visitorType === 'Employee' && (
                <div>
                  <label className={labelClass}>Employee Type</label>

                  <select
                    required
                    className={inputClass}
                    value={employeeType}
                    onChange={(e) => setEmployeeType(e.target.value as EmployeeType)}
                  >
                    <option value="">Select Employee Type</option>
                    <option value="Teaching">Teaching Employee</option>
                    <option value="Non-Teaching">Non-Teaching Employee</option>
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className={labelClass}>Reason for Visit</label>

                <textarea
                  required
                  rows={3}
                  className={`${inputClass} h-auto min-h-[110px] resize-none py-4`}
                  placeholder={
                    visitorType === 'Student'
                      ? 'How are you feeling?'
                      : 'Reason for clinic visit'
                  }
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
                <>
                  <UserRound />
                  Confirm Log-in
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}