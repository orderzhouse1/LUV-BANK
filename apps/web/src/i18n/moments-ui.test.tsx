/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogMomentClient } from "../components/moments/log-moment-client";
import { HomeRecentClient } from "../components/moments/history-client";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../lib/api-client", () => ({
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  createMoment: vi.fn(),
  listMoments: vi.fn(async () => ({ items: [], nextCursor: null })),
  updateMoment: vi.fn(),
  deleteMoment: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("LogMomentClient", () => {
  it("renders English log copy with kind and category controls", () => {
    render(<LogMomentClient locale="en" dictionary={en} />);
    expect(screen.getByText(en.app.logKindPositive)).toBeTruthy();
    expect(screen.getByText(en.app.logKindDifficult)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.app.logSubmit })).toBeTruthy();
  });

  it("renders Arabic log copy", () => {
    render(<LogMomentClient locale="ar" dictionary={ar} />);
    expect(screen.getByText(ar.app.logKindPositive)).toBeTruthy();
    expect(screen.getByText(ar.app.logKindDifficult)).toBeTruthy();
  });

  it("exposes selected state on kind radios", () => {
    render(<LogMomentClient locale="en" dictionary={en} />);
    const positive = screen.getByRole("radio", { name: en.app.logKindPositive });
    const difficult = screen.getByRole("radio", { name: en.app.logKindDifficult });
    expect(positive.getAttribute("aria-checked")).toBe("false");
    expect(difficult.getAttribute("aria-checked")).toBe("false");
    positive.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
});

describe("HomeRecentClient empty state", () => {
  it("renders empty ledger copy without scores", async () => {
    render(<HomeRecentClient locale="en" dictionary={en} />);
    expect(await screen.findByText(en.app.recentEmpty)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Gottman|\+128/i);
  });
});
