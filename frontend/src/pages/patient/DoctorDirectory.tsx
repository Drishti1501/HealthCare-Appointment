import React, { useState, useEffect } from 'react';
import { doctorAPI } from '../../api/client';
import { 
  Search, Stethoscope, Star, Calendar, Clock, 
  DollarSign, CheckCircle2, Award, Sparkles, Filter 
} from 'lucide-react';
import { BookingModal } from './BookingModal';

export const DoctorDirectory: React.FC<{ onBookingSuccess: () => void }> = ({ onBookingSuccess }) => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  const specializations = [
    'ALL',
    'Cardiology',
    'Dermatology',
    'General Medicine',
    'Pediatrics',
    'Neurology',
  ];

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await doctorAPI.list({
        specialization: selectedSpecialization === 'ALL' ? undefined : selectedSpecialization,
        search: search || undefined,
      });
      setDoctors(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialization]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-sky-950 text-white p-8 md:p-12 mb-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            AI-Enhanced Patient Triage & Follow-up
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Book Top Specialists with Smart AI Symptom Analysis
          </h1>
          <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed">
            Share your symptoms in advance to receive an instant AI pre-visit urgency assessment. Doctors review your case before the consultation, and you receive clear post-visit medication timetables.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name or condition..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Specialization Tags */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Specialties:
          </span>
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialization(spec)}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                selectedSpecialization === spec
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No doctors found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria or specialization filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => {
            const fullName = `Dr. ${doctor.user_details?.first_name || ''} ${doctor.user_details?.last_name || doctor.user_details?.email}`;
            return (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-teal-500/50 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition">
                        {doctor.user_details?.first_name?.[0] || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-teal-700 transition">
                          {fullName}
                        </h3>
                        <span className="inline-block text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full mt-0.5">
                          {doctor.specialization}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {doctor.bio || 'Experienced medical practitioner providing comprehensive care.'}
                  </p>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-500" /> Experience
                      </span>
                      <span className="font-semibold text-slate-800">{doctor.experience_years} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> Consultation
                      </span>
                      <span className="font-semibold text-slate-800">{doctor.slot_duration_minutes} mins / slot</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Fee
                      </span>
                      <span className="font-bold text-teal-700 text-sm">${doctor.consultation_fee}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDoctor(doctor)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 group-hover:bg-teal-600 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Select Slot & Book
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal Flow */}
      {selectedDoctor && (
        <BookingModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onSuccess={() => {
            setSelectedDoctor(null);
            onBookingSuccess();
          }}
        />
      )}
    </div>
  );
};
