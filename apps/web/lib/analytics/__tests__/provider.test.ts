import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import {
  identify,
  resetAnalyticsStateForTests,
  setAnalyticsAdapter,
  setConsentGranted,
  track,
} from "../provider";

describe("analytics provider", () => {
  beforeEach(() => {
    resetAnalyticsStateForTests();
    setAnalyticsAdapter({
      track: vi.fn(),
      identify: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("does not emit events when consent is not granted", () => {
    const adapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };
    setAnalyticsAdapter(adapter);

    track("jobs:list_view", { query: "test" });

    expect(adapter.track).not.toHaveBeenCalled();
  });

  it("forwards events to the adapter when consent is granted", () => {
    const adapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };
    setAnalyticsAdapter(adapter);

    setConsentGranted(true);

    track("profiles:list_view", { query: "  hello  ", city: "tehran" });

    expect(adapter.track).toHaveBeenCalledWith(
      "profiles:list_view",
      {
        query: "hello",
        city: "tehran",
      },
    );
  });

  it("filters props to the allow-list", () => {
    const adapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };
    setAnalyticsAdapter(adapter);

    setConsentGranted(true);

    track("jobs:list_view", { query: "test", userId: "123", page: 2 });

    expect(adapter.track).toHaveBeenCalledWith(
      "jobs:list_view",
      {
        query: "test",
        page: 2,
      },
    );
  });

  it("does not identify users without consent", () => {
    const adapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };
    setAnalyticsAdapter(adapter);

    identify("user-1", { role: "tester" });

    expect(adapter.identify).not.toHaveBeenCalled();
  });

  it("forwards identify calls when consent is granted", () => {
    const adapter = {
      track: vi.fn(),
      identify: vi.fn(),
    };
    setAnalyticsAdapter(adapter);

    setConsentGranted(true);

    identify("user-1", { query: "ignored", page: 1 });

    expect(adapter.identify).toHaveBeenCalledWith("user-1", { page: 1 });
  });
});
