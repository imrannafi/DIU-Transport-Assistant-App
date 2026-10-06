import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, update, get } from "firebase/database";
import { getAuth, onAuthStateChanged, User, sendPasswordResetEmail } from "firebase/auth";
import { useState, useEffect } from "react";
import { Route, Notice, ScheduleType, BusTime, LostFoundPost } from "../types";

// Firebase configuration (Verified for Project: diutransport-77561)
const firebaseConfig = {
  apiKey: "AIzaSyBflpQWaQwM_C8jX-Naaxzkb1sxU62ROrc",
  authDomain: "diutransport-77561.firebaseapp.com",
  databaseURL: "https://diutransport-77561-default-rtdb.firebaseio.com",
  projectId: "diutransport-77561",
  storageBucket: "diutransport-77561.appspot.com",
  messagingSenderId: "1068395186786",
  appId: "1:1068395186786:android:68f4c4344f7475f6669f3b"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app, firebaseConfig.databaseURL);
export const auth = getAuth(app);

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  studentId: string;
  department: string;
  batch: string;
  photoUrl: string;
  phone: string;
  createdAt: number;
  isAdmin?: boolean;
}

export interface BusAssignments {
  [routeId: string]: {
    toDSC: { [time: string]: string };
    fromDSC: { [time: string]: string };
  };
}

export const useRealTimeData = () => {
  const [assignments, setAssignments] = useState<BusAssignments>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserId(u ? u.uid : 'anonymous'));
  }, []);

  useEffect(() => {
    return onValue(ref(db, ".info/connected"), (s) => setIsConnected(!!s.val()));
  }, []);

  useEffect(() => {
    if (!userId) return;

    const getNum = (s: any) => String(s || "").replace(/\D/g, "");
    const norm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    // 1. SCHEDULE LISTENER
    onValue(ref(db, 'schedule'), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setRoutes([]);
      const newRoutes: Route[] = [];
      Object.entries(data).forEach(([key, val]: [string, any]) => {
        if (!val || typeof val !== 'object') return;
        const numPart = getNum(key);
        const prefix = key.toLowerCase().charAt(0);
        let type = ScheduleType.REGULAR;
        let appId = `R${numPart}`;
        if (prefix === 'e') { type = ScheduleType.EXAM; appId = `E${numPart}`; }
        else if (prefix === 'f') { type = ScheduleType.FRIDAY; appId = `F${numPart}`; }
        else if (prefix === 's' || (prefix === 'r' && parseInt(numPart) >= 11)) {
          type = ScheduleType.SHUTTLE; appId = `S${numPart}`;
        }
        const parseTimings = (node: any) => {
          if (!node) return [];
          return Object.entries(node).map(([dKey, dVal]: [string, any]) => {
            if (dVal && dVal.time) return { time: dVal.time, note: dVal.note || "" };
            return null;
          }).filter(Boolean) as BusTime[];
        };
        newRoutes.push({
          id: appId, name: val.name || val.routeName || appId, details: val.details || "",
          scheduleType: type, toDSC: parseTimings(val.departuresToDSC), fromDSC: parseTimings(val.departuresFromDSC),
          mapEmbedUrl: val.mapUrl || ""
        });
      });
      setRoutes(newRoutes);
    });

    // 2. ASSIGNMENTS LISTENER
    onValue(ref(db, 'assignments'), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setAssignments({});
      const newAssignments: BusAssignments = {};
      Object.values(data).forEach((item: any) => {
        if (item && item.departureTime && (item.busName || item.bus)) {
          const rawId = item.routeId || item.route || "";
          const numOnly = getNum(rawId);
          const prefix = String(rawId).toLowerCase().charAt(0);
          let appId = `R${numOnly}`;
          if (prefix === 'e') appId = `E${numOnly}`;
          else if (prefix === 'f') appId = `F${numOnly}`;
          else if (prefix === 's' || (prefix === 'r' && parseInt(numOnly) >= 11)) appId = `S${numOnly}`;
          const dirKey = String(item.direction).toLowerCase().includes('to') ? 'toDSC' : 'fromDSC';
          if (!newAssignments[appId]) newAssignments[appId] = { toDSC: {}, fromDSC: {} };
          newAssignments[appId][dirKey][item.departureTime] = item.busName || item.bus || "";
          newAssignments[appId][dirKey][norm(item.departureTime)] = item.busName || item.bus || "";
        }
      });
      setAssignments(newAssignments);
    });

    // 3. NOTICES LISTENER
    onValue(ref(db, 'notices'), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setNotices([]);
      const newNotices = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: val.id || key, title: val.title || "Update", description: val.content || val.description || "",
        date: val.date || "", time: val.time || "", isPinned: !!val.isPinned || !!val.pinned,
        timestamp: val.createdAt || val.timestamp || Date.now()
      })).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotices(newNotices);
    });

    // 4. LOST & FOUND UNIFIED LISTENER
    const lfRef = ref(db, 'lostFound');
    const lfrRef = ref(db, 'lostFoundRequests');

    const syncLF = () => {
      const map = new Map();

      const process = (snap: any, approved: boolean) => {
        const val = snap.val();
        if (val) {
          Object.entries(val).forEach(([key, post]: [string, any]) => {
            const isApproved = post.isApproved || post.approved || String(post.status).toLowerCase() === 'approved' || approved;
            const existing = map.get(key);
            if (!existing || (!existing.isApproved && isApproved)) {
              map.set(key, { ...post, id: key, isApproved });
            }
          });
        }
      };

      get(lfRef).then(s => {
        process(s, true);
        get(lfrRef).then(sr => {
          process(snap_requests, false); // Variable will be updated by listeners below
        });
      });
    };

    // Setting up persistent real-time listeners for LF
    let currentLF: any = null;
    let currentLFR: any = null;

    const updateMergedLF = () => {
      const map = new Map();
      const nodes = [
        { data: currentLF, approved: true },
        { data: currentLFR, approved: false }
      ];
      nodes.forEach(node => {
        if (node.data) {
          Object.entries(node.data).forEach(([key, val]: [string, any]) => {
             const isApproved = val.isApproved || val.approved || String(val.status).toLowerCase() === 'approved' || node.approved;
             const existing = map.get(key);
             if (!existing || (!existing.isApproved && isApproved)) {
               map.set(key, { ...val, id: key, isApproved });
             }
          });
        }
      });
      setLostFound(Array.from(map.values()).sort((a,b) => b.createdAt - a.createdAt));
      setLoading(false);
    };

    onValue(lfRef, (s) => { currentLF = s.val(); updateMergedLF(); });
    onValue(lfrRef, (s) => { currentLFR = s.val(); updateMergedLF(); });

  }, [userId]);

  return { assignments, notices, routes, lostFound, loading, error, isConnected };
};

export const firebaseActions = {
  saveProfile: async (profile: UserProfile) => {
    const data = { ...profile, updatedAt: Date.now() };
    const updates: any = {};
    updates[`users/${profile.uid}`] = data;
    updates[`students/${profile.uid}`] = data;
    return update(ref(db), updates);
  },

  createLFPost: async (post: Omit<LostFoundPost, 'id' | 'createdAt'>) => {
    const postId = push(ref(db, 'lostFoundRequests')).key;
    const data = {
      ...post, id: postId, createdAt: Date.now(),
      isApproved: false, approved: false, approvalStatus: 'Pending', status: 'Pending'
    };
    const updates: any = {};
    updates[`lostFoundRequests/${postId}`] = data;
    updates[`lostFound/${postId}`] = data; // App visible node (filtered by isApproved)
    return update(ref(db), updates);
  },

  approveLFPost: async (postId: string) => {
    const snap = await get(ref(db, `lostFoundRequests/${postId}`));
    if (snap.exists()) {
      const postData = snap.val();
      const updated = {
        ...postData, isApproved: true, approved: true,
        status: 'Approved', approvalStatus: 'Approved', approvedAt: Date.now()
      };
      const updates: any = {};
      updates[`lostFound/${postId}`] = updated;
      updates[`lostFoundRequests/${postId}`] = null;

      // Auto-trigger push notification via notices node
      const nId = `notif_lf_${postId}`;
      updates[`notices/${nId}`] = {
        id: nId, title: `📢 New Lost & Found Post`,
        description: `A new item "${postData.title}" has been published.`,
        date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
        isPinned: false, createdAt: Date.now()
      };
      return update(ref(db), updates);
    }
  },

  deleteLFPost: async (id: string) => {
    // Atomic deletion from both primary nodes.
    // This is 100% permanent and will not reappear.
    const updates: any = {};
    updates[`lostFound/${id}`] = null;
    updates[`lostFoundRequests/${id}`] = null;
    return update(ref(db), updates);
  },

  addLFComment: async (postId: string, comment: any) => {
    const commRef = push(ref(db, `lostFound/${postId}/comments`));
    return set(commRef, { ...comment, createdAt: Date.now() });
  },

  resetPassword: async (email: string) => sendPasswordResetEmail(auth, email)
};

export const useUserProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) { setProfile(null); setLoading(false); return; }
    return onValue(ref(db, `users/${uid}`), (s) => {
      setProfile(s.val());
      setLoading(false);
    });
  }, [uid]);
  return { profile, loading };
};

export const useAllUsers = (isAdmin: boolean | undefined) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isAdmin) { setUsers([]); setLoading(false); return; }
    return onValue(ref(db, 'users'), (s) => {
      const data = s.val();
      if (data) setUsers(Object.values(data));
      setLoading(false);
    });
  }, [isAdmin]);
  return { users, loading };
};
