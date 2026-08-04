import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { Footer, Wordmark, styles } from "./_brand";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Wordmark />
        <Heading style={styles.h1}>
          Reset your <span style={styles.italic}>password</span>
        </Heading>
        <Text style={styles.text}>
          We received a request to reset your password for {siteName}. Click the button below to
          choose a new password.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Reset password
        </Button>
        <Footer siteName={siteName} />
        <Text style={{ ...styles.footer, marginTop: "12px" }}>
          If you didn't request a password reset, you can safely ignore this email — your password
          will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;
