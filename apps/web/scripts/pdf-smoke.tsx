/* eslint-disable no-console */
import "server-only";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";

async function main() {
  const buf = await renderToBuffer(
    <Document>
      <Page size="A4">
        <Text>hello pdf</Text>
      </Page>
    </Document>
  );

  console.log("PDF buffer length:", buf.byteLength);
}

main().catch((e) => {
  console.error("SMOKE FAIL", e);
  process.exit(1);
});
