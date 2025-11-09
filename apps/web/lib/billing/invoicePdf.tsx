import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Invoice, InvoiceStatus, InvoiceType, Payment } from "@prisma/client";

import {
  formatInvoiceCurrency,
  formatInvoiceIsoDate,
  formatInvoiceJalaliDate,
  formatInvoiceNumber,
  maskProviderReference,
} from "@/lib/billing/invoiceFormat";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFStyle = any;

function sx(
  ...values: Array<PDFStyle | PDFStyle[] | null | false | undefined>
): PDFStyle | PDFStyle[] | undefined {
  const out: PDFStyle[] = [];
  for (const v of values) {
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const x of v) if (x) out.push(x);
    } else {
      out.push(v);
    }
  }
  if (out.length === 0) return undefined;
  if (out.length === 1) return out[0];
  return out;
}

function asStyle(input: Partial<PDFStyle>): PDFStyle {
  return input as PDFStyle;
}

const FONT_VERSION = "5.0.21";
const FONT_REMOTE_BASE = `https://cdn.jsdelivr.net/npm/@fontsource/vazirmatn@${FONT_VERSION}/files` as const;

const localFontCandidates = (fileName: string): string[] => [
  path.join(process.cwd(), "apps", "web", "public", "fonts", fileName),
  path.join(process.cwd(), "public", "fonts", fileName),
];

const remoteFontSource = (weight: 400 | 500 | 700): string => {
  const suffix = `${weight}-normal.ttf`;
  return `${FONT_REMOTE_BASE}/vazirmatn-farsi-latin-${suffix}`;
};

let fontsRegistered = false;

const registerFonts = () => {
  if (fontsRegistered) return;

  const sources = [
    { weight: 400 as const, file: "Vazirmatn-Regular.ttf" },
    { weight: 500 as const, file: "Vazirmatn-Medium.ttf" },
    { weight: 700 as const, file: "Vazirmatn-Bold.ttf" },
  ];

  const fonts = sources.map(({ weight, file }) => {
    const localSrc = localFontCandidates(file).find((candidate) => existsSync(candidate));
    if (!localSrc) {
      console.warn(`[invoice-pdf] Missing local font ${file}. Falling back to CDN source.`);
    }
    const src = localSrc ?? remoteFontSource(weight);
    return { src, fontWeight: weight };
  });

  Font.register({ family: "Vazirmatn", fonts });
  fontsRegistered = true;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Vazirmatn",
    direction: "rtl",
    fontSize: 10,
    color: "#0f172a",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 16,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: "#475569",
  },
  titleRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  statusChip: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0f172a",
    paddingVertical: 4,
    paddingHorizontal: 12,
    fontSize: 10,
  },
  metaGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  metaItem: {
    width: "48%",
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 8,
    color: "#64748b",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 500,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  billToBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#e2e8f0",
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
  },
  tableRow: {
    flexDirection: "row-reverse",
  },
  tableCell: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    fontSize: 9,
    justifyContent: "center",
  },
  tableHeaderCell: {
    fontWeight: 700,
    fontSize: 9,
  },
  cellDescription: {
    flex: 3,
    alignItems: "flex-start",
  },
  cellPeriod: {
    flex: 2,
    alignItems: "flex-start",
  },
  cellQuantity: {
    flex: 1,
    alignItems: "center",
  },
  cellRight: {
    flex: 1.5,
    alignItems: "flex-end",
  },
  headerTextCenter: {
    textAlign: "center",
  },
  headerTextRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  textRight: {
    textAlign: "right",
  },
  totalsBox: {
    marginTop: 12,
    alignSelf: "flex-end",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "60%",
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 500,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  notes: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.5,
  },
  watermark: {
    position: "absolute",
    top: 320,
    left: 60,
    fontSize: 48,
    color: "#94a3b8",
    opacity: 0.15,
  },
});

const statusTitle = (invoice: Invoice): string => {
  if (invoice.status === "REFUNDED" && invoice.type === "REFUND") return "یادداشت بستانکاری";
  if (invoice.status === "VOID") return "باطل‌شده";
  if (invoice.status === "DRAFT") return "پیش‌فاکتور";
  return "فاکتور";
};

const statusChipLabel: Record<InvoiceStatus, string> = {
  DRAFT: "پیش‌فاکتور",
  PAID: "پرداخت‌شده",
  VOID: "باطل‌شده",
  REFUNDED: "بازپرداخت‌شده",
};

const typeLabel: Record<InvoiceType, string> = {
  SALE: "فروش",
  REFUND: "استرداد",
};

const watermarkText: Partial<Record<InvoiceStatus, string>> = {
  DRAFT: "DRAFT",
  VOID: "VOID",
  REFUNDED: "REFUNDED",
};

export type InvoicePdfRecord = Invoice & {
  payment: (Payment & {
    session: {
      price: {
        amount: number;
        currency: string;
        plan: { id: string; name: string; cycle: string } | null;
      } | null;
    } | null;
  }) | null;
  user: { id: string; email: string | null; name: string | null };
  relatedInvoice: { id: string; number: string | null; type: InvoiceType } | null;
};

type InvoicePdfProps = {
  invoice: InvoicePdfRecord;
};

const getPlanName = (invoice: InvoicePdfRecord): string =>
  invoice.planName ?? invoice.payment?.session?.price?.plan?.name ?? "پلن اشتراک";

const getPlanCycle = (invoice: InvoicePdfRecord): string | null =>
  invoice.planCycle ?? invoice.payment?.session?.price?.plan?.cycle ?? null;

const formatCycleLabel = (cycle: string | null): string => {
  if (!cycle) return "";
  switch (cycle) {
    case "MONTHLY":
      return "ماهانه";
    case "QUARTERLY":
      return "سه‌ماهه";
    case "YEARLY":
      return "سالانه";
    default:
      return cycle;
  }
};

const lineItemNotes = (invoice: InvoicePdfRecord): string | null =>
  invoice.type === "REFUND" ? invoice.notes ?? "استرداد پرداخت پیشین" : invoice.notes ?? null;

const InvoiceDocument = ({ invoice }: InvoicePdfProps) => {
  const number = invoice.number ?? "در انتظار تخصیص";
  const issued = formatInvoiceJalaliDate(invoice.issuedAt);
  const issuedIso = formatInvoiceIsoDate(invoice.issuedAt);
  const provider = invoice.payment?.provider ?? "-";
  const providerRef = maskProviderReference(invoice.payment?.providerRef ?? null);
  const title = statusTitle(invoice);
  const chip = statusChipLabel[invoice.status];
  const itemNote = lineItemNotes(invoice);
  const watermark = watermarkText[invoice.status];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {watermark ? <Text style={styles.watermark}>{watermark}</Text> : null}

        <View style={styles.header}>
          <Text style={styles.companyName}>شرکت کستینگ نگارش</Text>
          <Text style={styles.companyInfo}>
            شناسه اقتصادی ۱۴۰۱۲۳۴۵۶۷۸ · info@casting.example · www.casting.example
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.statusChip}>
            <Text>{chip}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>شماره فاکتور</Text>
            <Text style={styles.metaValue}>{number}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>تاریخ صدور</Text>
            <Text style={styles.metaValue}>{issued}</Text>
            <Text style={styles.metaLabel}>{issuedIso}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ارز</Text>
            <Text style={styles.metaValue}>{invoice.currency}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>نوع</Text>
            <Text style={styles.metaValue}>{typeLabel[invoice.type]}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>مرجع پرداخت</Text>
            <Text style={styles.metaValue}>{`${provider} · ${providerRef}`}</Text>
          </View>
          {invoice.relatedInvoice ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>مرتبط با</Text>
              <Text style={styles.metaValue}>
                {invoice.relatedInvoice.number ?? invoice.relatedInvoice.id}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>صورتحساب به نام</Text>
          <View style={styles.billToBox}>
            <Text>{invoice.user.name ?? "کاربر"}</Text>
            <Text>{invoice.user.email ?? "ایمیل ثبت نشده"}</Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>
              شناسه کاربر: {invoice.user.id}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>جزئیات آیتم</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={sx(styles.tableCell, styles.cellDescription)}>
                <Text style={styles.tableHeaderCell}>شرح</Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellPeriod)}>
                <Text style={styles.tableHeaderCell}>دوره پوشش</Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellQuantity)}>
                <Text style={sx(styles.tableHeaderCell, styles.headerTextCenter)}>تعداد</Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellRight)}>
                <Text style={sx(styles.tableHeaderCell, styles.headerTextRight)}>قیمت واحد</Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellRight)}>
                <Text style={sx(styles.tableHeaderCell, styles.headerTextRight)}>جمع خط</Text>
              </View>
            </View>

            <View style={sx(styles.tableRow, asStyle({ backgroundColor: "#f8fafc" }))}>
              <View style={sx(styles.tableCell, styles.cellDescription)}>
                <Text>{`${getPlanName(invoice)}${getPlanCycle(invoice) ? ` · ${formatCycleLabel(getPlanCycle(invoice))}` : ""}`}</Text>
                {itemNote ? (
                  <Text style={asStyle({ fontSize: 8, color: "#64748b", marginTop: 2 })}>
                    {itemNote}
                  </Text>
                ) : null}
              </View>
              <View style={sx(styles.tableCell, styles.cellPeriod)}>
                <Text>
                  {invoice.periodStart && invoice.periodEnd
                    ? `${formatInvoiceJalaliDate(invoice.periodStart)} تا ${formatInvoiceJalaliDate(
                        invoice.periodEnd,
                      )}`
                    : "دوره زمانی در دسترس نیست"}
                </Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellQuantity)}>
                <Text style={styles.textCenter}>
                  {formatInvoiceNumber(invoice.quantity ?? 1)}
                </Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellRight)}>
                <Text style={styles.textRight}>
                  {formatInvoiceCurrency(
                    invoice.unitAmount ??
                      Math.round(invoice.total / Math.max(invoice.quantity ?? 1, 1)),
                  )}
                </Text>
              </View>
              <View style={sx(styles.tableCell, styles.cellRight)}>
                <Text style={styles.textRight}>{formatInvoiceCurrency(invoice.total)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>جمع جزء</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(invoice.total)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>تخفیف</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(0)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>مالیات</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(0)}</Text>
            </View>
            <View style={sx(styles.totalRow, asStyle({ borderBottomWidth: 0 }))}>
              <Text style={sx(styles.totalLabel, asStyle({ fontWeight: 700 }))}>جمع کل</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>یادداشت‌ها</Text>
          <Text style={styles.notes}>
            این اشتراک غیرقابل انتقال است و در صورت وجود سوال می‌توانید با support@casting.example تماس
            بگیرید.
            {invoice.status === "VOID"
              ? " این فاکتور باطل شده است و صرفاً برای سوابق نگهداری می‌شود."
              : null}
            {invoice.status === "REFUNDED" && invoice.type === "REFUND"
              ? " مبلغ منفی نشان‌دهنده استرداد به حساب شما است."
              : null}
            {invoice.status === "DRAFT" ? " این پیش‌فاکتور نهایی نشده است و ممکن است تغییر کند." : null}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateInvoicePdf = async (invoice: InvoicePdfRecord): Promise<Buffer> => {
  registerFonts();
  try {
    return await renderToBuffer(<InvoiceDocument invoice={invoice} />);
  } catch (error) {
    console.error("[invoice-pdf] react-pdf render error", {
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
    });
    throw error;
  }
};
