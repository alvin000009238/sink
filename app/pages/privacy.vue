<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'

const { t } = useI18n()
const { title } = useAppConfig()

useSeoMeta({
  title: `${t('privacy.title')} - ${title}`,
  description: t('privacy.description'),
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
        <ShieldCheck class="size-8" />
      </div>
      <h1
        class="
          text-3xl font-extrabold tracking-tight
          sm:text-4xl
          md:text-5xl
        "
      >
        {{ t('privacy.title') }}
      </h1>
      <p class="mt-4 text-lg text-muted-foreground">
        {{ t('privacy.description') }}
      </p>
      <div class="mt-3 text-sm text-muted-foreground/80">
        {{ t('privacy.last_updated', { date: lastUpdatedDate }) }}
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
            {{ t('privacy.introduction_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.introduction_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.data_collection_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.data_collection_desc') }}
          </p>
          <ul class="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>{{ t('privacy.data_collection_item1') }}</li>
            <li>{{ t('privacy.data_collection_item2') }}</li>
            <li>{{ t('privacy.data_collection_item3') }}</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.data_use_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.data_use_desc') }}
          </p>
          <ul class="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>{{ t('privacy.data_use_item1') }}</li>
            <li>{{ t('privacy.data_use_item2') }}</li>
            <li>{{ t('privacy.data_use_item3') }}</li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.data_storage_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.data_storage_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.user_rights_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.user_rights_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.policy_updates_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.policy_updates_desc') }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-xl font-bold text-foreground">
            {{ t('privacy.contact_title') }}
          </h2>
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.contact_desc') }}
          </p>
        </section>
      </CardContent>
    </Card>
  </div>
</template>
