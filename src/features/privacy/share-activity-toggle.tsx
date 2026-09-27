"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { callAction } from "@/utils/call-action";
import { setShareActivity } from "./actions";

export function ShareActivityToggle({ initial, adamName }: { initial: boolean; adamName: string }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Switch
      label={`${adamName} può vedere quando uso esercizi e giochi`}
      description={on ? "Vede solo cosa hai fatto (es. \"una respirazione\"), mai cosa hai scritto." : "Spento: non viene registrato nulla."}
      checked={on}
      disabled={pending}
      onChange={(next) =>
        start(async () => {
          setOn(next);
          const res = await callAction(() => setShareActivity(next));
          if (!res.ok) {
            setOn(!next);
            toast.show(res.error, "error");
          }
        })
      }
    />
  );
}
