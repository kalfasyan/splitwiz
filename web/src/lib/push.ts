// Push notifications from the NAS to this phone. The server signs them with
// its own key (GET /api/splitwiz/push/key); the service worker shows them.

import { pb } from './pb';

export type PushSupport = 'ok' | 'install' | 'unsupported';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** iPhones only allow push for the app added to the home screen. */
export function pushSupport(): PushSupport {
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (ok) return 'ok';
  return isIos() && !installed() ? 'install' : 'unsupported';
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function current(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription) {
  await pb.send('/api/splitwiz/push/subscribe', { method: 'POST', body: sub.toJSON() });
}

/** Whether this phone gets notifications for the signed-in person. */
export async function pushEnabled(): Promise<boolean> {
  return Notification.permission === 'granted' && !!(await current());
}

export async function enablePush(): Promise<void> {
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked for Splitwiz. Allow them in the phone’s settings, then try again.');
  }
  const reg = await navigator.serviceWorker.ready;
  const { key } = await pb.send<{ key: string }>('/api/splitwiz/push/key', {});
  // start fresh in case the server's key changed (for example a new pb_data)
  await (await reg.pushManager.getSubscription())?.unsubscribe();
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await save(sub);
}

export async function disablePush(): Promise<void> {
  const sub = await current();
  if (!sub) return;
  try {
    await pb.send('/api/splitwiz/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
  } finally {
    await sub.unsubscribe();
  }
}

export async function testPush(): Promise<void> {
  await pb.send('/api/splitwiz/push/test', { method: 'POST' });
}

/** Re-registers this phone on start, so the server always knows it, and for whom. */
export async function syncPush(): Promise<void> {
  try {
    const sub = await current();
    if (sub && Notification.permission === 'granted') await save(sub);
  } catch {
    // offline; next start tries again
  }
}

/** Stops notifications for the person signing out on this phone. */
export async function forgetPush(): Promise<void> {
  try {
    await disablePush();
  } catch {
    // offline: the server forgets it once the push service reports it gone
  }
}
