import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  Bus, MapPin, Bell, Search, ChevronRight, Clock, Info, Calendar, X, Star, Moon, CloudOff, RefreshCw, Plus, Menu, Megaphone, Trash2, Pin, Home, Shield, Mail, Linkedin, MessageCircle,
  User as UserIcon, IdCard, GraduationCap, Users, Camera, AlertCircle, Phone, MessageSquare, CheckCircle, Trash
} from 'lucide-react';
import { ROUTES, NOTICES } from './data';
import { ScheduleType, Route, Reminder, Notice, BusTime, LostFoundPost } from './types';
import { SplashScreen as CustomSplashScreen } from './components/SplashScreen';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getActiveRamadanInfo } from './utils/ramadan';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen as NativeSplashScreen } from '@capacitor/splash-screen';
import { scheduleLocalNotification, requestNotificationPermission, showNoticeNotification } from './utils/notifications';
import { useRealTimeData, auth, useUserProfile, UserProfile, firebaseActions, useAllUsers } from './utils/firebase';
import { AuthScreen, ProfileSetup } from './components/Auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- PREMIUM DESIGN SYSTEM CONFIG ---
const springTransition = { type: "spring", damping: 25, stiffness: 350, mass: 0.5 };
const listTransition = { type: "spring", damping: 28, stiffness: 400, mass: 0.6 };

function TabButton({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-400'}`}>
      <motion.div animate={{ scale: active ? 1.2 : 1, y: active ? -2 : 0 }} className="mb-1.5">{icon}</motion.div>
      <span className={`text-[8px] font-black uppercase mt-1 tracking-widest transition-all ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
      {active && <motion.div layoutId="activeTab" className="absolute -bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" transition={springTransition} />}
    </button>
  );
}

const fadeIn = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const containerStagger = {
  animate: { transition: { staggerChildren: 0.04 } }
};

const PAN_GESTURE_PROPS = (onClose: () => void) => ({
  drag: "y" as const,
  dragConstraints: { top: 0, bottom: 0 },
  dragElastic: 0.1,
  onDragEnd: (_: any, info: any) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  }
});

const getMinutesFromTime = (timeStr: string) => {
  if (!timeStr || timeStr.toLowerCase().includes('soon')) return -1;
  const match = timeStr.match(/(\d+):(\d+)\s*([AaPp][Mm])/);
  if (!match) return -1;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const validateMapUrl = (lrMap?: string, fbMap?: string) => {
  if (!fbMap || fbMap.length < 20) return lrMap || "";
  const isMock = fbMap.includes('MOCK_KEY') || fbMap.includes('YOUR_API_KEY');
  const isEmbedV1 = fbMap.includes('/maps/embed/v1/');
  const isMyMaps = fbMap.includes('/maps/d/');

  if (isMock) return lrMap || "";
  if (isMyMaps) return fbMap;
  if (!isEmbedV1 && fbMap.includes('/embed')) return fbMap;

  return lrMap || "";
};

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("🛑 App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4"><AlertCircle size={32} /></div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">The app encountered a rendering error</p>
          <pre className="bg-slate-50 p-4 rounded-xl text-[8px] text-red-400 overflow-auto max-w-full mb-6">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Restart App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const { profile: userProfile, loading: profileLoading } = useUserProfile(currentUser?.uid);
  const { assignments: busAssignments, notices: firebaseNotices, routes: firebaseRoutes, lostFound: lfPosts, loading: isFirebaseLoading, isConnected } = useRealTimeData();
  const { users: allStudents, loading: usersLoading } = useAllUsers(userProfile?.isAdmin);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        console.log("🔐 Auth State Changed:", user ? `Logged in (${user.email})` : "Logged out");
        setCurrentUser(user);
        setAuthChecking(false);
      }, (err) => {
        console.error("Auth State Error:", err);
        setRuntimeError("Authentication connection failed.");
      });
      return unsub;
    } catch (e: any) {
      setRuntimeError("Firebase initialization failed: " + e.message);
    }
  }, []);

  const isOnline = useOnlineStatus();
  const markAsLoaded = useCallback(() => {
    setIsLoaded(true);
    if (Capacitor.isNativePlatform()) {
      setTimeout(async () => {
        const hasRequested = localStorage.getItem('diu_permission_requested');
        if (!hasRequested) {
          console.log("🚀 Requesting initial notification permissions...");
          await requestNotificationPermission();
          localStorage.setItem('diu_permission_requested', 'true');
        }
      }, 1000);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'schedule' | 'routes' | 'reminders' | 'notice' | 'lf'>('schedule');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType>(ScheduleType.REGULAR);
  const [searchQuery, setSearchQuery] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [deletedNoticeIds, setDeletedNoticeIds] = useState<{[id: string]: number}>({});
  const [pinnedNoticeIds, setPinnedNoticeIds] = useState<string[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const [reminderConfig, setReminderConfig] = useState<{ route: Route, time: string } | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [assignmentConfig, setAssignmentConfig] = useState<{ route: Route, time: string, currentNames: string[] } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showServiceStatus, setShowServiceStatus] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [toasts, setToasts] = useState<{id: string, title: string, message: string, type: 'info' | 'success' | 'alert'}[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const allRoutes = useMemo(() => {
    const firebaseMap = new Map<string, Route>();
    if (firebaseRoutes && Array.isArray(firebaseRoutes)) {
      firebaseRoutes.forEach(fr => {
        if (fr?.id && fr?.scheduleType) firebaseMap.set(`${fr.id}-${fr.scheduleType}`, fr);
      });
    }

    // Create a lookup for local route templates by their numeric ID (e.g., "1", "2")
    const routeTemplates = new Map<string, { details: string, mapEmbedUrl: string }>();
    ROUTES.forEach(lr => {
      const numId = lr.id.replace(/\D/g, "");
      if (numId && lr.details) {
        routeTemplates.set(numId, { details: lr.details, mapEmbedUrl: lr.mapEmbedUrl || "" });
      }
    });

    const combined = ROUTES.map(lr => {
      const key = `${lr.id}-${lr.scheduleType}`;
      if (firebaseMap.has(key)) {
        const fbRoute = firebaseMap.get(key)!;
        firebaseMap.delete(key);

        return {
          ...lr,
          ...fbRoute,
          name: fbRoute.name || lr.name,
          details: fbRoute.details || lr.details,
          mapEmbedUrl: validateMapUrl(lr.mapEmbedUrl, fbRoute.mapEmbedUrl),
          toDSC: fbRoute.toDSC && fbRoute.toDSC.length > 0 ? fbRoute.toDSC : lr.toDSC,
          fromDSC: fbRoute.fromDSC && fbRoute.fromDSC.length > 0 ? fbRoute.fromDSC : lr.fromDSC
        };
      }
      return lr;
    });

    // Handle routes only present in Firebase (e.g. Exam/Friday versions)
    firebaseMap.forEach(fbRoute => {
      const numId = fbRoute.id.replace(/\D/g, "");
      const template = routeTemplates.get(numId);

      combined.push({
        ...fbRoute,
        // SMART FALLBACK: If Firebase version is missing path/map, use the Regular version template
        details: fbRoute.details || template?.details || "",
        mapEmbedUrl: validateMapUrl(template?.mapEmbedUrl, fbRoute.mapEmbedUrl)
      });
    });

    return combined.filter(r => r?.id && r?.name);
  }, [firebaseRoutes]);

  const selectedRoute = useMemo(() =>
    selectedRouteId ? allRoutes.find(r => r.id === selectedRouteId && r.scheduleType === selectedSchedule) : null,
  [selectedRouteId, allRoutes, selectedSchedule]);

  const allNotices = useMemo(() => {
    if (firebaseNotices && firebaseNotices.length > 0) return firebaseNotices;
    return NOTICES;
  }, [firebaseNotices]);

  useEffect(() => {
    const savedKeys = ['diu_reminders', 'diu_favorites', 'diu_deleted_notices', 'diu_pinned_notices'];
    const setters = [setReminders, setFavorites, setDeletedNoticeIds, setPinnedNoticeIds];
    savedKeys.forEach((k, i) => { try { const v = localStorage.getItem(k); if (v) setters[i](JSON.parse(v)); } catch(e) {} });
  }, []);

  useEffect(() => {
    localStorage.setItem('diu_reminders', JSON.stringify(reminders));
    localStorage.setItem('diu_favorites', JSON.stringify(favorites));
    localStorage.setItem('diu_deleted_notices', JSON.stringify(deletedNoticeIds));
    localStorage.setItem('diu_pinned_notices', JSON.stringify(pinnedNoticeIds));
  }, [reminders, favorites, deletedNoticeIds, pinnedNoticeIds]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      NativeSplashScreen.hide().catch(() => {});

      // Setup Push Notification Listeners
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        addToast(notification.title || 'New Update', notification.body || 'New notice published', 'info');
      });

      PushNotifications.addListener('pushNotificationActionPerformed', () => {
        setActiveTab('notice');
      });

      // Setup Local Notification Click Listener
      LocalNotifications.addListener('localNotificationActionPerformed', (payload) => {
        if (payload.notification.actionId === 'OPEN_NOTICE' || payload.notification.extra?.noticeId) {
          setActiveTab('notice');
        }
      });

      PushNotifications.register();
    }
  }, []);

  // --- Real-time Watchers (Notices & LF Approvals) ---
  useEffect(() => {
    if (isLoaded) {
      // 1. Notice Watcher (Triggers for ANY new notice regardless of order)
      if (firebaseNotices && firebaseNotices.length > 0) {
        const notifiedKeysKey = 'diu_notified_notice_ids';
        let notifiedIds = JSON.parse(localStorage.getItem(notifiedKeysKey) || '[]');

        // Find notices that haven't been notified yet
        const unnotified = firebaseNotices.filter(n => !notifiedIds.includes(n.id));

        if (unnotified.length > 0) {
          unnotified.forEach(n => {
            // Only notify if notice is newer than 2 minutes (prevent historical spam)
            if (Date.now() - (n.timestamp || 0) < 120000) {
              showNoticeNotification(n);
              addToast('New Update', n.title, 'info');
            }
            notifiedIds.push(n.id);
          });

          // Keep list manageable (last 50 ids)
          if (notifiedIds.length > 50) notifiedIds = notifiedIds.slice(-50);
          localStorage.setItem(notifiedKeysKey, JSON.stringify(notifiedIds));
        }
      }

      // 2. Lost & Found Approval Backup Watcher
      if (lfPosts && lfPosts.length > 0) {
        const approvedPosts = lfPosts.filter(p => p.isApproved || p.status === 'Approved');
        if (approvedPosts.length > 0) {
           const latestApproved = approvedPosts[0];
           const notifiedKey = `diu_notified_lf_${latestApproved.id}`;
           if (!localStorage.getItem(notifiedKey)) {
              if (Date.now() - latestApproved.createdAt < 60000) {
                 addToast('Post Published', `A new item has been approved`, 'success');
              }
              localStorage.setItem(notifiedKey, 'true');
           }
        }
      }
    }
  }, [firebaseNotices, lfPosts, isLoaded]);

  const handleSignOut = () => {
    signOut(auth);
    setShowMenu(false);
  };

  const toggleFavorite = (id: string) => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  const addToast = (title: string, message: string, type: any = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(p => [...p, { id, title, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  };

  const addOrUpdateReminder = async (route: Route, busTime: string, minutesBefore: number, direction: any = 'TO DSC', label?: string) => {
    const r: Reminder = editingReminder ? { ...editingReminder, minutesBefore, direction, label } : { id: Math.random().toString(36).substr(2, 9), routeId: route.id, routeName: route.name, busTime, minutesBefore, direction, label };
    setReminders(prev => editingReminder ? prev.map(item => item.id === r.id ? r : item) : [...prev, r]);
    if (Capacitor.isNativePlatform()) await scheduleLocalNotification(r);
    setReminderConfig(null); setShowCustomForm(false); setEditingReminder(null);
    addToast('Reminder Set', `Alert set for ${minutesBefore}m before departure`, 'success');
  };

  const filteredRoutes = useMemo(() => {
    return allRoutes.filter(r =>
      r?.scheduleType === selectedSchedule &&
      (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.details.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => {
      const aFav = favorites.includes(a.id), bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1; if (!aFav && bFav) return 1;
      const aN = parseInt(a.id.match(/\d+/)?.[0] || '0'), bN = parseInt(b.id.match(/\d+/)?.[0] || '0');
      return aN !== bN ? aN - bN : a.id.localeCompare(b.id);
    });
  }, [allRoutes, selectedSchedule, searchQuery, favorites]);

  const ramadanInfo = useMemo(() => getActiveRamadanInfo(), []);

  const isAnyOverlayOpen = showMenu || !!selectedRouteId || showServiceStatus || showPrivacyPolicy || showCustomForm || !!reminderConfig || !!editingReminder || showProfile || showStudentInfo;
  useEffect(() => {
    if (isAnyOverlayOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
  }, [isAnyOverlayOpen]);

  // CRITICAL ERROR UI
  if (runtimeError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-2">Startup Error</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">{runtimeError}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">
          Retry App
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isLoaded ? (
        <CustomSplashScreen key="splash" onComplete={markAsLoaded} />
      ) : authChecking || (currentUser && profileLoading) ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-white flex flex-col items-center justify-center gap-4"
        >
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Securing Session...</p>
        </motion.div>
      ) : !currentUser ? (
        <AuthScreen key="auth" onSuccess={() => {}} />
      ) : (!userProfile || !userProfile.studentId || !userProfile.phone || !userProfile.department) ? (
        <ProfileSetup key="setup" user={currentUser} existingProfile={userProfile} />
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-[#f8fafc] text-slate-800 pb-32 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900"
        >
          {/* Header */}
          <header className="bg-white/90 backdrop-blur-2xl p-6 pb-2 border-b border-slate-100 sticky top-0 z-[50] shadow-sm shadow-slate-100/10">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-black tracking-tighter text-slate-800">DIU<span className="text-emerald-600">Transport</span></h1>
              <div className="flex items-center gap-3">
                {!isConnected && (
                  <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Offline</span>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    className={`w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center transition-colors ${isFirebaseLoading ? 'text-emerald-500 animate-spin' : 'text-slate-400 hover:text-emerald-600'}`}>
                    <RefreshCw className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowMenu(true)}
                    className="px-5 h-11 bg-slate-900 text-white rounded-2xl flex items-center gap-2.5 shadow-lg hover:bg-black transition-all">
                    <Menu className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {activeTab === 'schedule' && (
              <div className="flex gap-2 py-4 overflow-x-auto no-scrollbar scrollbar-hide">
                {[ScheduleType.REGULAR, ScheduleType.EXAM, ScheduleType.FRIDAY, ScheduleType.SHUTTLE, ScheduleType.RAMADAN].map(type => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedSchedule(type)}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded-full uppercase transition-all whitespace-nowrap border shadow-sm ${
                      selectedSchedule === type
                        ? (type === ScheduleType.RAMADAN ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-slate-900 text-white border-slate-900 shadow-md')
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {type === ScheduleType.SHUTTLE ? 'Shuttle' : (type === ScheduleType.RAMADAN ? '🌙 Ramadan' : type)}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="relative mt-2 pb-2">
              <Search className="absolute left-4 top-1/2 -translate-y-[calc(50%+4px)] w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Filter routes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-emerald-200 transition-all shadow-sm"
              />
            </div>
          </header>

          <motion.main className="px-5 mt-6 max-w-2xl mx-auto overflow-visible">
            <AnimatePresence mode="wait">
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule-container"
                  variants={containerStagger}
                  drag={isAnyOverlayOpen ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
                  onDragEnd={(_, info) => {
                    const threshold = 50; const scheduleTypes = [ScheduleType.REGULAR, ScheduleType.EXAM, ScheduleType.FRIDAY, ScheduleType.SHUTTLE, ScheduleType.RAMADAN]; const currentIndex = scheduleTypes.indexOf(selectedSchedule);
                    if (info.offset.x > threshold && currentIndex > 0) setSelectedSchedule(scheduleTypes[currentIndex - 1]); else if (info.offset.x < -threshold && currentIndex < scheduleTypes.length - 1) setSelectedSchedule(scheduleTypes[currentIndex + 1]);
                  }}
                  className="space-y-4 touch-pan-y"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedSchedule}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {filteredRoutes.map(r => (
                        <RouteCard
                          key={`${r.id}-${r.scheduleType}`}
                          route={r}
                          isFavorite={favorites.includes(r.id)}
                          onToggleFavorite={(e:any) => { e.stopPropagation(); toggleFavorite(r.id); }}
                          onSelect={() => setSelectedRouteId(r.id)}
                          now={now}
                          busAssignments={busAssignments}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'routes' && (
                <motion.div key="routes" {...fadeIn} className="space-y-4">
                  {allRoutes.reduce((acc: Route[], c) => { if(!acc.find(i => i.name === c.name)) acc.push(c); return acc; }, []).filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                    <motion.div
                      layout
                      whileTap={{ scale: 0.98 }}
                      key={r.id}
                      onClick={() => { setSelectedSchedule(r.scheduleType); setSelectedRouteId(r.id); }}
                      className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="bg-slate-50 p-3.5 rounded-2xl text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                          <MapPin className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 uppercase tracking-tight">{r.name}</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 line-clamp-1">{r.details}</p>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-200 w-6 h-6 group-hover:text-emerald-500 transition-colors" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'reminders' && (
                <motion.div key="alerts" {...fadeIn} className="space-y-4">
                  <div className="bg-slate-900 p-8 rounded-[3rem] flex items-center justify-between shadow-2xl mb-4 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><Bell className="w-6 h-6" /></div>
                      <div>
                        <h2 className="font-black text-white text-xl uppercase tracking-tight">Active Alerts</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Stay Notified</p>
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCustomForm(true)} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-emerald-400 border border-white/5 transition-all z-10"><Plus className="w-7 h-7" /></motion.button>
                  </div>
                  {reminders.length > 0 ? reminders.map(r => (
                    <motion.div layout key={r.id} className="bg-white p-7 rounded-[3rem] border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-100 transition-all">
                      <div className="flex items-center gap-5 flex-1 cursor-pointer" onClick={() => setEditingReminder(r)}>
                        <div className="bg-slate-50 p-4 rounded-[1.2rem] text-slate-300"><Clock className="w-7 h-7" /></div>
                        <div>
                          <div className="flex items-center gap-2 mb-1"><h4 className="font-black text-slate-800 text-2xl leading-none">{r.busTime}</h4><span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">-{r.minutesBefore}M</span></div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{r.routeName}</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); setReminders(prev => prev.filter(item => item.id !== r.id)); addToast('Alert Removed', 'Reminder deleted', 'info'); }}
                        className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <X className="w-6 h-6" />
                      </motion.button>
                    </motion.div>
                  )) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                      <Bell className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No active bus alerts</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'notice' && (
                <motion.div key="notices" {...fadeIn} className="space-y-4">
                  <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl mb-4 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10 mb-4">
                      <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg"><Megaphone className="w-6 h-6" /></div>
                      <div>
                        <h2 className="font-black text-white text-xl uppercase tracking-tight">Notice Board</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Official Updates</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDeletedNoticeIds({})}
                      className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border border-white/5 active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Restore Recent</span>
                    </motion.button>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {allNotices.filter(n => !deletedNoticeIds[n.id]).map(n => ({ ...n, isPinned: pinnedNoticeIds.includes(n.id) })).sort((a,b) => (a.isPinned ? -1 : 1)).map(n => (
                      <NoticeCard
                        key={n.id}
                        notice={n}
                        onDelete={() => { setDeletedNoticeIds(prev => ({ ...prev, [n.id]: Date.now() })); addToast('Notice Hidden', 'Can be restored', 'info'); }}
                        onTogglePin={() => setPinnedNoticeIds(p => p.includes(n.id) ? p.filter(id => id !== n.id) : [...p, n.id])}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === 'lf' && (
                <LostFoundScreen posts={lfPosts} user={userProfile} onAddToast={addToast} />
              )}
            </AnimatePresence>
          </motion.main>

          {/* --- FLOATING TAB NAV --- */}
          <nav className="fixed bottom-6 left-5 right-5 h-20 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] flex items-center justify-around z-[100] shadow-2xl">
            <TabButton active={activeTab === 'schedule'} icon={<Calendar className="w-5 h-5" />} label="Schedule" onClick={() => setActiveTab('schedule')} />
            <TabButton active={activeTab === 'routes'} icon={<MapPin className="w-5 h-5" />} label="Routes" onClick={() => setActiveTab('routes')} />
            <TabButton active={activeTab === 'reminders'} icon={<Bell className="w-5 h-5" />} label="Alerts" onClick={() => setActiveTab('reminders')} />
            <TabButton active={activeTab === 'lf'} icon={<Search className="w-5 h-5" />} label="Lost" onClick={() => setActiveTab('lf')} />
            <TabButton active={activeTab === 'notice'} icon={<Megaphone className="w-5 h-5" />} label="Notice" onClick={() => setActiveTab('notice')} />
          </nav>

          <AnimatePresence>
            {selectedRoute && (
              <RouteDetailModal
                route={selectedRoute}
                onClose={() => setSelectedRouteId(null)}
                onAddReminder={(t:string) => setReminderConfig({ route: selectedRoute, time: t })}
                onOpenAssignments={(t:string, names:string[]) => setAssignmentConfig({ route: selectedRoute, time: t, currentNames: names })}
                showTimings={activeTab === 'schedule'}
                assignments={busAssignments?.[selectedRoute.id]}
              />
            )}
            {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} onShowService={() => { setShowServiceStatus(true); setShowMenu(false); }} onShowPrivacy={() => { setShowPrivacyPolicy(true); setShowMenu(false); }} onShowProfile={() => { setShowProfile(true); setShowMenu(false); }} onShowStudentInfo={() => { setShowStudentInfo(true); setShowMenu(false); }} onSignOut={handleSignOut} userProfile={userProfile} />}
            {showStudentInfo && userProfile?.isAdmin && (
              <StudentInformationModal users={allStudents} onClose={() => setShowStudentInfo(false)} />
            )}
            {showProfile && userProfile && (
              <ProfileModal
                profile={userProfile}
                onClose={() => setShowProfile(false)}
                onSave={async (updated) => {
                  try {
                    await firebaseActions.saveProfile(updated);
                    addToast('Profile Updated', 'Your changes have been saved', 'success');
                  } catch (e: any) {
                    addToast('Sync Error', 'Failed to update cloud profile', 'alert');
                  }
                }}
              />
            )}
            {assignmentConfig && <BusAssignmentModal route={assignmentConfig.route} time={assignmentConfig.time} busAssignments={busAssignments} onClose={() => setAssignmentConfig(null)} />}
            {showPrivacyPolicy && <PrivacyPolicyModal onClose={() => setShowPrivacyPolicy(false)} />}
            {showServiceStatus && <ServiceStatusModal onClose={() => setShowServiceStatus(false)} />}
            {showCustomForm && <CustomReminderModal onClose={() => setShowCustomForm(false)} onSave={addOrUpdateReminder} allRoutes={allRoutes} />}
            {(reminderConfig || editingReminder) && (
              <ReminderSettingsModal
                route={reminderConfig?.route || allRoutes.find(r => r.id === editingReminder?.routeId) || ROUTES[0]}
                time={reminderConfig?.time || editingReminder?.busTime || ''}
                initialMinutes={editingReminder?.minutesBefore || 15}
                isEditing={!!editingReminder}
                onClose={() => { setReminderConfig(null); setEditingReminder(null); }}
                onSave={(min:number) => addOrUpdateReminder(reminderConfig?.route || allRoutes.find(route => route.id === editingReminder?.routeId)!, reminderConfig?.time || editingReminder?.busTime || '', min)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- REFACTORED PREMIUM COMPONENTS ---

function RouteCard({ route, isFavorite, onToggleFavorite, onSelect, now, busAssignments }: any) {
  const getNextForDir = (times: BusTime[], dir: string) => {
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const uniqueMap = new Map<string, BusTime>();
    (times || []).forEach(t => uniqueMap.set(t.time, t));
    const dynamic = busAssignments?.[route.id]?.[dir];
    if (dynamic) Object.keys(dynamic).forEach(k => { if (k.includes(':')) uniqueMap.set(k, { time: k }); });
    const sorted = Array.from(uniqueMap.values()).map(t => ({ ...t, mins: getMinutesFromTime(t.time) })).filter(t => t.mins !== -1).sort((a, b) => a.mins - b.mins);
    if (sorted.length === 0) return null;
    let next = sorted.find(t => t.mins > currentMins);
    let isTomorrow = false; if (!next) { next = sorted[0]; isTomorrow = true; }
    const diff = isTomorrow ? (next.mins + 1440) - currentMins : next.mins - currentMins;
    const h = Math.floor(diff/60); const min = diff % 60;
    return { time: next.time, countdown: h > 0 ? `${h}H ${min}M` : `${min}M` };
  };

  const nextTo = getNextForDir(route.toDSC, 'toDSC');
  const nextFrom = getNextForDir(route.fromDSC, 'fromDSC');

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-100 rounded-[3rem] p-7 shadow-sm cursor-pointer active:shadow-inner hover:border-emerald-100 transition-all relative overflow-hidden"
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">{route.id}</span>
            <span className="text-slate-300 text-[8px] font-black uppercase tracking-widest">• {route.scheduleType}</span>
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{route.name}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">{route.details}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isFavorite ? 'bg-amber-50 text-amber-600 shadow-md' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
        >
          <Star className={`w-5.5 h-5.5 ${isFavorite ? 'fill-current' : ''}`} />
        </motion.button>
      </div>
      <div className="space-y-4">
        <DirectionChip icon={<Bus />} label="TO DSC" data={nextTo} color="emerald" />
        <DirectionChip icon={<Home />} label="FROM DSC" data={nextFrom} color="orange" />
      </div>
    </motion.div>
  );
}

function DirectionChip({ icon, label, data, color }: any) {
  const isEmerald = color === 'emerald';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${isEmerald ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
          {React.cloneElement(icon, { className: "w-5.5 h-5.5" })}
        </div>
        <div>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{data ? `Next at ${data.time}` : 'Updating...'}</p>
        </div>
      </div>
      {data && (
        <div className={`${isEmerald ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'} px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-tighter`}>
          {data.countdown}
        </div>
      )}
    </div>
  );
}

function RouteDetailModal({ route, onClose, onAddReminder, onOpenAssignments, showTimings, assignments }: any) {
  const stops = useMemo(() => {
    return (route.details || '').split(/\s*(?:<>|>|-)\s*/).filter(Boolean);
  }, [route.details]);

  const sortedTo = useMemo(() => [...(route.toDSC || [])].sort((a,b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time)), [route.toDSC]);
  const sortedFrom = useMemo(() => [...(route.fromDSC || [])].sort((a,b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time)), [route.fromDSC]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-end justify-center" onClick={onClose}>
      <motion.div {...PAN_GESTURE_PROPS(onClose)} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={springTransition} className="bg-white w-full max-w-lg rounded-t-[3.5rem] max-h-[95vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-start">
          <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{route.name}</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{route.id} • {route.scheduleType}</p></div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"><X className="w-6 h-6 text-slate-500" /></motion.button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-10 no-scrollbar">
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><MapPin className="text-emerald-500 w-3 h-3" /> FULL ROUTE PATH</h3>
            <div className="relative pl-7 border-l-2 border-slate-50 space-y-8 ml-1 pb-4">
              {stops.map((s: string, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-600 uppercase tracking-tight relative">
                  <div className="absolute -left-[2.1rem] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-200 bg-white" />{s}
                </div>
              ))}
            </div>
          </div>
          {showTimings && (
            <div className="space-y-10">
              <TimeSection title="BUS TO DSC" times={sortedTo} onAddReminder={onAddReminder} assignments={assignments?.toDSC} onOpenAssignments={onOpenAssignments} />
              <TimeSection title="RETURN FROM DSC" times={sortedFrom} onAddReminder={onAddReminder} assignments={assignments?.fromDSC} onOpenAssignments={onOpenAssignments} />
            </div>
          )}
          {route.mapEmbedUrl && (
            <div className="pt-4 pb-20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MapPin className="text-emerald-500 w-4 h-4" /> LIVE TRACKING VIEW
                </h3>
                <button
                  onClick={() => window.open(route.mapEmbedUrl, '_blank')}
                  className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100"
                >
                  OPEN IN BROWSER
                </button>
              </div>
              <div className="w-full h-[450px] rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-2xl relative group">
                <iframe
                  src={route.mapEmbedUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  title="Route Map"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TimeSection({ title, times, onAddReminder, assignments, onOpenAssignments }: any) {
  return (
    <div>
      <h3 className="text-[10px] font-black uppercase text-slate-300 mb-5 tracking-widest ml-1">{title}</h3>
      <div className="grid gap-4">
        {times.length > 0 ? times.map((t: any, i: number) => {
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          const match = assignments && Object.keys(assignments).find(k => norm(k).includes(norm(t.time)) || norm(t.time).includes(norm(k)));
          const busNames = match ? (Array.isArray(assignments[match]) ? assignments[match] : (typeof assignments[match] === 'string' ? assignments[match].split(',').map((s: any) => s.trim()) : [assignments[match]])) : [];
          return (
            <motion.button
              layout
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenAssignments(t.time, busNames)}
              className="w-full p-6 bg-slate-50 rounded-[2.5rem] text-left border border-slate-100 hover:border-emerald-200 transition-all flex flex-col gap-4 shadow-sm group"
            >
              <div className="flex justify-between items-center w-full">
                <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-70">DEPARTURE</p><p className="text-2xl font-black text-slate-800 italic uppercase leading-none">{t.time}</p></div>
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  onClick={e => { e.stopPropagation(); onAddReminder(t.time); }}
                  className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"
                >
                  <Bell className="w-5.5 h-5.5" />
                </motion.div>
              </div>
              <div className="pt-3 border-t border-slate-200/50 w-full flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter animate-pulse">Tap to See Assigned Buses</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </motion.button>
          );
        }) : <p className="text-[10px] font-black text-slate-300 italic uppercase tracking-widest ml-1">No timings scheduled</p>}
      </div>
    </div>
  );
}

function LostFoundScreen({ posts, user, onAddToast }: { posts: LostFoundPost[], user: UserProfile, onAddToast: any }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');

  const visiblePosts = useMemo(() => {
    return posts.filter(p => {
      const matchFilter = filter === 'all' || p.status === filter;
      const canSee = p.isApproved || user?.isAdmin || p.posterId === user?.uid;
      return canSee && matchFilter;
    });
  }, [posts, filter, user]);

  return (
    <motion.div key="lf-screen" {...fadeIn} className="space-y-6 pb-20">
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10 mb-6">
          <div className="flex items-center gap-5">
            <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><Search className="w-6 h-6" /></div>
            <div>
              <h2 className="font-black text-white text-xl uppercase tracking-tight">Lost & Found</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Community Support</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreate(true)}
            className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
          </motion.button>
        </div>

        <div className="flex gap-2 relative z-10">
          {(['all', 'lost', 'found'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${filter === f ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-slate-400 border-white/10'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {visiblePosts.length > 0 ? visiblePosts.map(p => (
          <LFPostCard key={p.id} post={p} user={user} onAddToast={onAddToast} />
        )) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No posts found</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateLFPostModal user={user} onClose={() => setShowCreate(false)} onAddToast={onAddToast} />}
      </AnimatePresence>
    </motion.div>
  );
}

function LFPostCard({ post, user, onAddToast }: { post: LostFoundPost, user: UserProfile, onAddToast: any }) {
  const [showComments, setShowCreateComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleClaim = () => {
    const subject = encodeURIComponent(`DIU Transport: Claim Request for ${post.title}`);
    const body = encodeURIComponent(`Hi ${post.posterName},\n\nI am contacting you regarding your ${post.status} item post: "${post.title}".\n\nStudent Details:\nName: ${user.fullName}\nID: ${user.studentId}\n\nPlease let me know if we can meet.`);
    window.open(`mailto:${post.posterEmail}?subject=${subject}&body=${body}`);
    onAddToast('Email Prepared', 'Opening your mail app...', 'info');
  };

  const handleCall = () => {
    window.open(`tel:${post.posterPhone}`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await firebaseActions.deleteLFPost(post.id);
      onAddToast('Post Deleted', 'Post has been removed', 'info');
    }
  };

  const handleApprove = async () => {
    await firebaseActions.approveLFPost(post.id);
    onAddToast('Post Approved', 'Post is now visible to everyone', 'success');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await firebaseActions.addLFComment(post.id, {
      userId: user.uid,
      userName: user.fullName,
      userPhoto: user.photoUrl,
      text: commentText.trim()
    });
    setCommentText('');
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm">
            <img src={post.posterPhoto} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{post.posterName}</h4>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{new Date(post.createdAt).toLocaleDateString()} • {post.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!post.isApproved && user.isAdmin && (
            <button onClick={handleApprove} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"><CheckCircle className="w-4.5 h-4.5" /></button>
          )}
          {(user.isAdmin || post.posterId === user.uid) && (
            <button onClick={handleDelete} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash className="w-4.5 h-4.5" /></button>
          )}
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${post.status === 'lost' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{post.status}</span>
        </div>
      </div>

      {!post.isApproved && <div className="mb-4 bg-amber-50 text-amber-600 p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center border border-amber-100">Pending Admin Approval</div>}

      <div className="space-y-3 mb-6">
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{post.title}</h3>
        <p className="text-xs font-medium text-slate-500 leading-relaxed">{post.description}</p>
        {post.imageUrl && (
          <div className="w-full h-60 rounded-3xl overflow-hidden border border-slate-50 shadow-inner mt-4">
            <img src={post.imageUrl} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {user.isAdmin && (
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin View:</p>
           <p className="text-[10px] font-bold text-slate-600">Email: {post.posterEmail}</p>
           <p className="text-[10px] font-bold text-slate-600">Phone: {post.posterPhone}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-50">
        <button onClick={handleClaim} className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"><Mail className="w-3.5 h-3.5" /> Claim</button>
        <button onClick={handleCall} className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"><Phone className="w-3.5 h-3.5" /> Call</button>
        <button onClick={() => setShowCreateComments(!showComments)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all"><MessageSquare className="w-5 h-5" /></button>
      </div>

      {showComments && (
        <div className="mt-6 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            {post.comments ? Object.entries(post.comments).sort((a,b) => (a[1] as any).createdAt - (b[1] as any).createdAt).map(([cid, c]: any) => (
              <div key={cid} className="flex gap-3">
                <img src={c.userPhoto} className="w-8 h-8 rounded-xl object-cover border border-slate-100" />
                <div className="bg-slate-50 p-3 rounded-2xl flex-1 border border-slate-100/50">
                  <p className="text-[9px] font-black text-slate-800 uppercase tracking-tight mb-1">{c.userName}</p>
                  <p className="text-[11px] font-medium text-slate-500 leading-tight">{c.text}</p>
                </div>
              </div>
            )) : <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center py-2">No comments yet</p>}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none"
            />
            <button type="submit" className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm"><ArrowRight className="w-4 h-4" /></button>
          </form>
        </div>
      )}
    </motion.div>
  );
}

function CreateLFPostModal({ user, onClose, onAddToast }: { user: UserProfile, onClose: () => void, onAddToast: any }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'lost' | 'found'>('lost');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { alert('Phone number is mandatory'); return; }
    setLoading(true);
    try {
      await firebaseActions.createLFPost({
        posterId: user.uid,
        posterName: user.fullName,
        posterPhoto: user.photoUrl,
        posterEmail: user.email,
        posterPhone: phone.trim(),
        title: title.trim(),
        description: desc.trim(),
        imageUrl: image,
        status,
        isApproved: !!user.isAdmin
      });
      onAddToast('Post Submitted', user.isAdmin ? 'Published instantly' : 'Pending admin approval', 'success');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-end justify-center" onClick={onClose}>
      <motion.div {...PAN_GESTURE_PROPS(onClose)} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={springTransition} className="bg-white w-full max-w-lg rounded-t-[3.5rem] max-h-[90vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Create LF Post</h2>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-xl text-slate-500"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="flex gap-2">
            <button type="button" onClick={() => setStatus('lost')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${status === 'lost' ? 'bg-red-50 text-red-500 border-red-100 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Lost Item</button>
            <button type="button" onClick={() => setStatus('found')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${status === 'found' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>Found Item</button>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="What did you lose/find?" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} required rows={4} placeholder="Add details like location, time, etc." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Phone Number (Mandatory)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="017..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none" />
          </div>
          <div className="space-y-4">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Item Image (Optional)</label>
            <div onClick={() => fileRef.current?.click()} className="w-full h-40 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
              {image ? <img src={image} className="w-full h-full object-cover rounded-3xl" /> : <Camera className="w-8 h-8 text-slate-300" />}
            </div>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImage} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Post'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function NoticeCard({ notice, onDelete, onTogglePin }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -50 }} className="relative mb-3 group overflow-hidden rounded-[3rem]">
      <div className="absolute inset-[2px] bg-red-500 rounded-[2.8rem] flex items-center justify-end px-10 text-white"><Trash2 className="w-6 h-6" /></div>
      <motion.div drag="x" dragConstraints={{ left: -100, right: 0 }} onDragEnd={(_, info) => info.offset.x < -70 && onDelete()} className={`relative z-10 bg-white p-7 rounded-[3rem] border ${notice.isPinned ? 'border-amber-200 shadow-amber-100/40' : 'border-slate-100'} shadow-sm cursor-pointer transition-all active:bg-slate-50`} onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-5 mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${notice.isPinned ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2"><h3 className="font-black text-slate-800 uppercase tracking-tight leading-tight">{notice.title}</h3>{notice.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-current" />}</div>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">{notice.date} • {notice.time}</p>
          </div>
        </div>
        <p className={`text-[13px] font-medium text-slate-500 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{notice.description}</p>
      </motion.div>
    </motion.div>
  );
}

function BusAssignmentModal({ route, time, busAssignments, onClose }: any) {
  const busNames = useMemo(() => {
    if (!busAssignments || !route?.id) return [];
    const routeData = busAssignments[route.id]; if (!routeData) return [];
    const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '').trim(); const target = norm(time);
    const lookup = (d: any) => { if (!d) return null; const k = Object.keys(d).find(key => norm(key).includes(target) || target.includes(norm(key))); return k ? d[k] : null; };
    const res = lookup(routeData.toDSC) || lookup(routeData.fromDSC); if (!res) return [];
    return Array.isArray(res) ? res : (typeof res === 'string' ? res.split(',').map(s => s.trim()).filter(Boolean) : [res]);
  }, [busAssignments, route, time]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springTransition} className="bg-white w-full max-w-sm rounded-[3rem] p-9 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-5 border border-emerald-100 text-emerald-600"><Bus className="w-10 h-10" /></div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Bus List</h2>
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-2">{route.name} • {time}</p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {busNames.length > 0 ? busNames.map((n: string, i: number) => (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} key={i} className="bg-emerald-50 text-emerald-700 text-sm font-black px-5 py-3 rounded-[1.2rem] uppercase border border-emerald-100 shadow-sm">
              {n}
            </motion.span>
          )) : <p className="text-sm font-black text-slate-400 italic py-6 text-center w-full">Bus name will be updated soon</p>}
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full mt-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all">Close List</motion.button>
      </motion.div>
    </motion.div>
  );
}

function ReminderSettingsModal({ route, time, initialMinutes, isEditing, onClose, onSave }: any) {
  const [m, setM] = useState(initialMinutes);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 pb-24" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springTransition} className="bg-white w-full max-w-sm rounded-[3rem] p-9 shadow-2xl touch-none" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-5 border border-emerald-100 text-emerald-600"><Bell className="w-10 h-10" /></div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{isEditing ? 'Edit Alert' : 'Set Alert'}</h2>
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-2">{route.name} • {time}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[5, 10, 15, 30, 45, 60].map(val => (
            <button key={val} onClick={() => setM(val)} className={`py-4 rounded-[1.2rem] text-sm font-black transition-all ${m === val ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{val}M</button>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onSave(m)} className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-200 transition-all">Set Alarm</motion.button>
      </motion.div>
    </motion.div>
  );
}

function ServiceStatusModal({ onClose }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 pb-24" onClick={onClose}>
      <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-9 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-5 mb-8">
          <div className="bg-emerald-500 p-3.5 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><Bus className="w-7 h-7" /></div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Status</h2>
        </div>
        <div className="space-y-7">
          <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] flex items-center gap-5">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-200"></div>
            <p className="text-sm font-black text-emerald-800 uppercase tracking-tight">Service: Running Smoothly</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-slate-50 p-7 rounded-[2rem] border border-slate-100">
              <p className="text-3xl font-black text-slate-800 italic">42</p>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1 block">Active Fleet</span>
            </div>
            <div className="bg-slate-50 p-7 rounded-[2rem] border border-slate-100">
              <p className="text-3xl font-black text-slate-800 italic">100%</p>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1 block">Coverage</span>
            </div>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full mt-10 bg-slate-900 text-white py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-lg transition-all">Close Status</motion.button>
      </motion.div>
    </motion.div>
  );
}

function StudentInformationModal({ users, onClose }: { users: UserProfile[], onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.studentId.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()) ||
    u.batch.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-end justify-center" onClick={onClose}>
      <motion.div {...PAN_GESTURE_PROPS(onClose)} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={springTransition} className="bg-white w-full max-w-lg rounded-t-[3.5rem] h-[95vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Student Information</h2>
            <button onClick={onClose} className="p-4 bg-slate-100 rounded-2xl text-slate-500"><X size={24} /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-emerald-200 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-4 no-scrollbar pt-4">
          {filtered.length > 0 ? filtered.map(u => (
            <div key={u.uid} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100/50 flex flex-col gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={u.photoUrl} className="w-full h-full object-cover" alt={u.fullName} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">{u.fullName}</h4>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{u.studentId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200/30">
                <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Department</p><p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{u.department}</p></div>
                <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Batch</p><p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{u.batch}</p></div>
                <div className="col-span-2"><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Email</p><p className="text-[11px] font-bold text-slate-600 tracking-tight">{u.email}</p></div>
                <div className="col-span-2"><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Phone</p><p className="text-[11px] font-bold text-slate-600 tracking-tight">{u.phone}</p></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => window.open(`tel:${u.phone}`)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-black uppercase text-[9px] tracking-widest shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Phone size={14} /> Call</button>
                <button onClick={() => window.open(`mailto:${u.email}`)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-black uppercase text-[9px] tracking-widest shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Mail size={14} /> Email</button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No students found</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileModal({ profile, onClose, onSave }: { profile: UserProfile, onClose: () => void, onSave: (u: UserProfile) => void }) {
  // Use a single state object to prevent multiple re-renders and potential race conditions
  const [formData, setFormData] = useState({
    fullName: profile.fullName || '',
    studentId: profile.studentId || '',
    department: profile.department || '',
    batch: profile.batch || '',
    phone: profile.phone || '',
    photoUrl: profile.photoUrl || ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      // Increased limit to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('Image too large (max 10MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const handleSave = () => {
    if (!formData.fullName || !formData.fullName.trim()) {
      alert("Full Name is required");
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert("Phone number is required");
      return;
    }
    onSave({
      ...profile,
      fullName: formData.fullName.trim(),
      studentId: (formData.studentId || '').trim(),
      department: (formData.department || '').trim(),
      batch: (formData.batch || '').trim(),
      phone: formData.phone.trim(),
      photoUrl: formData.photoUrl
    });
    setIsEditing(false);
  };

  // Robust check for profile existence to prevent white screen
  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        {...PAN_GESTURE_PROPS(onClose)}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springTransition}
        className="bg-white w-full max-w-lg rounded-t-[3.5rem] max-h-[95vh] flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Student Profile</h2>
          <button
            onClick={onClose}
            className="p-4 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-8 no-scrollbar pt-8">
          <div className="flex flex-col items-center">
            <div
              className={`relative group ${isEditing ? 'cursor-pointer' : ''}`}
              onClick={() => isEditing && fileInputRef.current?.click()}
            >
              <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center bg-slate-100 relative">
                <img
                  src={formData.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`}
                  className="w-full h-full object-cover"
                  alt="Profile"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`;
                  }}
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white backdrop-blur-[2px]">
                    <Camera size={32} />
                  </div>
                )}
              </div>
              {isEditing && (
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImagePick}
                />
              )}
            </div>
            {isEditing && (
              <p className="text-[10px] font-black text-emerald-600 uppercase mt-4 tracking-widest animate-pulse">
                Tap photo to change
              </p>
            )}
          </div>

          <div className="space-y-6">
            <ProfileField
              label="Full Name"
              value={formData.fullName}
              isEditing={isEditing}
              onChange={(val: string) => setFormData(p => ({ ...p, fullName: val }))}
              icon={<UserIcon size={20} />}
            />
            <ProfileField
              label="Student ID"
              value={formData.studentId}
              isEditing={isEditing}
              onChange={(val: string) => setFormData(p => ({ ...p, studentId: val }))}
              icon={<IdCard size={20} />}
            />
            <ProfileField
              label="Department"
              value={formData.department}
              isEditing={isEditing}
              onChange={(val: string) => setFormData(p => ({ ...p, department: val }))}
              icon={<GraduationCap size={20} />}
            />
            <ProfileField
              label="Batch"
              value={formData.batch}
              isEditing={isEditing}
              onChange={(val: string) => setFormData(p => ({ ...p, batch: val }))}
              icon={<Users size={20} />}
            />
            <ProfileField
              label="Phone Number"
              value={formData.phone}
              isEditing={isEditing}
              onChange={(val: string) => setFormData(p => ({ ...p, phone: val }))}
              icon={<Phone size={20} />}
            />
            <ProfileField
              label="Email Address"
              value={profile.email || ''}
              isEditing={false}
              onChange={() => {}}
              icon={<Mail size={20} />}
            />
          </div>

          <div className="pt-6">
            {isEditing ? (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      fullName: profile.fullName || '',
                      studentId: profile.studentId || '',
                      department: profile.department || '',
                      batch: profile.batch || '',
                      photoUrl: profile.photoUrl || ''
                    });
                  }}
                  className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-200 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                Edit Profile Information
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileField({ label, value, isEditing, onChange, icon }: { label: string, value: string, isEditing: boolean, onChange: (v: string) => void, icon: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
          {icon}
        </div>
        {isEditing ? (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-50 border-2 border-emerald-100 rounded-[1.5rem] py-4.5 pl-14 pr-6 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
            placeholder={`Enter ${label}`}
          />
        ) : (
          <div className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-4.5 pl-14 pr-6 text-sm font-bold text-slate-600 truncate">
            {value || 'Not provided'}
          </div>
        )}
      </div>
    </div>
  );
}



function PrivacyPolicyModal({ onClose }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 pb-24" onClick={onClose}>
      <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-9 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-5 mb-8">
          <div className="bg-emerald-100 p-4 rounded-[1.5rem] text-emerald-600"><Shield className="w-7 h-7" /></div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Privacy</h2>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed mb-10 font-medium">Reminders are stored locally. No personal tracking implemented.</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full bg-slate-100 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition-all">Got it</motion.button>
      </motion.div>
    </motion.div>
  );
}

function MenuOverlay({ onClose, onShowService, onShowPrivacy, onShowProfile, onShowStudentInfo, onSignOut, userProfile }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={springTransition} className="relative bg-white w-full max-w-[280px] h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 pb-8 bg-slate-900 text-white flex justify-between items-start overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter">Menu</h2>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] mt-1">v2.6 • Transporter</p>
          </div>
          <motion.button whileTap={{ scale: 0.8 }} onClick={onClose} className="p-3 bg-white/5 rounded-2xl relative z-10 hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></motion.button>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-5 space-y-4 no-scrollbar">
          {userProfile && (
            <button
              onClick={onShowProfile}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100 mb-2 group active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                <img src={userProfile.photoUrl} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-800 uppercase line-clamp-1">{userProfile.fullName}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">View Profile</p>
              </div>
            </button>
          )}

          {userProfile?.isAdmin && (
            <MenuButton icon={<Users className="w-5.5 h-5.5" />} label="Student Info" description="Manage user records" onClick={onShowStudentInfo} />
          )}

          <MenuButton icon={<Bus className="w-5.5 h-5.5" />} label="Bus Status" description="Live fleet tracking" onClick={onShowService} />
          <MenuButton icon={<Shield className="w-5.5 h-5.5" />} label="Privacy" description="Security details" onClick={onShowPrivacy} />
          <MenuButton icon={<Mail className="w-5.5 h-5.5" />} label="Contact Support" description="TRANSPORT OFFICE" onClick={() => window.open('mailto:transportoffice@daffodilvarsity.edu.bd')} />

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-5 p-5 rounded-[2rem] text-red-500 hover:bg-red-50 transition-all text-left"
          >
            <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100 shadow-sm"><X className="w-5.5 h-5.5" /></div>
            <div>
              <p className="text-sm font-black uppercase leading-none mb-1.5">Sign Out</p>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">End Session</p>
            </div>
          </button>

          <div className="pt-8 mt-4 border-t border-slate-100">
            <div className="flex flex-col items-center text-center">
              <motion.div whileHover={{ scale: 1.05 }} className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden mb-4 ring-4 ring-emerald-500/10">
                <img src="/developer.jpg" alt="Imran Un Nafi" className="w-full h-full object-cover" />
              </motion.div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-1">Imran Un Nafi</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight mb-6">Dept. of SWE, Batch 42</p>
              <div className="flex gap-4">
                <SocialButton icon={<Mail className="w-5 h-5" />} onClick={() => window.open('mailto:un241-35-170@diu.edu.bd')} />
                <SocialButton icon={<Linkedin className="w-5 h-5" />} onClick={() => window.open('https://www.linkedin.com/in/imran-un-nafi-201b04366')} />
                <SocialButton icon={<MessageCircle className="w-5 h-5" />} onClick={() => window.open('https://wa.me/8801759709101')} />
              </div>
              <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.4em] mt-8 pb-4">Developed By</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SocialButton({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) {
  return (<motion.button whileTap={{ scale: 0.9 }} onClick={onClick} className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all active:scale-90">{icon}</motion.button>);
}

function MenuButton({ icon, label, description, onClick }: any) {
  return (<motion.button whileTap={{ scale: 0.98 }} onClick={onClick} className="w-full flex items-center gap-5 p-5 rounded-[2rem] hover:bg-emerald-50 group transition-all text-left border border-transparent hover:border-emerald-100/50"><div className="bg-slate-50 p-3.5 rounded-2xl text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all border border-slate-100 shadow-sm">{icon}</div><div><p className="text-sm font-black text-slate-800 uppercase leading-none mb-1.5">{label}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p></div></motion.button>);
}

function CustomReminderModal({ onClose, onSave, allRoutes }: any) {
  const [selectedType, setSelectedType] = useState<ScheduleType>(ScheduleType.REGULAR);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [direction, setDirection] = useState<'TO DSC' | 'FROM DSC'>('TO DSC');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [open, setOpen] = useState(false);
  const filteredRoutes = useMemo(() => allRoutes.filter((r: Route) => r.scheduleType === selectedType), [allRoutes, selectedType]);
  const avail = useMemo(() => { if (!selectedRoute) return []; return direction === 'TO DSC' ? selectedRoute.toDSC.map(t => t.time) : selectedRoute.fromDSC.map(t => t.time); }, [selectedRoute, direction]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={springTransition} className="bg-white w-full max-w-md rounded-[3rem] p-9 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-9"><div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600"><Plus className="w-6 h-6" /></div><h2 className="text-sm font-black uppercase text-slate-800 tracking-widest">Custom Alert</h2></div>
        <div className="space-y-7 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
          <div><label className="text-[10px] font-black uppercase text-slate-300 block mb-3 tracking-[0.2em] ml-1">ROUTE TYPE</label><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{[ScheduleType.REGULAR, ScheduleType.EXAM, ScheduleType.FRIDAY, ScheduleType.SHUTTLE, ScheduleType.RAMADAN].map(type => (<button key={type} onClick={() => { setSelectedType(type); setSelectedRoute(null); setTime(''); }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border ${selectedType === type ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{type === ScheduleType.SHUTTLE ? 'Shuttle' : type}</button>))}</div></div>
          <div className="relative"><label className="text-[10px] font-black uppercase text-slate-300 block mb-2 tracking-[0.2em] ml-1">ROUTE</label><button onClick={() => setOpen(!open)} className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4.5 px-7 text-left text-sm font-bold flex justify-between items-center"><span className={selectedRoute ? 'text-slate-800' : 'text-slate-400'}>{selectedRoute ? selectedRoute.name : 'Choose Route'}</span><ChevronRight className={`w-5 h-5 text-slate-300 transition-transform ${open ? 'rotate-90' : ''}`} /></button><AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[80] max-h-48 overflow-y-auto no-scrollbar">{filteredRoutes.map((r:any) => <button key={`${r.id}-${r.scheduleType}`} onClick={() => { setSelectedRoute(r); setOpen(false); setTime(''); }} className="w-full text-left px-7 py-4 text-xs font-bold hover:bg-emerald-50 border-b border-slate-50 last:border-none flex justify-between items-center uppercase text-slate-600 tracking-tight"><span>{r.name}</span><span className="text-[9px] font-black opacity-30">{r.id}</span></button>)}</motion.div>}</AnimatePresence></div>
          <div><label className="text-[10px] font-black uppercase text-slate-300 block mb-2 tracking-[0.2em] ml-1">DIRECTION</label><div className="bg-slate-50 border border-slate-100 rounded-3xl p-1.5 flex gap-1"><button onClick={() => setDirection('TO DSC')} className={`flex-1 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase transition-all ${direction === 'TO DSC' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>To DSC</button><button onClick={() => setDirection('FROM DSC')} className={`flex-1 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase transition-all ${direction === 'FROM DSC' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>From</button></div></div>
          <div><label className="text-[10px] font-black uppercase text-slate-300 block mb-2 tracking-[0.2em] ml-1">TIME</label><select value={time} onChange={e => setTime(e.target.value)} disabled={!selectedRoute} className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4.5 px-7 text-sm font-bold outline-none appearance-none disabled:opacity-40 text-slate-700 uppercase"><option value="">Pick Time Slot</option>{avail.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><div className="flex justify-between items-center mb-2 px-1"><label className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">MINUTES AHEAD</label><span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{minutes}m Before</span></div><input type="range" min="0" max="180" step="1" value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" /><div className="flex justify-between mt-2 px-1 text-[8px] font-bold text-slate-300 uppercase"><span>0m</span><span>1.5H</span><span>3H</span></div></div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => selectedRoute && time && onSave(selectedRoute, time, minutes, direction, '')} disabled={!selectedRoute || !time} className="w-full py-5.5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl disabled:opacity-30 transition-all active:scale-95">Set Alert</motion.button>
        </div>
        <motion.button whileTap={{ scale: 0.8 }} onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800 transition-colors"><X className="w-6 h-6" /></motion.button>
      </motion.div>
    </motion.div>
  );
}
