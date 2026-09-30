import { profile } from '../data/site';

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>('toast', { detail: message }));
}

export async function copyEmail() {
  try {
    await navigator.clipboard.writeText(profile.email);
    toast('Email copied to clipboard');
  } catch {
    location.href = `mailto:${profile.email}`;
  }
}
