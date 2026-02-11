"use client";

import { useEffect, type ReactNode } from "react";

import { toPersianDigits } from "@/lib/format/persianNumbers";

const ASCII_DIGIT_REGEX = /[0-9]/;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "KBD", "SAMP"]);
const SKIP_SELECTOR = "[data-no-persian-digits]";

function shouldSkipNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }
  if (parent.isContentEditable) {
    return true;
  }
  if (SKIP_TAGS.has(parent.tagName)) {
    return true;
  }
  if (parent.closest(SKIP_SELECTOR)) {
    return true;
  }
  return false;
}

function convertTextNode(node: Text) {
  if (shouldSkipNode(node)) {
    return;
  }
  const value = node.nodeValue;
  if (!value || !ASCII_DIGIT_REGEX.test(value)) {
    return;
  }
  const converted = toPersianDigits(value);
  if (converted !== value) {
    node.nodeValue = converted;
  }
}

function convertNodeTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    convertTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    convertTextNode(walker.currentNode as Text);
  }
}

export function PersianNumbersProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.body;
    if (!root) {
      return;
    }

    convertNodeTree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          convertTextNode(mutation.target as Text);
        }
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(convertNodeTree);
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
