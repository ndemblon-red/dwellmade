import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { Footer, Wordmark, styles } from "./_brand";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Wordmark />
        <Heading style={styles.h1}>
          You've been <span style={styles.italic}>invited</span>
        </Heading>
        <Text style={styles.text}>
          You've been invited to join{" "}
          <Link href={siteUrl} style={styles.link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your account.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Accept invitation
        </Button>
        <Footer siteName={siteName} />
        <Text style={{ ...styles.footer, marginTop: "12px" }}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;
