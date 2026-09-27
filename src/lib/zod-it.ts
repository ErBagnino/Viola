// Validation messages in plain Italian, for every Zod schema in the app.
// Messages written on a single schema (e.g. "Il chat ID è un numero") still win.
import { z } from "zod";

z.config({
  ...z.locales.it(),
  customError: (iss) => {
    switch (iss.code) {
      case "invalid_value":
        return "scegli una delle opzioni";
      case "invalid_type":
        return iss.input === undefined || iss.input === null ? "campo obbligatorio" : "valore non valido";
      case "too_small":
        if (iss.origin === "string") return Number(iss.minimum) <= 1 ? "non può essere vuoto" : `almeno ${iss.minimum} caratteri`;
        if (iss.origin === "array") return Number(iss.minimum) <= 1 ? "aggiungine almeno uno" : `almeno ${iss.minimum} elementi`;
        return `almeno ${iss.minimum}`;
      case "too_big":
        if (iss.origin === "string") return `massimo ${iss.maximum} caratteri`;
        if (iss.origin === "array") return `al massimo ${iss.maximum} elementi`;
        return `al massimo ${iss.maximum}`;
      case "invalid_format":
        return iss.format === "date" ? "data non valida" : iss.format === "email" ? "email non valida" : "formato non valido";
      default:
        return undefined;
    }
  },
});

export { z };
