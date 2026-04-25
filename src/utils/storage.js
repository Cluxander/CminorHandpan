import { STORAGE_KEY } from "../constants/handpan.js";

export function savePans(pans) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pans)); } catch(e) {}
}

export function loadPans() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : [];
  } catch(e) {}
  return [];
}
