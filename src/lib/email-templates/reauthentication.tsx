import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import { Footer, Wordmark, styles } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Wordmark />
        <Heading style={styles.h1}>
          Confirm <span style={styles.italic}>reauthentication</span>
        </Heading>
        <Text style={styles.text}>Use the code below to confirm your identity:</Text>
        <Text style={styles.code}>{token}</Text>
        <Footer />
        <Text style={{ ...styles.footer, marginTop: '12px' }}>
          This code will expire shortly. If you didn't request this, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
