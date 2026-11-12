import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'prompt-master',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

test('the button rewrites the draft in place, and Undo puts it back', async ($, on) => {
  let box = ''
    on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
    on('prompt.fill', (_, e) => {
      box = e.text
      return { isFilled: true, text: box }
    })
    on('model.complete', () => ({
      value: { isAnswered: true, text: 'Speed up the login flow.', usage: { input_tokens: 1, output_tokens: 1 } },
  }))

  for (const surface of ['terminal', 'desktop'] as const) {
    box = 'make login faster pls'
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'pm' })
    expect(box).toBe('Speed up the login flow.')
    await ui.press({ key: 'undo' })
    expect(box).toBe('make login faster pls')
    await ui.unmount()
  }
})
