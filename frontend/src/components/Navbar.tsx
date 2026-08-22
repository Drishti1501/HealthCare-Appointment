import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, User, Calendar, FileText, Shield, 
  LogOut, LogIn, Stethoscope, Clock, Sparkles 
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenLogin }) => {
  const { user, logout, quickLogin } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      {/* Top Demo Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Sparkles className="w-3 h-3 mr-1 text-teal-400" /> AI Powered (Gemini)
          </span>
          <span className="hidden sm:inline text-slate-400">
            Healthcare Appointment & Follow-up Manager
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">⚡ Quick Switch Role:</span>
          <button
            onClick={() => quickLogin('PATIENT')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 transition"
          >
            Patient (Alice)
          </button>
          <button
            onClick={() => quickLogin('DOCTOR')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition"
          >
            Doctor (Dr. Smith)
          </button>
          <button
            onClick={() => quickLogin('ADMIN')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 transition"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => setCurrentTab(user?.role === 'DOCTOR' ? 'doctor-queue' : user?.role === 'ADMIN' ? 'admin-dashboard' : 'doctors')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                CareFlow AI
              </span>
              <span className="block text-[11px] font-medium text-teal-600">
                Clinic & Follow-up Manager
              </span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            {(!user || user.role === 'PATIENT') && (
              <>
                <button
                  onClick={() => setCurrentTab('doctors')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentTab === 'doctors'
                      ? 'bg-teal-50 text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  Find Doctors
                </button>
                {user && (
                  <>
                    <button
                      onClick={() => setCurrentTab('my-appointments')}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        currentTab === 'my-appointments'
                          ? 'bg-teal-50 text-teal-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-teal-600" />
                      My Appointments
                    </button>
                    <button
                      onClick={() => setCurrentTab('my-prescriptions')}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        currentTab === 'my-prescriptions'
                          ? 'bg-teal-50 text-teal-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-teal-600" />
                      Prescriptions & Care Plan
                    </button>
                  </>
                )}
              </>
            )}

            {user?.role === 'DOCTOR' && (
              <>
                <button
                  onClick={() => setCurrentTab('doctor-queue')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentTab === 'doctor-queue'
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-sky-600" />
                  Patient Consultations
                </button>
                <button
                  onClick={() => setCurrentTab('doctor-leaves')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentTab === 'doctor-leaves'
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 text-sky-600" />
                  Leave & Schedule
                </button>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setCurrentTab('admin-dashboard')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                    currentTab === 'admin-dashboard'
                      ? 'bg-purple-50 text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  Admin Control Center
                </button>
              </>
            )}
          </nav>

          {/* User Profile / Auth Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.email}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    user.role === 'DOCTOR' ? 'bg-sky-100 text-sky-700' :
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    'bg-teal-100 text-teal-700'
                  }`}>
                    {user.role} PORTAL
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-sm transition"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
