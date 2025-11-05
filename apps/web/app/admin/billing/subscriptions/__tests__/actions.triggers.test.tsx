// @vitest-environment jsdom

import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/app/admin/billing/components/action-dialog";

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  document.body.innerHTML = "";
});

const ACTION_SCENARIOS = [
  {
    title: "لغو فوری اشتراک",
    triggerLabel: "لغو فوری",
    confirmLabel: "تایید لغو",
  },
  {
    title: "لغو در پایان دوره",
    triggerLabel: "لغو در پایان",
    confirmLabel: "ثبت",
  },
  {
    title: "تنظیم تاریخ پایان",
    triggerLabel: "تغییر پایان",
    confirmLabel: "ذخیره تغییر",
  },
  {
    title: "بازسازی دسترسی‌ها",
    triggerLabel: "بازسازی",
    confirmLabel: "اجرای بازسازی",
  },
] as const;

describe("ActionDialog trigger usage", () => {
  it.each(ACTION_SCENARIOS)("opens dialog for %s", async ({ title, triggerLabel, confirmLabel }) => {
    const { unmount } = render(
      <ActionDialog
        title={title}
        description="توضیح"
        triggerLabel={triggerLabel}
        confirmLabel={confirmLabel}
        input={{}}
        onSubmit={async () => ({ ok: true })}
        trigger={
          <Button type="button" variant="outline" size="sm">
            {triggerLabel}
          </Button>
        }
      />,
    );

    const trigger = getButtonByText(triggerLabel);
    click(trigger);

    expect(document.body.textContent).toContain(title);

    unmount();
  });

  it("renders common trigger wrappers without crashing", () => {
    const { unmount } = render(
      <div>
        <Button asChild>
          <a href="#">پیوند</a>
        </Button>
      </div>,
    );

    expect(document.body.textContent).toContain("پیوند");
    unmount();
  });
});

function render(ui: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function getButtonByText(text: string) {
  const candidates = document.querySelectorAll("button, [role='button']");
  for (const element of candidates) {
    if (element.textContent && element.textContent.trim() === text) {
      return element as HTMLElement;
    }
  }
  throw new Error(`Unable to find button with text: ${text}`);
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}
