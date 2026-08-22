import React, { useState, useEffect } from 'react';
import { appointmentAPI } from '../../api/client';
import { 
  Calendar, Clock, User, Sparkles, AlertCircle, 
  FileText, CheckCircle2, Search, Filter 
} from 'lucide-react';
import { ConsultationModal } from './ConsultationModal';

export const DoctorDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED'>('CONFIRMED');
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.list({
        status: activeTab === 'ALL' ? undefined : activeTab,
      });
      setAppointments(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">HIGH URGENCY</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM URGENCY</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">LOW URGENCY</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Doctor Clinical Workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Patient Consultations & Schedule</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review pre-visit AI symptom briefings, recommended diagnostic questions, and record post-visit prescriptions
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('CONFIRMED')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'CONFIRMED' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Upcoming Queue
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'COMPLETED' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Completed Visits
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'ALL' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {/* Consultations List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-40" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No appointments in this view</h3>
          <p className="text-xs text-slate-500 mt-1">Select another tab to inspect previous consultations or upcoming slots.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const patientName = `${appt.patient_details?.first_name || ''} ${appt.patient_details?.last_name || appt.patient_details?.email}`;

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-sky-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 font-bold flex items-center justify-center">
                      {appt.patient_details?.first_name?.[0] || 'P'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{patientName}</h3>
                      <p className="text-xs text-slate-500">
                        {appt.patient_details?.email} • Phone: {appt.patient_details?.phone || 'N/A'} • Blood: {appt.patient_details?.blood_group || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getUrgencyBadge(appt.urgency_level)}
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {appt.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-4">
                  {/* Left: Timing and Symptoms */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>{appt.date} ({appt.start_time} - {appt.end_time})</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Patient's Reported Symptoms
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        "{appt.symptoms_text}"
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span>Duration: <strong>{appt.symptom_duration || 'Few days'}</strong></span>
                        <span>Severity: <strong>{appt.severity_scale}/10</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: AI Pre-Visit Briefing (PDF requirement) */}
                  <div className="lg:col-span-2 p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50/40 border border-sky-200/80 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-sky-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        AI Pre-Visit Clinical Analysis
                      </span>
                      <span className="text-[11px] text-sky-700 font-medium">Gemini 1.5 Flash</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold">Chief Complaint:</span>
                      <p className="text-slate-800 font-medium mt-0.5">{appt.chief_complaint}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">
                        Recommended Probing Diagnostic Questions:
                      </span>
                      <ul className="space-y-1 text-slate-700">
                        {appt.suggested_questions?.map((q: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-sky-600 font-bold">Q{i + 1}:</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {appt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => setSelectedAppt(appt)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" /> Start Consultation & Enter Rx
                    </button>
                  )}
                  {appt.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> Prescription Recorded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Consultation & Prescription Modal */}
      {selectedAppt && (
        <ConsultationModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onSuccess={() => {
            setSelectedAppt(null);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
};
