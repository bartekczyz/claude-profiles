export interface FaqEntry {
  question: string
  answer: string
}

export const faqEntries: ReadonlyArray<FaqEntry> = [
  {
    question: 'Does this send any of my data anywhere?',
    answer:
      'No. The app is local-only and has no analytics, no telemetry, no remote logging. The only outbound request it makes is to check the GitHub Releases manifest for updates.',
  },
  {
    question: 'Is it really free?',
    answer:
      'Yes, MIT licensed. There is a paid app called Multi-Claude that pioneered the desktop-app half of this approach — claude-profiles extends it to the Claude Code CLI and ships open-source.',
  },
  {
    question: 'What if I already have Claude installed?',
    answer:
      'On first launch, claude-profiles offers to import your existing install as a named profile so you do not lose history. You can skip this and migrate later from Settings.',
  },
  {
    question: 'Is it affiliated with Anthropic?',
    answer: 'No. claude-profiles is an independent project. "Claude" and "Anthropic" are trademarks of Anthropic, PBC.',
  },
  {
    question: 'Is it safe? What about my Keychain credentials?',
    answer:
      'Each profile gets its own Keychain entry, derived from the per-profile config directory. claude-profiles does not read or copy your credentials — Claude Code handles all of that itself. The isolation depends on undocumented Claude Code internals and could break in a future Claude Code release; if it does, we will patch.',
  },
]
