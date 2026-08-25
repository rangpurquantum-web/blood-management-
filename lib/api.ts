import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://blood-management-livid.vercel.app";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach the saved token to every outgoing request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type MobileUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  branchId: number | null;
  branchSlug: string | null;
  isSuperAdmin: boolean;
};

export async function login(
  email: string,
  password: string,
): Promise<{ success: true; user: MobileUser } | { success: false; error: string }> {
  try {
    const res = await api.post("/api/mobile/login", { email, password });

    if (res.data.success) {
      await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      return { success: true, user: res.data.user };
    }

    return { success: false, error: res.data.error ?? "Login failed" };
  } catch (err: any) {
    const message =
      err?.response?.data?.error ?? "Network error — could not reach server";
    return { success: false, error: message };
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getStoredUser(): Promise<MobileUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
}