import "server-only";
import { phoneLink, whatsappLink, type ContactLinks } from "@/features/actions/registry";
import type { SettingsMap } from "@/features/settings/schema";
import { serverEnv } from "@/server/env";

export type Contact = ContactLinks & {
  whatsappNumber: string | null;
  messages: string[];
  emergencyNumber: string;
};

/** WhatsApp / phone links for "Adam" (settings override the env value). */
export function getContact(settings: SettingsMap): Contact {
  const wa = (settings.contact.whatsappNumber || serverEnv.whatsappNumber).replace(/\D/g, "") || null;
  const phone = settings.contact.phoneNumber || wa;
  return {
    whatsappNumber: wa,
    whatsappUrl: whatsappLink(wa, settings.contact.whatsappMessages[0]),
    phoneUrl: phoneLink(phone),
    messages: settings.contact.whatsappMessages,
    emergencyNumber: settings.contact.emergencyNumber || "112",
  };
}
