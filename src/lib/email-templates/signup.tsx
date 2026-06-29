import * as React from 'react'

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
} from '@react-email/components'
import { Footer, Wordmark, styles } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Wordmark />
        <Heading style={styles.h1}>
          Confirm your <span style={styles.italic}>email</span>
        </Heading>
        <Text style={styles.text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={styles.link}>
            <strong>{siteName}</strong>
          </Link>
          . Please confirm{' '}
          <Link href={`mailto:${recipient}`} style={styles.link}>
            {recipient}
          </Link>{' '}
          by clicking the button below.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Verify email
        </Button>
        <Footer siteName={siteName} />
        <Text style={{ ...styles.footer, marginTop: '12px' }}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
