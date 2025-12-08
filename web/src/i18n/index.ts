import enUS from "./en-US.json";
import frFR from "./fr-FR.json";
import esES from "./es-ES.json";

export type MessageKey = keyof typeof enUS;

export const messages: Record<string, Record<string, string>> = {
  "en-US": enUS,
  "en": enUS,
  "fr-FR": frFR,
  "fr": frFR,
  "es-ES": esES,
  "es": esES,
};

export const supportedLocales = ["en-US", "fr-FR", "es-ES"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export function getMessages(locale: string): Record<string, string> {
  // Try exact match first
  if (messages[locale]) {
    return messages[locale];
  }
  
  // Try language code only (e.g., "en" from "en-GB")
  const languageCode = locale.split("-")[0];
  if (messages[languageCode]) {
    return messages[languageCode];
  }
  
  // Fallback to English
  return messages["en-US"];
}

export function normalizeLocale(locale: string): SupportedLocale {
  if (supportedLocales.includes(locale as SupportedLocale)) {
    return locale as SupportedLocale;
  }
  
  const languageCode = locale.split("-")[0];
  const match = supportedLocales.find((l) => l.startsWith(languageCode));
  
  return match || "en-US";
}


