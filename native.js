import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const native = Capacitor.isNativePlatform();
if (native) document.documentElement.classList.add("native-app");
const notificationId = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 2000000000) + 1;
};

async function permission(request = false) {
  if (!native) return "web";
  let result = await LocalNotifications.checkPermissions();
  if (request && result.display !== "granted") {
    result = await LocalNotifications.requestPermissions();
  }
  if (request && result.display === "granted") {
    const exact = await LocalNotifications.checkExactNotificationSetting();
    if (exact.exact_alarm !== "granted") {
      await LocalNotifications.changeExactNotificationSetting();
    }
  }
  return result.display;
}

async function syncReminders(reminders) {
  if (!native) return;
  const granted = await permission(false);
  if (granted !== "granted") return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }

  const now = new Date();
  const notifications = [];
  for (const item of reminders) {
    if (!item || !item.title || !item.date || !item.time) continue;
    let at = new Date(item.date + "T" + item.time + ":00");
    if (Number.isNaN(at.getTime())) continue;
    const repeat = item.repeat === "daily" ? "day" : item.repeat === "weekly" ? "week" : null;
    const stepDays = repeat === "day" ? 1 : 7;
    if (repeat) {
      while (at <= now) at.setDate(at.getDate() + stepDays);
    }
    const count = repeat === "day" ? 30 : repeat === "week" ? 12 : 1;
    for (let occurrence = 0; occurrence < count && at > now; occurrence++) {
      const scheduledAt = new Date(at);
      const key = String(item.id) + ":" + scheduledAt.getFullYear() + "-" +
        String(scheduledAt.getMonth() + 1).padStart(2, "0") + "-" +
        String(scheduledAt.getDate()).padStart(2, "0");
      notifications.push({
        id: notificationId(key),
        title: "Daybook reminder",
        body: item.title,
        schedule: { at: scheduledAt, allowWhileIdle: true },
        extra: { reminderId: item.id, occurrence }
      });
      if (!repeat) break;
      at.setDate(at.getDate() + stepDays);
    }
  }

  notifications.sort((a, b) => a.schedule.at - b.schedule.at);
  const scheduled = notifications.slice(0, 250);
  if (scheduled.length) await LocalNotifications.schedule({ notifications: scheduled });
}

window.DaybookNative = {
  isNative: () => native,
  requestPermission: () => permission(true),
  syncReminders
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") window.dispatchEvent(new Event("daybook-native-resume"));
});
window.addEventListener("focus", () => window.dispatchEvent(new Event("daybook-native-resume")));
window.dispatchEvent(new Event("daybook-native-ready"));
