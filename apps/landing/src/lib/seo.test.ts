import { describe, expect, it } from 'vitest'

import { faqPageLd, softwareApplicationLd } from './seo'

describe('softwareApplicationLd', () => {
  it('emits the schema.org context and SoftwareApplication type', () => {
    const ld = softwareApplicationLd({ siteUrl: 'https://example.com/', version: 'v1.2.3' })
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('SoftwareApplication')
    expect(ld.softwareVersion).toBe('v1.2.3')
    expect(ld.url).toBe('https://example.com/')
  })
})

describe('faqPageLd', () => {
  it('wraps each FAQ entry as a schema.org Question', () => {
    const ld = faqPageLd([{ question: 'Is it free?', answer: 'Yes.' }])
    const entries = ld.mainEntity as ReadonlyArray<{ '@type': string; name: string; acceptedAnswer: { text: string } }>
    expect(entries).toHaveLength(1)
    expect(entries[0]['@type']).toBe('Question')
    expect(entries[0].name).toBe('Is it free?')
    expect(entries[0].acceptedAnswer.text).toBe('Yes.')
  })

  it('defaults to the bundled faqEntries when no argument is passed', () => {
    const ld = faqPageLd()
    const entries = ld.mainEntity as ReadonlyArray<unknown>
    expect(entries.length).toBeGreaterThanOrEqual(5)
  })
})
