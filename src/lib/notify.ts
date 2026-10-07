const ASKED_KEY = "viabilidade_notify_asked";

export async function notifySaved(kind: "pending" | "analyzed", productName: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  const title = kind === "analyzed" ? "Análise concluída" : "Produto salvo";
  const body =
    kind === "analyzed"
      ? `${productName || "Produto"} foi analisado.`
      : `${productName || "Produto"} foi salvo. Veja o que ainda falta.`;

  try {
    if (Notification.permission === "default" && localStorage.getItem(ASKED_KEY) !== "1") {
      localStorage.setItem(ASKED_KEY, "1");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    return;
  }
}
