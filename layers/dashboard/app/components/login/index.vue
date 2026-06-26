<script setup lang="ts">
import { toErrorMessage } from '#shared/utils/error'
import { AlertCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const { previewMode } = useRuntimeConfig().public
const { setToken, removeToken } = useAuthToken()

const token = ref('')
const error = ref('')
const googleLoginUrl = '/api/auth/google/start'
const showAdmin = ref(false)
const isWebView = ref(false)

onMounted(() => {
  if (typeof window !== 'undefined' && window.navigator) {
    const ua = window.navigator.userAgent || window.navigator.vendor || ''
    isWebView.value = /Line|FBAV|FBAN|Instagram|MicroMessenger|wv|WebView/i.test(ua)
  }
})

const LoginSchema = z.object({
  token: z.string().min(1),
})

async function handleSubmit() {
  error.value = ''
  const result = LoginSchema.safeParse({ token: token.value })

  if (!result.success) {
    error.value = t('login.token_required')
    return
  }

  try {
    setToken(token.value)
    await useAPI('/api/verify')
    navigateTo('/dashboard')
  }
  catch (e) {
    removeToken()
    console.error(e)
    toast.error(t('login.failed'), {
      description: toErrorMessage(e),
    })
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl">
        {{ showAdmin ? $t('login.admin_title') : $t('login.title') }}
      </CardTitle>
      <CardDescription>
        {{ showAdmin ? $t('login.admin_description') : $t('login.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <template v-if="!showAdmin">
        <Alert v-if="isWebView" variant="destructive" class="mb-2">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>{{ $t('login.disallowed_useragent_title') }}</AlertTitle>
          <AlertDescription>
            {{ $t('login.disallowed_useragent_desc') }}
          </AlertDescription>
        </Alert>

        <Button
          v-if="isWebView"
          disabled
          variant="outline"
          class="w-full py-6 text-base font-semibold"
        >
          <span
            class="
              flex items-center justify-center text-muted-foreground opacity-50
            "
          >
            <svg class="mr-3 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            {{ $t('login.google_school') }}
          </span>
        </Button>
        <Button
          v-else
          as-child variant="outline" class="w-full py-6 text-base font-semibold"
        >
          <a :href="googleLoginUrl" class="flex items-center justify-center">
            <svg class="mr-3 h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            {{ $t('login.google_school') }}
          </a>
        </Button>
        <div class="mt-2 text-center">
          <button
            type="button"
            class="
              text-xs text-muted-foreground underline underline-offset-4
              transition-colors
              hover:text-primary
            "
            @click="showAdmin = true"
          >
            {{ $t('login.admin_login_link') }}
          </button>
        </div>
      </template>

      <template v-else>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Hidden username field for password managers -->
          <Input
            type="text"
            name="username"
            autocomplete="username"
            value="root"
            readonly
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
          />
          <FieldGroup>
            <Field :data-invalid="!!error">
              <FieldLabel for="token">
                {{ $t('login.token_label') }}
              </FieldLabel>
              <Input
                id="token"
                v-model="token"
                type="password"
                name="password"
                autocomplete="current-password"
                placeholder="********"
                :aria-invalid="!!error"
              />
              <FieldError v-if="error" :errors="[error]" />
            </Field>
          </FieldGroup>

          <Alert v-if="previewMode">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>{{ $t('login.tips') }}</AlertTitle>
            <AlertDescription>
              {{ $t('login.preview_token') }}
              <code class="font-mono text-green-500">SinkCool</code>
            </AlertDescription>
          </Alert>

          <Button class="w-full" type="submit">
            {{ $t('login.submit') }}
          </Button>
        </form>
        <div class="mt-2 text-center">
          <button
            type="button"
            class="
              text-xs text-muted-foreground underline underline-offset-4
              transition-colors
              hover:text-primary
            "
            @click="showAdmin = false"
          >
            {{ $t('login.back_to_google') }}
          </button>
        </div>
      </template>

      <div class="mt-2 flex items-center justify-center gap-2">
        <NuxtLink
          to="/privacy"
          class="
            text-xs text-muted-foreground underline underline-offset-4
            transition-colors
            hover:text-primary
          "
          :title="$t('layouts.footer.privacy')"
        >
          {{ $t('layouts.footer.privacy') }}
        </NuxtLink>
        <span class="text-xs text-muted-foreground">•</span>
        <NuxtLink
          to="/terms"
          class="
            text-xs text-muted-foreground underline underline-offset-4
            transition-colors
            hover:text-primary
          "
          :title="$t('layouts.footer.terms')"
        >
          {{ $t('layouts.footer.terms') }}
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
