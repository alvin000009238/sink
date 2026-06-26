<script setup lang="ts">
import { toErrorMessage } from '#shared/utils/error'
import { watchDebounced } from '@vueuse/core'
import { Loader, RefreshCw, Save, ShieldX, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface BlockedSlug {
  slug: string
  reason: string | null
  created_at: number
  created_by: string | null
  created_by_email: string | null
}

const { locale } = useI18n()
const entries = ref<BlockedSlug[]>([])
const loading = ref(true)
const savingSlug = ref('')
const error = ref('')
const search = ref('')
const slugs = ref('')
const dailyCreateLimit = ref(20)
const savingSettings = ref(false)

async function loadEntries() {
  loading.value = true
  error.value = ''
  try {
    const [settings, blockedSlugs] = await Promise.all([
      useAPI<{ dailyCreateLimit: number }>('/api/admin/settings'),
      useAPI<BlockedSlug[]>('/api/admin/slug-blacklist', {
        query: {
          limit: 100,
          search: search.value || undefined,
        },
      }),
    ])
    dailyCreateLimit.value = settings.dailyCreateLimit
    entries.value = blockedSlugs
  }
  catch (e) {
    console.error(e)
    error.value = toErrorMessage(e)
  }
  finally {
    loading.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  try {
    const settings = await useAPI<{ dailyCreateLimit: number }>('/api/admin/settings', {
      method: 'POST',
      body: {
        dailyCreateLimit: dailyCreateLimit.value,
      },
    })
    dailyCreateLimit.value = settings.dailyCreateLimit
    toast.success('Settings saved')
  }
  catch (e) {
    console.error(e)
    toast.error('Failed to save settings', {
      description: toErrorMessage(e),
    })
  }
  finally {
    savingSettings.value = false
  }
}

async function blockSlug() {
  const nextSlugs = slugs.value.trim()
  if (!nextSlugs)
    return

  savingSlug.value = nextSlugs
  try {
    await useAPI('/api/admin/slug-blacklist', {
      method: 'POST',
      body: {
        slugs: nextSlugs,
      },
    })
    slugs.value = ''
    await loadEntries()
    toast.success('Slug blocked')
  }
  catch (e) {
    console.error(e)
    toast.error('Failed to block slug', {
      description: toErrorMessage(e),
    })
  }
  finally {
    savingSlug.value = ''
  }
}

async function unblockSlug(entry: BlockedSlug) {
  savingSlug.value = entry.slug
  try {
    await useAPI('/api/admin/slug-blacklist', {
      method: 'POST',
      body: {
        slug: entry.slug,
        blocked: false,
      },
    })
    entries.value = entries.value.filter(item => item.slug !== entry.slug)
    toast.success('Slug unblocked')
  }
  catch (e) {
    console.error(e)
    toast.error('Failed to unblock slug', {
      description: toErrorMessage(e),
    })
  }
  finally {
    savingSlug.value = ''
  }
}

watchDebounced(search, () => {
  loadEntries()
}, { debounce: 300, maxWait: 1000 })

onMounted(loadEntries)
</script>

<template>
  <main class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Policies
        </h1>
        <p class="text-sm text-muted-foreground">
          Manage reserved or abusive slugs before students can create them.
        </p>
      </div>
      <Button variant="outline" :disabled="loading" aria-label="Refresh policies" @click="loadEntries">
        <Loader v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Student Quota</CardTitle>
        <CardDescription>Set how many links each student can create per day. Use 0 for unlimited.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="grid gap-2">
          <Label for="daily-create-limit">Daily link limit</Label>
          <Input
            id="daily-create-limit"
            v-model.number="dailyCreateLimit"
            type="number"
            min="0"
            max="10000"
            step="1"
            class="w-40"
          />
        </div>
        <Button :disabled="savingSettings" @click="saveSettings">
          <Loader v-if="savingSettings" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Block Slug</CardTitle>
        <CardDescription>Enter one slug per line. Blocked slugs are rejected before D1 link creation.</CardDescription>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-3">
        <Textarea
          v-model="slugs"
          placeholder="slug-one&#10;slug-two"
          aria-label="Slugs to block"
          class="min-h-28"
        />
        <Button class="w-fit" :disabled="!slugs.trim() || !!savingSlug" @click="blockSlug">
          <Loader v-if="savingSlug" class="h-4 w-4 animate-spin" />
          <ShieldX v-else class="h-4 w-4" />
          Block
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Slug Blacklist</CardTitle>
        <CardDescription>Search and unblock existing entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input v-model="search" placeholder="Search slug..." aria-label="Search blocked slugs" />
      </CardContent>
    </Card>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Failed to load policies</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-else-if="loading" class="flex items-center justify-center py-12">
      <Loader class="h-6 w-6 animate-spin" />
    </div>

    <Card v-else-if="!entries.length">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        No blocked slugs found.
      </CardContent>
    </Card>

    <div v-else class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">
                Slug
              </th>
              <th class="px-4 py-3 font-medium">
                Created By
              </th>
              <th class="px-4 py-3 font-medium">
                Created
              </th>
              <th class="px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.slug" class="border-t">
              <td class="px-4 py-3 font-medium">
                {{ entry.slug }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ entry.created_by_email || entry.created_by || 'System' }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ longDate(entry.created_at, locale) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end">
                  <Button
                    size="icon"
                    variant="destructive"
                    :disabled="!!savingSlug"
                    aria-label="Unblock slug"
                    @click="unblockSlug(entry)"
                  >
                    <Loader
                      v-if="savingSlug === entry.slug" class="
                        h-4 w-4 animate-spin
                      "
                    />
                    <Trash2 v-else class="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
