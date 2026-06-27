import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import { Footer, Wordmark, styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Wordmark />
        <Heading style={styles.h1}>
          Your <span style={styles.italic}>login</span> link
        </Heading>
        <Text style={styles.text}>
          Click the button below to log in to {siteName}. This link will expire shortly.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Log in
        </Button>
        <Footer siteName={siteName} />
        <Text style={{ ...styles.footer, marginTop: '12px' }}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
