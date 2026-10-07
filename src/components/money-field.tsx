"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { applyMoneyEdit, formatMoneyCanonical, moneyToApi } from "../lib/money-mask";

export function MoneyField({
  id,
  currency,
  value,
  onChange,
  accent = false,
  autoFocus = false,
  onKeyDown,
}: {
  id: string;
  currency: "BRL" | "USD";
  value: string;
  onChange: (canonical: string) => void;
  accent?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const prefix = currency === "BRL" ? "R$" : "US$";
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const shown = focused ? draft : formatMoneyCanonical(value);

  function commit(next: string) {
    draftRef.current = next;
    setDraft(next);
    onChange(moneyToApi(next));
  }

  return (
    <div className={`money-field${accent ? " money-field-accent" : ""}`}>
      <span className="money-prefix" aria-hidden="true">
        {prefix}
      </span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        value={shown}
        onFocus={(event) => {
          const next = formatMoneyCanonical(value);
          draftRef.current = next;
          setDraft(next);
          setFocused(true);
          event.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          onChange(moneyToApi(draftRef.current));
        }}
        onChange={(event) => {
          commit(applyMoneyEdit(draftRef.current, event.target.value));
        }}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
