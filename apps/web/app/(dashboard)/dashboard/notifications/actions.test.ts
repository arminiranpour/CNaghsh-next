import { NotificationCategory } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const getSessionMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getServerAuthSession: getSessionMock }));

const setUserPreferenceMock = vi.fn();
vi.mock("@/lib/notifications/preferences", () => ({ setUserPreference: setUserPreferenceMock }));

const verifyTokenMock = vi.fn();
vi.mock("@/lib/notifications/signing", () => ({ verifyManageToken: verifyTokenMock }));

describe("notification actions", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    getSessionMock.mockReset();
    setUserPreferenceMock.mockReset();
    verifyTokenMock.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("updates preferences for the signed-in user", async () => {
    const { updatePreferenceAction } = await import("./actions");

    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    verifyTokenMock.mockReturnValue(null);

    await updatePreferenceAction({
      category: NotificationCategory.BILLING_REMINDERS,
      emailEnabled: false,
      inAppEnabled: true,
    });

    expect(setUserPreferenceMock).toHaveBeenCalledWith({
      userId: "user-1",
      category: NotificationCategory.BILLING_REMINDERS,
      emailEnabled: false,
      inAppEnabled: true,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/notifications");
  });

  it("accepts token-based management without a session", async () => {
    const { updatePreferenceAction } = await import("./actions");

    getSessionMock.mockResolvedValue(null);
    verifyTokenMock.mockReturnValue({ userId: "user-token" });

    await updatePreferenceAction({
      category: NotificationCategory.BILLING_REMINDERS,
      emailEnabled: true,
      inAppEnabled: false,
      token: "signed-token",
    });

    expect(setUserPreferenceMock).toHaveBeenCalledWith({
      userId: "user-token",
      category: NotificationCategory.BILLING_REMINDERS,
      emailEnabled: true,
      inAppEnabled: false,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/notifications");
  });
});
