<script setup lang="ts">
import { FileText } from 'lucide-vue-next'

const { t } = useI18n()
const { title } = useAppConfig()

useSeoMeta({
  title: `${t('terms.title')} - ${title}`,
  description: t('terms.description'),
})

const lastUpdatedDate = '2026-06-24'
</script>

<template>
  <div
    class="
      mx-auto w-full max-w-4xl px-6 py-12
      md:py-20
    "
  >
    <div class="mb-10 text-center">
      <div
        class="
          mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full
          bg-primary/10 text-primary
        "
      >
        <FileText class="size-8" />
      </div>
      <h1
        class="
          text-3xl font-extrabold tracking-tight
          sm:text-4xl
          md:text-5xl
        "
      >
        {{ t('terms.title') }}
      </h1>
      <p class="mt-4 text-lg text-muted-foreground">
        {{ t('terms.description') }}
      </p>
      <div class="mt-3 text-sm text-muted-foreground/80">
        {{ t('terms.last_updated', { date: lastUpdatedDate }) }}
      </div>
    </div>

    <Card class="border bg-card/60 backdrop-blur-md">
      <CardContent
        class="
          space-y-8 p-6
          sm:p-10
        "
      >
        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.introduction_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.introduction_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.usage_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.usage_desc') }}
          </p>
          <ul class="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>{{ t('terms.usage_item1') }}</li>
            <li>{{ t('terms.usage_item2') }}</li>
            <li>{{ t('terms.usage_item3') }}</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.limitation_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.limitation_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.liability_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.liability_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.updates_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.updates_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('terms.contact_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('terms.contact_desc') }}
          </p>
        </section>
      </CardContent>
    </Card>
  </div>
</template>
