import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DoctorDirectory } from './pages/patient/DoctorDirectory';
import { MyAppointments } from './pages/patient/MyAppointments';
import { MyPrescriptions } from './pages/patient/MyPrescriptions';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorLeaves } from './pages/doctor/DoctorLeaves';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LoginModal } from './pages/auth/LoginModal';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return 'doctors';
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Sync tab with role changes
  React.useEffect(() => {
    if (user?.role === 'DOCTOR') {
      setCurrentTab('doctor-queue');
    } else if (user?.role === 'ADMIN') {
      setCurrentTab('admin-dashboard');
    } else {
      if (currentTab === 'doctor-queue' || currentTab === 'admin-dashboard' || currentTab === 'doctor-leaves') {
        setCurrentTab('doctors');
      }
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenLogin={() => setIsLoginOpen(true)}
        />

        <main className="pb-16">
          {/* Patient Views */}
          {currentTab === 'doctors' && (
            <DoctorDirectory onBookingSuccess={() => setCurrentTab('my-appointments')} />
          )}
          {currentTab === 'my-appointments' && (
            <MyAppointments onViewPrescription={() => setCurrentTab('my-prescriptions')} />
          )}
          {currentTab === 'my-prescriptions' && (
            <MyPrescriptions />
          )}

          {/* Doctor Views */}
          {currentTab === 'doctor-queue' && (
            <DoctorDashboard />
          )}
          {currentTab === 'doctor-leaves' && (
            <DoctorLeaves />
          )}

          {/* Admin Views */}
          {currentTab === 'admin-dashboard' && (
            <AdminDashboard />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🏥 <strong>Healthcare Appointment & Follow-up Manager</strong> • Built with Python, Django, Gemini AI & React</span>
          <span className="text-slate-400">Pessimistic Slot Hold Engine • Leave Conflict Resolver • Medication Scheduler</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
