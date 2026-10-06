import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  User,
  IdCard,
  GraduationCap,
  Users,
  Camera,
  ArrowRight,
  Loader2,
  AlertCircle,
  Bus,
  Phone
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth, firebaseActions, UserProfile } from '../utils/firebase';

const DIU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@diu\.edu\.bd$/;

interface AuthProps {
  onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!DIU_EMAIL_REGEX.test(email)) {
      setError('Please use your official DIU email (@diu.edu.bd)');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !DIU_EMAIL_REGEX.test(email)) {
      setError('Please enter your official DIU email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log("Attempting password reset for:", email);
      await firebaseActions.resetPassword(email);
      // We use a specific success code to trigger the green UI
      setError('RESET_SENT_SUCCESS');
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later');
      } else {
        setError(err.message || 'Failed to send reset link');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mb-4">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">DIU Transport</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Student Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Official Email (@diu.edu.bd)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                required
              />
            </div>
          </div>

          {!forgotPassword && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                required
              />
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-2 text-xs font-black uppercase tracking-tight p-3 rounded-xl ${error === 'RESET_SENT_SUCCESS' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-500 bg-red-50 border border-red-100'}`}
              >
                {error === 'RESET_SENT_SUCCESS' ? <ArrowRight className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{error === 'RESET_SENT_SUCCESS' ? 'Reset link sent! Check your Inbox or Spam folder.' : error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {forgotPassword ? (
            <div className="space-y-4 pt-2">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setForgotPassword(false)}
                className="w-full text-slate-400 font-black uppercase tracking-widest text-[10px]"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? 'Login' : 'Create Account')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-emerald-600 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotPassword(true)}
                  className="text-slate-300 font-bold uppercase tracking-widest text-[9px] hover:text-slate-500 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export const ProfileSetup: React.FC<{ user: FirebaseUser, existingProfile?: UserProfile | null }> = ({ user, existingProfile }) => {
  const [fullName, setFullName] = useState(existingProfile?.fullName || '');
  const [studentId, setStudentId] = useState(existingProfile?.studentId || '');
  const [department, setDepartment] = useState(existingProfile?.department || '');
  const [batch, setBatch] = useState(existingProfile?.batch || '');
  const [phone, setPhone] = useState(existingProfile?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(existingProfile?.photoUrl || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Increased limit to 10MB as requested
      if (file.size > 10 * 1024 * 1024) {
        alert('Image is too large. Please select an image under 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { alert("Phone number is required"); return; }
    setLoading(true);
    try {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        fullName,
        studentId,
        department,
        batch,
        phone: phone.trim(),
        photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        createdAt: Date.now()
      };
      await firebaseActions.saveProfile(profile);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save profile: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 overflow-y-auto no-scrollbar pb-32">
      <div className="max-w-md mx-auto w-full pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Complete Profile</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">One last step to get moving</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center mb-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl flex items-center justify-center text-slate-300 hover:text-emerald-500 transition-colors">
                  {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <Camera className="w-10 h-10" />}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                  <Camera className="w-4 h-4" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImagePick}
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-4">Tap to upload photo</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Department (e.g. SWE)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Batch (e.g. 42)"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Using App'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
