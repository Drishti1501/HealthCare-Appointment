import React, { useState, useEffect } from 'react';
import { appointmentAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Plus, Loader2 } from 'lucide-react';

export const DoctorLeaves: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Medical Conference / Vacation');
  const [applying, setApplying] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.getLeaves();
      setLeaves(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    setResultMessage('');
    try {
      const res = await appointmentAPI.createLeave({
        doctor_id: user?.doctor_profile_id || 1,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      setResultMessage(res.data.message || 'Leave applied successfully.');
      setShowModal(false);
      fetchLeaves();
    } catch (e: any) {
      setResultMessage(e.response?.data?.error || 'Failed to apply leave.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Leave & Schedule Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated conflict resolver: existing bookings during approved leaves are automatically cancelled and patients notified.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Request Leave Dates
        </button>
      </div>

      {resultMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{resultMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-28" />
          ))}
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No scheduled leaves</h3>
          <p className="text-xs text-slate-500 mt-1">You currently have full practice availability.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {leave.start_date} to {leave.end_date}
                  </h4>
                  <p className="text-slate-500">{leave.reason || 'Personal Leave'}</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800">
                {leave.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Apply for Doctor Leave</h3>
            <p className="text-xs text-slate-500 mb-4">
              All slots in this date range will be blocked. Any active patient appointments will be automatically cancelled with reschedule notifications sent.
            </p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center gap-1.5"
                >
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm & Apply Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
