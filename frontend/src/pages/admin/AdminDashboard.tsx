import React, { useState, useEffect } from 'react';
import { doctorAPI, appointmentAPI, adminAPI } from '../../api/client';
import { 
  Shield, Users, Stethoscope, Calendar, Bell, 
  Plus, Clock, AlertTriangle, CheckCircle2, DollarSign, Mail 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'doctors' | 'leaves' | 'notifications'>('doctors');

  // New Doctor Form State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [docEmail, setDocEmail] = useState('');
  const [docFirstName, setDocFirstName] = useState('');
  const [docLastName, setDocLastName] = useState('');
  const [docSpec, setDocSpec] = useState('Cardiology');
  const [docFee, setDocFee] = useState('120.00');
  const [docDuration, setDocDuration] = useState(30);
  const [docBio, setDocBio] = useState('');

  // Admin Leave Form State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDoctorId, setLeaveDoctorId] = useState<number | null>(null);
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('Annual Leave');
  const [leaveResult, setLeaveResult] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, lRes, nRes] = await Promise.all([
        doctorAPI.list(),
        appointmentAPI.getLeaves(),
        adminAPI.getNotificationLogs(),
      ]);
      setDoctors(dRes.data.results || dRes.data);
      setLeaves(lRes.data);
      setNotifications(nRes.data.results || nRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDoctorId) return;
    try {
      const res = await appointmentAPI.createLeave({
        doctor_id: leaveDoctorId,
        start_date: leaveStart,
        end_date: leaveEnd,
        reason: leaveReason,
      });
      setLeaveResult(res.data);
      setShowLeaveModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply leave');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Clinic Administration Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Platform Control & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage doctor rosters, resolve leave scheduling conflicts, and monitor notification outbox delivery
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'doctors' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'leaves' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Leave & Conflicts ({leaves.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'notifications' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Notification Logs ({notifications.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Doctors</span>
            <div className="text-2xl font-bold text-slate-900">{doctors.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Scheduled Leaves</span>
            <div className="text-2xl font-bold text-slate-900">{leaves.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Notifications</span>
            <div className="text-2xl font-bold text-slate-900">{notifications.length}</div>
          </div>
        </div>
      </div>

      {leaveResult && (
        <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <span>{leaveResult.message}</span>
          <button onClick={() => setLeaveResult(null)} className="text-purple-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: DOCTORS MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Doctor Roster & Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc) => {
              const name = `Dr. ${doc.user_details?.first_name || ''} ${doc.user_details?.last_name || doc.user_details?.email}`;
              return (
                <div key={doc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{name}</h4>
                      <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1">
                        {doc.specialization}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">${doc.consultation_fee}</span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <p><strong>Working Days:</strong> {doc.working_days?.join(', ') || 'All Week'}</p>
                    <p><strong>Hours:</strong> {doc.start_time} - {doc.end_time} ({doc.slot_duration_minutes} min slots)</p>
                    <p><strong>Experience:</strong> {doc.experience_years} years</p>
                  </div>

                  <button
                    onClick={() => {
                      setLeaveDoctorId(doc.id);
                      setShowLeaveModal(true);
                    }}
                    className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition"
                  >
                    Schedule Leave / Mark Off
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE & CONFLICTS */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Doctor Leaves & Automatic Conflict Resolver</h3>
              <p className="text-xs text-slate-500">
                When a leave is scheduled, all overlapping confirmed bookings are transitioned to CANCELLED_LEAVE_CONFLICT and patients are notified.
              </p>
            </div>
            <button
              onClick={() => {
                setLeaveDoctorId(doctors[0]?.id || 1);
                setShowLeaveModal(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Doctor Leave
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {leave.doctor_name} ({leave.specialization})
                  </h4>
                  <p className="text-slate-500">
                    {leave.start_date} to {leave.end_date} • Reason: {leave.reason || 'Not specified'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                  {leave.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS LOG */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Notification Queue & Delivery Outbox</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{log.recipient_email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {log.notification_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-xs">{log.subject}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'QUEUED' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{log.attempts}</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Schedule Doctor Leave</h3>
            <p className="text-xs text-slate-500 mb-4">
              The system will automatically find conflicting patient bookings and notify them with reschedule guidance.
            </p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor</label>
                <select
                  value={leaveDoctorId || ''}
                  onChange={(e) => setLeaveDoctorId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user_details?.first_name} {d.user_details?.last_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                >
                  Confirm & Trigger Resolver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
