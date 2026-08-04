import * as React from "react";
import { Hr, Section, Text } from "@react-email/components";

export const brand = {
  nearBlack: "#1A1A2E",
  mustard: "#F0A500",
  pink: "#E87FA3",
  cobalt: "#2B35AF",
  cream: "#FAFAF8",
  muted: "rgba(26, 26, 46, 0.65)",
  subtle: "rgba(26, 26, 46, 0.5)",
  border: "rgba(26, 26, 46, 0.1)",
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  sans: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
};

export const styles = {
  main: {
    backgroundColor: "#ffffff",
    fontFamily: brand.sans,
    margin: 0,
    padding: 0,
  } as const,
  container: {
    maxWidth: "520px",
    margin: "0 auto",
    padding: "40px 32px 48px",
  } as const,
  header: {
    paddingBottom: "32px",
  } as const,
  h1: {
    fontFamily: brand.serif,
    fontSize: "34px",
    fontWeight: 400 as const,
    lineHeight: "1.15",
    color: brand.nearBlack,
    margin: "0 0 20px",
    letterSpacing: "-0.01em",
  } as const,
  italic: {
    fontStyle: "italic" as const,
  } as const,
  text: {
    fontFamily: brand.sans,
    fontSize: "15px",
    color: brand.muted,
    lineHeight: "1.6",
    margin: "0 0 20px",
  } as const,
  link: { color: brand.nearBlack, textDecoration: "underline" } as const,
  button: {
    backgroundColor: brand.nearBlack,
    color: "#ffffff",
    fontFamily: brand.sans,
    fontSize: "14px",
    fontWeight: 500 as const,
    letterSpacing: "0.01em",
    borderRadius: "4px",
    padding: "14px 24px",
    textDecoration: "none",
    display: "inline-block",
  } as const,
  code: {
    fontFamily: '"SFMono-Regular", Menlo, Consolas, monospace',
    fontSize: "28px",
    fontWeight: 600 as const,
    color: brand.nearBlack,
    backgroundColor: "#FAFAF8",
    border: `1px solid ${brand.border}`,
    borderRadius: "4px",
    padding: "16px 20px",
    margin: "0 0 28px",
    letterSpacing: "0.2em",
    textAlign: "center" as const,
  } as const,
  hr: {
    borderColor: brand.border,
    margin: "40px 0 20px",
  } as const,
  footer: {
    fontFamily: brand.sans,
    fontSize: "12px",
    color: brand.subtle,
    lineHeight: "1.5",
    margin: "0",
  } as const,
};

export function Wordmark() {
  return (
    <Section style={styles.header}>
      <Text
        style={{
          fontFamily: brand.serif,
          fontSize: "28px",
          lineHeight: 1,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        <span style={{ color: brand.mustard, fontStyle: "italic" }}>dwell</span>
        <span style={{ color: brand.pink }}>made</span>
      </Text>
    </Section>
  );
}

export function Footer({ siteName }: { siteName?: string }) {
  return (
    <>
      <Hr style={styles.hr} />
      <Text style={styles.footer}>
        {siteName ? `Sent by ${siteName}` : "Sent by dwellmade"} · Interior redesign from your
        inspiration.
      </Text>
    </>
  );
}
