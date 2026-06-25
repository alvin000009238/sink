<script setup lang="ts">
import 'vue-sonner/style.css'

const { title, description, image } = useAppConfig()
const route = useRoute()
const localeHead = useLocaleHead()

useSeoMeta({
  title: `${title} - 簡單、快速、安全的短網址服務`,
  description,
  ogType: 'website',
  ogTitle: title,
  ogSiteName: title,
  ogDescription: description,
  ogImage: image,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: computed(() => `https://s.clhs.dev${route.path}`),
    },
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon-96x96.png',
      sizes: '96x96',
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/favicon.svg',
    },
    {
      rel: 'shortcut icon',
      href: '/favicon.ico',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest',
    },
  ],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="#000" />
    <NuxtPage />
    <Toaster position="top-center" rich-colors />
  </NuxtLayout>
</template>
