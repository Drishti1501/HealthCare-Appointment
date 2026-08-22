import React, { useState } from 'react';
import { prescriptionAPI, aiAPI } from '../../api/client';
import { 
  X, Plus, Trash2, Sparkles, CheckCircle2, 
  Pill, FileText, Loader2, Calendar 
} from 'lucide-react';

interface ConsultationModalProps {
  appointment: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({ appointment, onClose, onSuccess }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<any[]>([
    {
      medication_name: '',
      dosage: '500mg',
      frequency: 'TWICE_DAILY',
      duration_days: 5,
      meal_timing: 'AFTER_MEAL',
      instructions: 'Take after meals with water',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [aiPreview, setAiPreview] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medication_name: '',
        dosage: '1 tablet',
        frequency: 'DAILY',
        duration_days: 5,
        meal_timing: 'AFTER_MEAL',
        instructions: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Preview AI Post-Visit Summary
  const handleGenerateAIPreview = async () => {
    if (!clinicalNotes || !diagnosis) {
      setError('Please provide diagnosis and clinical notes first.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const res = await aiAPI.previewPostVisit({
        diagnosis,
        clinical_notes: clinicalNotes,
        prescription_items: items,
        follow_up_date: followUpDate,
      });
      setAiPreview(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !clinicalNotes) {
      setError('Diagnosis and Clinical Notes are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await prescriptionAPI.submitConsultation({
        appointment_id: appointment.id,
        diagnosis,
        clinical_notes: clinicalNotes,
        follow_up_date: followUpDate,
        items: items.filter((it) => it.medication_name.trim().length > 0),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = `${appointment.patient_details?.first_name || ''} ${appointment.patient_details?.last_name || appointment.patient_details?.email}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs mb-1">
            <FileText className="w-4 h-4" />
            Post-Visit Clinical Workspace
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Consultation Record for {patientName}
          </h2>
          <p className="text-xs text-slate-500">
            Appointment Date: {appointment.date} • Symptoms: "{appointment.symptoms_text}"
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Diagnosis & Notes */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Diagnosis *
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Viral Pharyngitis with Mild Bronchial Irritation"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Notes & Observations *
              </label>
              <textarea
                rows={3}
                required
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Doctor findings, physical examination notes, vitals, and treatment rationale..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recommended Follow-Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full sm:w-1/2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Prescription Items */}
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-sky-600" /> Prescribe Medications
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                >
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={item.medication_name}
                      onChange={(e) => handleItemChange(idx, 'medication_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Dosage (500mg)"
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    >
                      <option value="DAILY">1x Daily</option>
                      <option value="TWICE_DAILY">2x Daily</option>
                      <option value="THRICE_DAILY">3x Daily</option>
                      <option value="FOUR_TIMES_DAILY">4x Daily</option>
                      <option value="EVERY_8_HOURS">Every 8h</option>
                      <option value="AS_NEEDED">As Needed (PRN)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Days"
                      value={item.duration_days}
                      onChange={(e) => handleItemChange(idx, 'duration_days', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={item.meal_timing}
                      onChange={(e) => handleItemChange(idx, 'meal_timing', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                    >
                      <option value="AFTER_MEAL">After Meal</option>
                      <option value="BEFORE_MEAL">Before Meal</option>
                      <option value="WITH_MEAL">With Meal</option>
                      <option value="EMPTY_STOMACH">Empty Stomach</option>
                      <option value="ANYTIME">Anytime</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Post-Visit Generator Button & Box */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-600" />
                AI Patient-Friendly Summary Generator
              </span>
              <button
                type="button"
                onClick={handleGenerateAIPreview}
                disabled={aiLoading}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Preview with Gemini
              </button>
            </div>

            {aiPreview && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 border border-teal-200 text-xs space-y-2">
                <span className="font-bold text-teal-900 block">Patient Summary Preview:</span>
                <p className="text-slate-700">{aiPreview.patient_friendly_summary}</p>
                {aiPreview.follow_up_steps?.length > 0 && (
                  <div>
                    <span className="font-semibold text-teal-900 block">Follow-up Steps:</span>
                    <ul className="list-disc list-inside text-slate-600">
                      {aiPreview.follow_up_steps.map((st: string, i: number) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-xs font-semibold transition shadow-sm flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete Consultation & Send Summary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
