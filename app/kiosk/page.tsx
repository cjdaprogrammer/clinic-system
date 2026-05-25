'use client'

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2
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

        // Check if existing student
        let { data: student, error: fetchError } = await supabase
          .from('students')
          .select('id')
          .ilike('student_id', studentId.trim())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (student) {

          finalStudentUuid = student.id;

        } else {

          // Register new student
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

            // Handle duplicate student safely
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
      // LOG CLINIC VISIT
      // =========================
      const { error: visitError } = await supabase
        .from('visits')
        .insert([{

          student_id: finalStudentUuid,

          // NEW FIELDS
          visitor_type: visitorType,
          employee_type:
            visitorType === 'Employee'
              ? employeeType
              : null,

          gender: gender,
          full_name: fullName.trim(),

          // EXISTING FIELDS
          reason: reason.trim(),

          subject_at_time:
            visitorType === 'Student'
              ? subject.trim()
              : 'N/A',

          status: 'Waiting',
          visit_time: new Date().toISOString()
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* VISITOR TYPE */}
              <div>
                <label className="kiosk-label">
                  Visitor Type
                </label>

                <select
                  required
                  className="kiosk-input"
                  value={visitorType}
                  onChange={(e) =>
                    setVisitorType(e.target.value)
                  }
                >
                  <option value="Student">
                    Student
                  </option>

                  <option value="Employee">
                    Employee
                  </option>
                </select>
              </div>

              {/* EMPLOYEE TYPE */}
              {visitorType === 'Employee' && (
                <div>

                  <label className="kiosk-label">
                    Employee Type
                  </label>

                  <select
                    required
                    className="kiosk-input"
                    value={employeeType}
                    onChange={(e) =>
                      setEmployeeType(e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select Type
                    </option>

                    <option value="Teaching">
                      Teaching
                    </option>

                    <option value="Non-Teaching">
                      Non-Teaching
                    </option>

                  </select>

                </div>
              )}

              {/* STUDENT ID */}
              {visitorType === 'Student' && (
                <div>

                  <label className="kiosk-label">
                    Student ID
                  </label>

                  <input
                    required
                    className="kiosk-input"
                    placeholder="e.g. 2024-0001"
                    value={studentId}
                    onChange={(e) =>
                      handleIdChange(e.target.value)
                    }
                  />

                </div>
              )}

              {/* FULL NAME */}
              <div>

                <label className="kiosk-label">
                  Full Name
                </label>

                <input
                  required
                  className="kiosk-input"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                />

              </div>

              {/* GENDER */}
              <div>

                <label className="kiosk-label">
                  Sex/Gender
                </label>

                <select
                  required
                  className="kiosk-input"
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value)
                  }
                >
                  <option value="" disabled>
                    Select
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                </select>

              </div>

              {/* STUDENT ONLY FIELDS */}
              {visitorType === 'Student' && (
                <>

                  {/* GRADE */}
                  <div>

                    <label className="kiosk-label">
                      Grade Level
                    </label>

                    <select
                      required
                      className="kiosk-input"
                      value={gradeLevel}
                      onChange={(e) =>
                        handleGradeChange(e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select Grade
                      </option>

                      {[7, 8, 9, 10, 11, 12].map((g) => (
                        <option
                          key={g}
                          value={g.toString()}
                        >
                          Grade {g}
                        </option>
                      ))}

                    </select>

                  </div>

                  {/* STRAND */}
                  {(gradeLevel === '11' ||
                    gradeLevel === '12') && (

                    <div className="animate-in slide-in-from-top-2 duration-300">

                      <label className="kiosk-label text-teal-400 font-black">
                        Strand
                      </label>

                      <select
                        required
                        className="kiosk-input border-teal-500/30"
                        value={strand}
                        onChange={(e) =>
                          setStrand(e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select Strand
                        </option>

                        <option value="STEM">
                          STEM
                        </option>

                        <option value="ABM">
                          ABM
                        </option>

                        <option value="HUMSS">
                          HUMSS
                        </option>

                        <option value="TVL-ICT">
                          TVL-ICT
                        </option>

                        <option value="TVL-HE">
                          TVL-HE
                        </option>

                      </select>

                    </div>
                  )}

                  {/* SECTION */}
                  <div>

                    <label className="kiosk-label">
                      Section
                    </label>

                    <input
                      required
                      className="kiosk-input"
                      placeholder="e.g. Newton"
                      value={section}
                      onChange={(e) =>
                        setSection(e.target.value)
                      }
                    />

                  </div>

                  {/* SUBJECT */}
                  <div>

                    <label className="kiosk-label">
                      Current Subject
                    </label>

                    <input
                      required
                      className="kiosk-input"
                      placeholder="e.g. Mathematics"
                      value={subject}
                      onChange={(e) =>
                        setSubject(e.target.value)
                      }
                    />

                  </div>

                </>
              )}

              {/* REASON */}
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
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                />

              </div>

            </div>

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