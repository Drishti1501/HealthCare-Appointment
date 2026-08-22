import React, { useState, useEffect } from 'react';
import { appointmentAPI } from '../../api/client';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, 
  XCircle, Sparkles, FileText, ChevronRight, User 
} from 'lucide-react';

export const MyAppointments: React.FC<{ onViewPrescription: (id: number) => void }> = ({ onViewPrescription }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalId, setCancelModalId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.list();
      setAppointments(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async () => {
    if (!cancelModalId) return;
    setCancelling(true);
    try {
      await appointmentAPI.cancel(cancelModalId, cancelReason || 'Personal reasons');
      setCancelModalId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (e) {
      console.error(e);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">Completed</span>;
      case 'CANCELLED_LEAVE_CONFLICT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Doctor on Leave</span>;
      case 'CANCELLED_BY_PATIENT':
      case 'CANCELLED_BY_DOCTOR':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">HIGH URGENCY</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM URGENCY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">LOW URGENCY</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your scheduled visits, AI pre-consultation briefings, and completed clinical summaries
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-32" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No appointments scheduled</h3>
          <p className="text-xs text-slate-500 mt-1">Explore our doctor directory to book your next consultation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const docUser = appt.doctor_details?.user_details;
            const doctorName = `Dr. ${docUser?.first_name || ''} ${docUser?.last_name || docUser?.email || ''}`;

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center">
                      {docUser?.first_name?.[0] || 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{doctorName}</h3>
                      <p className="text-xs text-teal-600 font-medium">{appt.doctor_details?.specialization}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(appt.status)}
                    {getUrgencyBadge(appt.urgency_level)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs text-slate-600">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span>{appt.date} ({appt.start_time} - {appt.end_time})</span>
                    </div>
                    <p className="text-slate-500">
                      <strong>Submitted Symptoms:</strong> {appt.symptoms_text}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 space-y-1">
                    <span className="flex items-center gap-1 font-bold text-teal-900 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" /> AI Triage Briefing for Doctor
                    </span>
                    <p className="text-slate-700 italic">"{appt.chief_complaint}"</p>
                  </div>
                </div>

                {appt.cancellation_reason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-3">
                    <strong>Cancellation Note:</strong> {appt.cancellation_reason}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {appt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => setCancelModalId(appt.id)}
                      className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  {appt.has_prescription && (
                    <button
                      onClick={() => onViewPrescription(appt.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Care Plan & Prescription
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Appointment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to cancel this booking? We will notify the doctor and remove it from your calendar.
            </p>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
