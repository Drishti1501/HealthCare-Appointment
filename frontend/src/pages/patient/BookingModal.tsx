import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorAPI, appointmentAPI, aiAPI } from '../../api/client';
import { 
  X, Calendar, Clock, AlertTriangle, CheckCircle2, 
  Sparkles, ShieldAlert, FileText, ArrowRight, Loader2, Download 
} from 'lucide-react';

interface BookingModalProps {
  doctor: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ doctor, onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // Step 1: Slot selection, Step 2: Symptoms & AI Triage, Step 3: Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  const [slotsData, setSlotsData] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  // Slot Hold State
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600); // 10 mins
  const [holdingSlot, setHoldingSlot] = useState(false);

  // Symptoms Intake
  const [symptomsText, setSymptomsText] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('3-5 days');
  const [severityScale, setSeverityScale] = useState(5);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Live Preview
  const [aiPreview, setAiPreview] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Confirmed Appointment
  const [confirmedAppt, setConfirmedAppt] = useState<any | null>(null);

  // Fetch Available Slots for chosen date
  const fetchSlots = async () => {
    setLoadingSlots(true);
    setErrorMessage('');
    setSelectedSlot(null);
    try {
      const res = await doctorAPI.getSlots(doctor.id, selectedDate);
      setSlotsData(res.data);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Failed to load slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  // Live countdown timer for the 10-minute hold
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor((holdExpiresAt.getTime() - new Date().getTime()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        setErrorMessage('Your 10-minute slot hold has expired. Please select a slot again.');
        setStep(1);
        setHoldToken(null);
        setHoldExpiresAt(null);
        clearInterval(interval);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // Acquire 10-minute temporary Slot Hold
  const handleAcquireHold = async () => {
    if (!selectedSlot) return;
    setHoldingSlot(true);
    setErrorMessage('');
    try {
      const res = await appointmentAPI.holdSlot(doctor.id, selectedDate, selectedSlot.start_time);
      const hold = res.data.hold;
      setHoldToken(hold.hold_token);
      setHoldExpiresAt(new Date(hold.expires_at));
      setStep(2);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Could not hold slot. It may have just been taken.');
    } finally {
      setHoldingSlot(false);
    }
  };

  // Preview AI Triage on Demand
  const handlePreviewAI = async () => {
    if (!symptomsText || symptomsText.trim().length < 5) return;
    setAiLoading(true);
    try {
      const res = await aiAPI.previewSymptoms(symptomsText);
      setAiPreview(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdToken || !symptomsText) {
      setErrorMessage('Please provide your symptoms before confirming.');
      return;
    }
    setConfirming(true);
    setErrorMessage('');
    try {
      const res = await appointmentAPI.confirmBooking({
        hold_token: holdToken,
        symptoms_text: symptomsText,
        symptom_duration: symptomDuration,
        severity_scale: severityScale,
      });
      setConfirmedAppt(res.data.appointment);
      setStep(3);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Booking confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const doctorName = `Dr. ${doctor.user_details?.first_name || ''} ${doctor.user_details?.last_name || doctor.user_details?.email}`;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Doctor Header */}
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              {doctor.user_details?.first_name?.[0] || 'D'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{doctorName}</h2>
              <p className="text-xs text-teal-600 font-medium">
                {doctor.specialization} • ${doctor.consultation_fee} / consultation
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center justify-between mt-4 text-xs font-semibold text-slate-400">
            <span className={step >= 1 ? 'text-teal-600' : ''}>1. Select Slot</span>
            <span>→</span>
            <span className={step >= 2 ? 'text-teal-600' : ''}>2. Symptoms & AI Triage</span>
            <span>→</span>
            <span className={step >= 3 ? 'text-teal-600' : ''}>3. Confirmed</span>
          </div>

          {/* Slot Hold Timer Alert */}
          {step === 2 && holdExpiresAt && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-pulse-subtle">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-amber-600" />
                Slot temporarily held for you ({selectedSlot?.start_time} - {selectedSlot?.end_time})
              </span>
              <span className="font-mono font-bold bg-amber-200/60 px-2 py-0.5 rounded text-amber-900">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: DATE & SLOT SELECTION */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Appointment Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">Available Time Slots</label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {slotsData?.is_on_leave ? 'Doctor is on Leave' : `${slotsData?.slots?.filter((s: any) => s.is_available).length || 0} slots available`}
                </span>
              </div>

              {loadingSlots ? (
                <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> Loading real-time schedule...
                </div>
              ) : slotsData?.is_on_leave ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-red-500" />
                  <strong>Doctor is on approved leave on this date.</strong>
                  <p className="mt-0.5 text-red-600">Please choose another date from the calendar.</p>
                </div>
              ) : slotsData?.slots?.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                  {slotsData.message || 'No slots available for this day.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {slotsData?.slots?.map((slot: any, idx: number) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time;
                    const isAvailable = slot.is_available;

                    return (
                      <button
                        key={idx}
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl text-xs font-medium border transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : isAvailable
                            ? 'bg-white hover:bg-teal-50 border-slate-200 text-slate-800'
                            : slot.status === 'HELD'
                            ? 'bg-amber-50/50 border-amber-200/60 text-amber-700/60 cursor-not-allowed'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                        }`}
                      >
                        <span>{slot.start_time}</span>
                        <span className="text-[10px] opacity-75">
                          {slot.status === 'HELD' ? 'Held' : slot.status === 'BOOKED' ? 'Booked' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSlot || holdingSlot}
                onClick={handleAcquireHold}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
              >
                {holdingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Hold Slot & Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SYMPTOM FORM & AI TRIAGE PREVIEW */}
        {step === 2 && (
          <form onSubmit={handleConfirmBooking} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Describe Your Symptoms & Health Concerns *
              </label>
              <textarea
                rows={3}
                required
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                onBlur={handlePreviewAI}
                placeholder="e.g. Mild chest flutter after exercise, occasional dizziness for the past week..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                🤖 Google Gemini AI will analyze your symptoms to generate a pre-visit clinical triage for the doctor.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration of Symptoms</label>
                <select
                  value={symptomDuration}
                  onChange={(e) => setSymptomDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option>Less than 24 hours</option>
                  <option>1-3 days</option>
                  <option>3-5 days</option>
                  <option>1-2 weeks</option>
                  <option>More than 2 weeks</option>
                  <option>Chronic / Ongoing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discomfort Scale (1 = Mild, 10 = Severe): <span className="text-teal-700 font-bold">{severityScale}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severityScale}
                  onChange={(e) => setSeverityScale(Number(e.target.value))}
                  className="w-full accent-teal-600 mt-2"
                />
              </div>
            </div>

            {/* AI Triage Preview Card */}
            {(aiLoading || aiPreview) && (
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-teal-900">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    AI Pre-Visit Triage Preview
                  </span>
                  {aiPreview && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${
                      aiPreview.urgency_level === 'High' ? 'bg-red-100 text-red-700 border border-red-200' :
                      aiPreview.urgency_level === 'Medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {aiPreview.urgency_level} Urgency
                    </span>
                  )}
                </div>

                {aiLoading ? (
                  <div className="flex items-center gap-2 text-teal-700 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing symptoms with Gemini...
                  </div>
                ) : (
                  <>
                    <p className="text-slate-700"><strong>Chief Complaint:</strong> {aiPreview.chief_complaint}</p>
                    <div>
                      <strong>Diagnostic Questions for Dr. {doctor.user_details?.last_name}:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                        {aiPreview.suggested_questions?.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Back to Slots
              </button>
              <button
                type="submit"
                disabled={confirming || !symptomsText}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold transition shadow-sm flex items-center gap-2"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm & Book Consultation
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && confirmedAppt && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                A confirmation email with Google Calendar (.ics) invite has been queued.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-semibold text-slate-800">{doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-semibold text-slate-800">{confirmedAppt.date} at {confirmedAppt.start_time} - {confirmedAppt.end_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI Urgency Rating:</span>
                <span className="font-bold text-teal-700">{confirmedAppt.urgency_level}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-400 block mb-1">Chief Complaint:</span>
                <p className="text-slate-700 italic">"{confirmedAppt.chief_complaint}"</p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onSuccess();
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Go to My Appointments
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
