import { describe, expect, it } from 'vitest'
import reportSource from '../app/components/home/Report.vue?raw'

describe('home report Turnstile flow', () => {
  it('runs Turnstile only from the submit flow', () => {
    expect(reportSource).toContain('\'execution\': \'execute\'')
    expect(reportSource).toContain('\'appearance\': \'execute\'')
    expect(reportSource).not.toContain('class="cf-turnstile"')

    const executeCalls = reportSource.match(/turnstile\.execute/g) ?? []
    expect(executeCalls).toHaveLength(1)
    expect(reportSource.indexOf('turnstile.execute(widgetId.value)')).toBeGreaterThan(reportSource.indexOf('function getTurnstileToken'))
    expect(reportSource.indexOf('turnstileToken = await getTurnstileToken()')).toBeGreaterThan(reportSource.indexOf('async function submitReport'))
  })
})
