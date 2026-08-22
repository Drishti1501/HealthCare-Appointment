import React, { useState, useEffect } from 'react';
import { prescriptionAPI } from '../../api/client';
import { 
  FileText, Pill, Clock, Sparkles, CheckCircle2, 
  Calendar, AlertTriangle, Bell, User 
} from 'lucide-react';

export const MyPrescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'reminders'>('prescriptions');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        prescriptionAPI.list(),
        prescriptionAPI.getReminders(),
      ]);
      setPrescriptions(pRes.data.results || pRes.data);
      setReminders(rRes.data.results || rRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Care Plan & Digital Prescriptions</h1>
          <p className="text-xs text-slate-500 mt-1">
            AI-translated plain-language treatment summaries and medication timetables
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'prescriptions' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'reminders' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Medication Schedule ({reminders.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-48" />
          ))}
        </div>
      ) : activeTab === 'prescriptions' ? (
        prescriptions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No prescriptions recorded yet</h3>
            <p className="text-xs text-slate-500 mt-1">After your doctor concludes your visit, your post-visit summary will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((presc) => {
              const structured = presc.structured_ai_summary || {};
              const meds = presc.items || [];

              return (
                <div
                  key={presc.id}
                  className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                        Consultation on {presc.appointment_date}
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                        Diagnosis: {presc.diagnosis}
                      </h2>
                      <p className="text-xs text-slate-500">Consultant: {presc.doctor_name}</p>
                    </div>
                    {presc.follow_up_date && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200">
                        <Calendar className="w-4 h-4" /> Next Follow-up: {presc.follow_up_date}
                      </div>
                    )}
                  </div>

                  {/* AI Patient-Friendly Summary Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/50 border border-teal-200/70 space-y-3">
                    <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      Patient-Friendly Summary & Instructions
                    </div>
                    <p className="text-slate-700 text-xs md:text-sm leading-relaxed">
                      {presc.patient_friendly_summary || 'Please follow your prescription instructions carefully.'}
                    </p>
                  </div>

                  {/* Doctor Clinical Notes */}
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider">Clinical Notes</span>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {presc.clinical_notes}
                    </p>
                  </div>

                  {/* Prescribed Medications Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" /> Prescribed Medications & Timetable
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <th className="py-2.5 px-3 font-semibold">Medicine</th>
                            <th className="py-2.5 px-3 font-semibold">Dosage</th>
                            <th className="py-2.5 px-3 font-semibold">Frequency</th>
                            <th className="py-2.5 px-3 font-semibold">Duration</th>
                            <th className="py-2.5 px-3 font-semibold">Timing / Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {meds.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-semibold text-slate-900">{item.medication_name}</td>
                              <td className="py-3 px-3 text-slate-600">{item.dosage}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                                  {item.frequency}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600">{item.duration_days} days</td>
                              <td className="py-3 px-3 text-slate-600">
                                {item.meal_timing} {item.instructions ? `• ${item.instructions}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* REMINDERS TAB */
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-600" /> Scheduled Automated Medication Reminders
          </h3>
          {reminders.length === 0 ? (
            <p className="text-xs text-slate-500">No active medication reminder jobs found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reminders.map((rem: any) => (
                <div
                  key={rem.id}
                  className="p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{rem.medication_name} ({rem.dosage})</span>
                      <p className="text-[11px] text-slate-500">{rem.message_text}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rem.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                      rem.status === 'PENDING' ? 'bg-sky-100 text-sky-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {rem.status}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {new Date(rem.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
