#!/usr/bin/env node
// Generates a VAPID key pair for Web Push (free). Run: npm run vapid
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("Copia queste righe nelle variabili d'ambiente (Vercel + .env.local):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:la-tua-email@example.com");
