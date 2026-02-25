/**
 * firebase.js — Firebase 初始化
 *
 * 职责：
 * - 初始化 Firebase app（只初始化一次）
 * - 导出 auth（用户认证）和 db（Firestore 数据库）
 * - 其他文件 import { auth, db } from './firebase' 来使用
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAF--45Vv9kfTyh7sgo7lBpwyC_hmPrq2Y",
  authDomain: "react-portfolio-1b675.firebaseapp.com",
  projectId: "react-portfolio-1b675",
  storageBucket: "react-portfolio-1b675.firebasestorage.app",
  messagingSenderId: "654631062322",
  appId: "1:654631062322:web:31baf01e3e250bfd0fe52b",
  measurementId: "G-QGSPV9TR92",
};

// initializeApp：只调用一次，Firebase SDK 自动处理单例
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);       // Firebase Authentication
export const db   = getFirestore(app);  // Firestore Database
export const storage = getStorage(app); // Firebase Storage（头像上传）
