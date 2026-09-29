import { describe, expect, it } from "vitest";
import { withoutLastAnswer, withUserTurn } from "@/server/ai/history";

describe("chat history in memory (the new question is not read back from the database)", () => {
  it("adds the new question as a user turn", () => {
    const h = [
      { role: "user", parts: [{ text: "ciao" }] },
      { role: "model", parts: [{ text: "ciao Vio" }] },
    ];
    expect(withUserTurn(h, "come stai?")).toEqual([...h, { role: "user", parts: [{ text: "come stai?" }] }]);
    expect(h).toHaveLength(2); // the loaded history is not modified
  });

  it("merges with an unanswered question (Gemini wants alternating roles)", () => {
    const h = [{ role: "user", parts: [{ text: "ci sei?" }] }];
    expect(withUserTurn(h, "rispondi")).toEqual([{ role: "user", parts: [{ text: "ci sei?" }, { text: "rispondi" }] }]);
    expect(h[0].parts).toHaveLength(1);
  });

  it("starts a conversation", () => {
    expect(withUserTurn([], "ciao")).toEqual([{ role: "user", parts: [{ text: "ciao" }] }]);
  });

  it("«Rigenera» drops only the answer being replaced", () => {
    const h = [
      { role: "user", parts: [{ text: "a" }] },
      { role: "model", parts: [{ text: "b" }] },
      { role: "user", parts: [{ text: "c" }] },
      { role: "model", parts: [{ text: "d" }] },
    ];
    expect(withoutLastAnswer(h)).toEqual(h.slice(0, 3));
    expect(withoutLastAnswer(h.slice(0, 3))).toEqual(h.slice(0, 3));
  });
});
