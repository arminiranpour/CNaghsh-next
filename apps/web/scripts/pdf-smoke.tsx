/* eslint-disable no-console */
/* @jsxImportSource react */
import React from "react";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";

async function main() {
  try {
    const buf = await renderToBuffer(
      <Document>
        <Page size="A4">
          <Text>hello pdf</Text>
        </Page>
      </Document>
    );

    console.log("✅ PDF buffer length:", buf.byteLength);
    if (buf.byteLength > 0) {
      console.log("✅ Smoke test passed – PDF rendered successfully.");
    } else {
      console.error("❌ Smoke test failed – empty PDF buffer.");
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ SMOKE FAIL:", e);
    process.exit(1);
  }
}

main();
