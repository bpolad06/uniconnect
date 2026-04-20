import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebase } from "../firebase.js";
import { COL } from "../models/firestorePaths.js";

/**
 * Database Service - Bütün Firestore əməliyyatlarını mərkəzləşdirir.
 */
export const DbService = {
  // --- İSTİFADƏÇİLƏR ---
  async getAllUsers(excludeUid, max = 80) {
    const col = collection(firebase.db, COL.USERS);
    const snap = await getDocs(query(col, limit(max)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.id !== excludeUid);
  },

  async getUserProfile(uid) {
    const ref = doc(firebase.db, COL.USERS, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  // --- KAMPUS FREKANSI (ANONİM ÇAT) ---
  subscribeToCampusMessages(slug, callback) {
    const q = query(
      collection(firebase.db, COL.CAMPUS_MESSAGES, slug, "messages"),
      orderBy("createdAt", "desc"),
      limit(80),
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
      callback(msgs);
    });
  },

  async sendCampusMessage(slug, { text, nickname }) {
    return addDoc(collection(firebase.db, COL.CAMPUS_MESSAGES, slug, "messages"), {
      text: text.trim().slice(0, 500),
      nickname,
      universitySlug: slug,
      createdAt: serverTimestamp(),
    });
  },

  // --- ŞƏXSİ MESAJLAR (CHAT) ---
  async getFriendEdges(uid) {
    const q = query(
      collection(firebase.db, COL.FRIEND_EDGES),
      where("participants", "array-contains", uid),
      where("status", "==", "accepted")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  subscribeToMessages(chatId, callback) {
    const q = query(
      collection(firebase.db, COL.CHATS, chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(msgs);
    });
  },

  async sendMessage(chatId, { text, senderId, participants }) {
    return addDoc(collection(firebase.db, COL.CHATS, chatId, "messages"), {
      text: text.trim(),
      senderId,
      participants,
      createdAt: serverTimestamp(),
    });
  },

  // --- MƏKTUBLAR (LETTERS) ---
  subscribeToLetters(uid, type, callback) {
    const field = type === "inbox" ? "recipientUids" : "authorUid";
    const op = type === "inbox" ? "array-contains" : "==";
    const q = query(
      collection(firebase.db, COL.LETTERS),
      where(field, op, uid),
      orderBy("createdAt", "desc"),
      limit(40)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    });
  },

  async sendLetter(authorUid, { body, recipientUids }) {
    return addDoc(collection(firebase.db, COL.LETTERS), {
      body: body.trim().slice(0, 4000),
      authorUid,
      recipientUids,
      createdAt: serverTimestamp(),
    });
  },

  async addLetterReply(letterId, { authorUid, text }) {
    return addDoc(collection(firebase.db, COL.LETTERS, letterId, "replies"), {
      authorUid,
      text: text.trim().slice(0, 2500),
      createdAt: serverTimestamp(),
    });
  },

  subscribeToLetterReplies(letterId, callback) {
    const q = query(
      collection(firebase.db, COL.LETTERS, letterId, "replies"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data);
    });
  },
};
