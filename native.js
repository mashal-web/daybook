import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const native = Capacitor.isNativePlatform();
const notificationId = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 2000000000) + 1;
};

async function permission() {
  if (!native) return "web";
  let result = await LocalNotifications.checkPermissions();
  if (result.display !== "granted") result = await LocalNotifications.requestPermissions();
  return result.display;
}

async function syncReminders(reminders) {
  if (!native) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }
  const now = new Date();
  const notifications = [];
  for (const item of reminders) {
    if (!item.title || !item.date || !item.time) continue;
    const at = new Date(item.date + "T" + item.time + ":00");
    if (Number.isNaN(at.getTime()) || at <= now) continue;
    const repeat = item.repeat === "daily" ? "day" : item.repeat === "weekly" ? "week" : null;
    notifications.push({
      id: notificationId(String(item.id)),
      title: "Daybook reminder",
      body: item.title,
      schedule: repeat ? { at, repeats: true, every: repeat } : { at },
      extra: { reminderId: item.id }
    });
  }
  if (notifications.length) {
    const granted = await permission();
    if (granted === "granted") await LocalNotifications.schedule({ notifications });
  }
}

window.DaybookNative = {
  isNative: () => native,
  requestPermission: permission,
  syncReminders
};
