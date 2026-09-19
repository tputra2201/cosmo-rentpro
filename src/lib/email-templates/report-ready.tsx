import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  storeName?: string
  reportTitle?: string
  periodText?: string
  createdAt?: string
  senderName?: string
  fileName?: string
  downloadUrl?: string
}

const Email = ({
  storeName = '',
  reportTitle = 'Laporan',
  periodText = '',
  createdAt = '',
  senderName = '',
  fileName = '',
  downloadUrl = '#',
}: Props) => (
  <Html lang="id" dir="ltr">
    <Head />
    <Preview>{`${reportTitle}${periodText ? ` — ${periodText}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>RenToPlay</Text>
        <Heading style={heading}>{reportTitle}</Heading>
        {storeName ? <Text style={row}>Store: {storeName}</Text> : null}
        {periodText ? <Text style={row}>{periodText}</Text> : null}
        {createdAt ? <Text style={row}>Dibuat: {createdAt}</Text> : null}
        {senderName ? <Text style={row}>Dikirim oleh: {senderName}</Text> : null}
        {fileName ? <Text style={row}>Berkas: {fileName}</Text> : null}

        <Section style={{ margin: '28px 0' }}>
          <Button style={button} href={downloadUrl}>
            Unduh laporan Excel
          </Button>
        </Section>

        <Text style={note}>
          Tautan unduh berlaku 7 hari sejak email ini dikirim. Simpan berkasnya bila perlu
          disimpan lebih lama.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Email ini dikirim otomatis oleh aplikasi RenToPlay.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${data['reportTitle'] ?? 'Laporan'}${data['periodText'] ? ` — ${data['periodText']}` : ''}`,
  displayName: 'Laporan siap diunduh',
  previewData: {
    storeName: 'RenToPlay Makassar',
    reportTitle: 'Laporan RenToPlay Makassar',
    periodText: 'Periode: 19 September 2026',
    createdAt: '19/09/2026 23.10',
    senderName: 'Taufiq',
    fileName: 'laporan-rentoplay-2026-09-19.xlsx',
    downloadUrl: 'https://rentoplay.id',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '2px',
  color: '#7c3aed',
  fontWeight: 'bold' as const,
  margin: '0 0 8px',
}
const heading = { fontSize: '22px', color: '#111827', margin: '0 0 16px' }
const row = { fontSize: '14px', color: '#374151', margin: '4px 0' }
const button = {
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const note = { fontSize: '13px', color: '#6b7280', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0' }
