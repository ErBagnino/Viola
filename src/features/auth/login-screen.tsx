"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { HeartFlower, Sparkle, Star5 } from "@/components/decor/stars";
import { FloatingHearts } from "@/components/decor/floating-hearts";
import { signIn, type SignInState } from "./actions";
import { TapSecret } from "@/features/secrets/tap-secret";

type Persona = "viola" | "adam";

export function LoginScreen({
  title,
  subtitle,
  violaName,
  adamName,
  pending,
  configured,
}: {
  title: string;
  subtitle: string;
  violaName: string;
  adamName: string;
  pending: boolean;
  configured: boolean;
}) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [state, action, isPending] = useActionState<SignInState, FormData>(signIn, undefined);
  const [email, setEmail] = useState("");
  const [showPw, setShowPw] = useState(false);

  const choose = (p: Persona) => {
    try {
      setEmail(localStorage.getItem(`vio:email:${p}`) ?? "");
    } catch {
      /* private mode */
    }
    setPersona(p);
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <FloatingHearts count={12} />
      <div className="relative z-10 w-full max-w-sm text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 14, stiffness: 120 }}
          className="relative mx-auto mb-7 grid size-32 place-items-center rounded-[2.2rem] bg-black shadow-float"
        >
          <TapSecret taps={5} message="Ti stavo aspettando ♡">
            <HeartFlower className="size-24" color="#da0e14" />
          </TapSecret>
          <Star5 className="absolute -top-2 -right-2 size-9 rotate-12" />
          <Sparkle outline className="absolute -bottom-1 -left-2 size-6 text-white" />
        </motion.div>

        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[2rem] leading-tight font-semibold text-balance text-vio-900"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-3 text-[15px] text-ink-soft"
        >
          {subtitle}
        </motion.p>

        {!configured && (
          <p className="mt-6 rounded-2xl bg-peach-100 px-4 py-3 text-sm font-semibold text-vio-800">
            La configurazione non è ancora completa: segui il file SETUP.md per collegare Supabase.
          </p>
        )}
        {pending && configured && (
          <p className="mt-6 rounded-2xl bg-lilac-100 px-4 py-3 text-sm font-semibold text-vio-800" role="status">
            Il tuo account esiste ma non è ancora abilitato. Chiedi ad {adamName} di attivarlo ♡
            <span className="mt-1 block text-xs font-normal">Per {adamName}: assegna il ruolo con lo SQL del passo 9 di SETUP.md.</span>
          </p>
        )}

        <AnimatePresence mode="wait">
          {!persona ? (
            <motion.div
              key="choose"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-9 grid gap-3"
            >
              <Button variant="primary" size="xl" className="w-full" onClick={() => choose("viola")}>
                ♡ {violaName}
              </Button>
              <Button variant="white" size="xl" className="w-full" onClick={() => choose("adam")}>
                ♡ {adamName}
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              action={(fd) => {
                try {
                  localStorage.setItem(`vio:email:${persona}`, String(fd.get("email") ?? ""));
                } catch {
                  /* ignore */
                }
                action(fd);
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="paper mt-8 grid gap-4 rounded-4xl p-5 text-left"
            >
              <p className="text-center font-hand text-3xl text-vio-700">
                {persona === "viola" ? `Ciao ${violaName} ♡` : `Ciao ${adamName}`}
              </p>
              <Field label="Email">
                {(id) => (
                  <Input
                    id={id}
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                  />
                )}
              </Field>
              <Field label="Password">
                {(id) => (
                  <div className="relative">
                    <Input
                      id={id}
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={6}
                      className="pr-12"
                      data-autofocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-vio-600"
                      aria-label={showPw ? "Nascondi password" : "Mostra password"}
                    >
                      {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                )}
              </Field>
              {state?.error && (
                <p className="rounded-xl bg-blush-100 px-3 py-2 text-sm font-semibold text-vio-800" role="alert">
                  {state.error}
                </p>
              )}
              <Button type="submit" size="lg" loading={isPending} className="w-full">
                <LogIn className="size-5" /> Entra
              </Button>
              <button
                type="button"
                onClick={() => setPersona(null)}
                className="text-center text-sm font-bold text-vio-600 underline-offset-4 hover:underline"
              >
                Torna indietro
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
