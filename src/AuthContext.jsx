/**
 * AuthContext.jsx — 全局用户认证状态管理
 *
 * 面试亮点：
 * 1. Context + Provider 模式：所有子组件都能读取当前用户
 * 2. onAuthStateChanged：Firebase 实时监听登录状态，刷新页面不需要重新登录
 * 3. 自定义 Hook useAuth() 让调用更简洁
 * 4. Firestore 用户资料（displayName, gender, avatar）存在 users/{uid} 文档
 */

import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

// 默认头像 SVG（base64 data URL，不依赖外部图片）
export const DEFAULT_AVATAR = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="50" fill="#2a2a42"/>
  <circle cx="50" cy="38" r="18" fill="#8b7cf8"/>
  <ellipse cx="50" cy="82" rx="28" ry="20" fill="#8b7cf8"/>
</svg>
`)}`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // Firebase Auth user object
  const [profile, setProfile] = useState(null);   // Firestore user profile
  const [loading, setLoading] = useState(true);   // 等待 Firebase 初始化

  /**
   * onAuthStateChanged：Firebase 监听器
   * - 页面加载时自动检查是否已登录（读 cookie/token）
   * - 登入/登出时自动触发
   * - 返回 unsubscribe 函数，组件卸载时清除监听（防内存泄漏）
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // 从 Firestore 读取用户资料
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data());
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe; // cleanup
  }, []);

  /** 注册：创建 Auth 用户 + 写入 users/{uid} + usernames/{username} 映射 */
  const register = async ({ email, password, username, gender }) => {
    // 先检查用户名是否已被占用
    const usernameSnap = await getDoc(doc(db, "usernames", username.toLowerCase()));
    if (usernameSnap.exists()) throw { code: "auth/username-taken" };

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newProfile = {
      uid: cred.user.uid,
      email,
      username,
      gender,
      avatar: DEFAULT_AVATAR,
      createdAt: serverTimestamp(),
    };
    // 并行写入：用户资料 + 用户名映射表（两个文档）
    await Promise.all([
      setDoc(doc(db, "users", cred.user.uid), newProfile),
      // usernames/{username} → { uid, email } 用于登录时查找
      setDoc(doc(db, "usernames", username.toLowerCase()), { uid: cred.user.uid, email }),
    ]);
    setProfile(newProfile);
    return cred.user;
  };

  /**
   * 登录：支持 email 或 username
   * - 包含 "@" → 当成 email 直接登录
   * - 不包含 "@" → 查 Firestore usernames 集合找到对应 email → 再登录
   */
  const login = async (emailOrUsername, password) => {
    let emailToUse = emailOrUsername.trim();

    if (!emailToUse.includes("@")) {
      // 是用户名 → 查 Firestore 找对应 email
      const usernameSnap = await getDoc(doc(db, "usernames", emailToUse.toLowerCase()));
      if (!usernameSnap.exists()) throw { code: "auth/user-not-found" };
      emailToUse = usernameSnap.data().email;
    }

    const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (snap.exists()) setProfile(snap.data());
    return cred.user;
  };

  /**
   * 忘记密码：Firebase 发重置邮件
   * 支持 email 或 username 输入
   */
  const forgotPassword = async (emailOrUsername) => {
    let emailToUse = emailOrUsername.trim();

    if (!emailToUse.includes("@")) {
      const usernameSnap = await getDoc(doc(db, "usernames", emailToUse.toLowerCase()));
      if (!usernameSnap.exists()) throw { code: "auth/user-not-found" };
      emailToUse = usernameSnap.data().email;
    }

    await sendPasswordResetEmail(auth, emailToUse);
    // Firebase 会自动发邮件，里面有重置链接，不需要自己做重置页面
  };

  /** 登出 */
  const logout = () => signOut(auth);

  /** 更新 Firestore 用户资料（头像/用户名等） */
  const updateProfile = async (updates) => {
    await updateDoc(doc(db, "users", user.uid), updates);
    setProfile(p => ({ ...p, ...updates }));
  };

  /** 更改密码（需要重新验证旧密码） */
  const changePassword = async (oldPassword, newPassword) => {
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential); // 验证旧密码
    await updatePassword(user, newPassword);
  };

  const value = { user, profile, loading, register, login, logout, updateProfile, changePassword, forgotPassword };

  return (
    <AuthContext.Provider value={value}>
      {/* loading 期间不渲染子组件，避免 flicker */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 自定义 Hook：调用更简洁
export const useAuth = () => useContext(AuthContext);
