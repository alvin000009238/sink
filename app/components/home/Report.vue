<script setup lang="ts">
import { toErrorMessage } from '#shared/utils/error'
import { AlertCircle, CheckCircle2, Loader, Send } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface TurnstileWindow extends Window {
  turnstile?: {
    execute: (widgetId: string) => void
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string
    reset: () => void
  }
}

interface TurnstileRenderOptions {
  'sitekey': string
  'action': string
  'size': 'invisible'
  'execution': 'execute'
  'appearance': 'execute'
  'callback': (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
}

const { t } = useI18n()
const form = ref<HTMLFormElement>()
const turnstileContainer = ref<HTMLElement>()
const target = ref('')
const reason = ref('')
const details = ref('')
const loading = ref(false)
const submitted = ref(false)
const siteKey = ref('')
const widgetId = ref('')
let resolveTurnstile: ((token: string) => void) | undefined
let rejectTurnstile: (() => void) | undefined

useHead(() => siteKey.value
  ? {
      script: [{
        src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
        async: true,
        defer: true,
      }],
    }
  : {})

onMounted(async () => {
  try {
    const config = await $fetch<{ turnstileSiteKey: string }>('/api/public-config')
    siteKey.value = config.turnstileSiteKey
    await nextTick()
    const interval = window.setInterval(() => {
      renderTurnstile()
      if (widgetId.value)
        window.clearInterval(interval)
    }, 100)
  }
  catch (e) {
    console.error(e)
  }
})

function resetTurnstile() {
  if (import.meta.client)
    (window as TurnstileWindow).turnstile?.reset()
}

function renderTurnstile() {
  const turnstile = (window as TurnstileWindow).turnstile
  if (!turnstile || !turnstileContainer.value || !siteKey.value || widgetId.value)
    return

  widgetId.value = turnstile.render(turnstileContainer.value, {
    'sitekey': siteKey.value,
    'action': 'turnstile-spin-v1',
    'size': 'invisible',
    'execution': 'execute',
    'appearance': 'execute',
    'callback': (token) => {
      resolveTurnstile?.(token)
      resolveTurnstile = undefined
      rejectTurnstile = undefined
    },
    'error-callback': () => {
      rejectTurnstile?.()
      resolveTurnstile = undefined
      rejectTurnstile = undefined
    },
    'expired-callback': () => {
      rejectTurnstile?.()
      resolveTurnstile = undefined
      rejectTurnstile = undefined
    },
  })
}

function getTurnstileToken(): Promise<string> {
  const turnstile = (window as TurnstileWindow).turnstile
  if (!turnstile || !widgetId.value)
    return Promise.reject(new Error('Turnstile is not ready'))

  return new Promise((resolve, reject) => {
    resolveTurnstile = resolve
    rejectTurnstile = reject
    turnstile.execute(widgetId.value)
  })
}

async function submitReport() {
  if (!form.value || !target.value.trim() || !reason.value.trim() || loading.value)
    return

  loading.value = true
  submitted.value = false
  let turnstileToken = ''
  try {
    turnstileToken = await getTurnstileToken()
  }
  catch {
    loading.value = false
    toast.error(t('home.report.verify_required'))
    return
  }

  try {
    await $fetch('/api/link/anonymous-report', {
      method: 'POST',
      body: {
        slug: target.value.trim(),
        reason: reason.value.trim(),
        details: details.value.trim() || undefined,
        turnstileToken,
      },
    })
    target.value = ''
    reason.value = ''
    details.value = ''
    submitted.value = true
    toast.success(t('home.report.submit_success'))
  }
  catch (e) {
    console.error(e)
    toast.error(t('home.report.submit_failed'), {
      description: toErrorMessage(e),
    })
  }
  finally {
    loading.value = false
    resetTurnstile()
  }
}
</script>

<template>
  <section class="py-12">
    <div class="mx-auto max-w-6xl px-6">
      <div
        class="
          mx-auto grid max-w-4xl gap-6 rounded-xl border p-6
          md:grid-cols-[1fr_1.25fr] md:p-8
        "
      >
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-sm font-medium">
            <AlertCircle class="h-4 w-4" />
            {{ $t('home.report.badge') }}
          </div>
          <h2 class="text-2xl font-semibold text-balance">
            {{ $t('home.report.title') }}
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ $t('home.report.description') }}
          </p>
          <p
            v-if="submitted" class="
              flex items-center gap-2 text-sm text-emerald-600
            "
          >
            <CheckCircle2 class="h-4 w-4" />
            {{ $t('home.report.success_inline') }}
          </p>
        </div>

        <form ref="form" class="space-y-3" @submit.prevent="submitReport">
          <Input v-model="target" :placeholder="$t('home.report.target_placeholder')" aria-label="Reported short link" />
          <Input v-model="reason" :placeholder="$t('home.report.reason_placeholder')" aria-label="Report reason" />
          <Textarea v-model="details" :placeholder="$t('home.report.details_placeholder')" aria-label="Report details" />
          <div v-if="siteKey" ref="turnstileContainer" />
          <Alert v-else variant="destructive">
            <AlertTitle>{{ $t('home.report.turnstile_missing_title') }}</AlertTitle>
            <AlertDescription>{{ $t('home.report.turnstile_missing_description') }}</AlertDescription>
          </Alert>
          <Button type="submit" :disabled="!siteKey || !target.trim() || !reason.trim() || loading">
            <Loader v-if="loading" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            {{ $t('home.report.submit') }}
          </Button>
        </form>
      </div>
    </div>
  </section>
</template>
