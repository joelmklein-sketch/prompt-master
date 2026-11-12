import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Status } from '../types'

const status = atom({ plugin: 'prompt-master', key: 'status' } as const, 'idle' as Status)
const original = atom({ plugin: 'prompt-master', key: 'original' } as const, null as string | null)
const lastError = atom({ plugin: 'prompt-master', key: 'error' } as const, null as string | null)

const SYSTEM = `You rewrite a user's rough prompt for an AI coding/assistant agent into a better prompt.
Rules:
- Keep the user's intent, scope and voice. Never invent requirements, files, names or facts they did not give.
- State the goal first in one sentence, then the concrete details: context, constraints, expected output/format, and what "done" looks like.
- Fix spelling and grammar. Remove filler. Prefer short bullet points for multiple requirements.
- If something essential is ambiguous, add a final line "Ask me before assuming: ..." listing at most 2 open questions instead of guessing.
- Keep it as short as it can be while complete; never longer than ~3x the original.
- Output ONLY the rewritten prompt text. No preamble, no quotes, no markdown code fences.`

async function rewrite($: EngineInterface, draft: string): Promise<{ text: string } | { error: string }> {
  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough prompt:\n<<<\n${draft}\n>>>`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 45000,
  })
  if (!r.isAnswered) return { error: r.reason }
  const text = r.text.trim().replace(/^```[a-z]*\n?|\n?```$/g, '').trim()
  return text ? { text } : { error: 'empty-reply' }
}

async function runOnDraft($: EngineInterface): Promise<void> {
  if ((await read($, status)) === 'working') return
  const { text: draft } = await $.prompt.read()
  if (!draft.trim()) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return
  }
  await update($, status, () => 'working')
  await update($, lastError, () => null)
  const out = await rewrite($, draft)
  if ('error' in out) {
    await update($, status, () => 'error')
    await update($, lastError, () => out.error)
    return
  }
  // Only replace if the person hasn't kept typing while we worked.
  const now = await $.prompt.read()
  if (now.text !== draft) {
    await update($, status, () => 'error')
    await update($, lastError, () => 'draft changed while rewriting; press again')
    return
  }
  await $.prompt.fill({ text: out.text, mode: 'replace' })
  await update($, original, () => draft)
  await update($, status, () => 'idle')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pm',
      description: 'Prompt Master: rewrite a rough prompt (/pm <rough prompt>) and put it in the box to review',
    })
    return next(e)
  })

  on('command.run', { command: 'pm' }, async ($, e) => {
    const draft = e.args.trim()
    if (!draft) return { text: 'Usage: /pm <your rough prompt>', isTextDisplayOnly: true }
    const out = await rewrite($, draft)
    if ('error' in out) return { text: `Prompt Master failed: ${out.error}`, isTextDisplayOnly: true }
    await update($, original, () => draft)
    const filled = await $.prompt.fill({ text: out.text, mode: 'replace' })
    return {
      text: filled.isFilled
        ? 'Prompt Master: rewritten prompt is in the box. Edit if needed, then press Enter.'
        : `Prompt Master rewrite:\n\n${out.text}`,
      isTextDisplayOnly: true,
    }
  })

  // Once sent, drop the undo copy.
  on('prompt.submit', async ($, e, next) => {
    await update($, original, () => null).catch(() => undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const orig = await read($, original)
    const err = await read($, lastError)

    return (
      <Box>
        <Button
          key="pm"
          label={s === 'working' ? '✨ Rewriting…' : '✨ Prompt Master'}
          onPress={() => runOnDraft($)}
        />
        {orig !== null && s !== 'working' && (
          <Button
            key="undo"
            label="Undo"
            onPress={async () => {
              await $.prompt.fill({ text: orig, mode: 'replace' })
              await update($, original, () => null)
            }}
          />
        )}
        {s === 'error' && err && <Text color="red"> {err}</Text>}
      </Box>
    )
  })
}
