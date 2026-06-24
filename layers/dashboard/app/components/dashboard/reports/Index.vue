<script setup lang="ts">
import { Ban, CheckCircle2, Loader, RefreshCw, Send, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface LinkReport {
  id: string
  slug: string
  reason: string
  details: string | null
  status: 'open' | 'reviewing' | 'resolved' | 'rejected'
  created_at: number
  reporter_email?: string | null
}

const { t, locale } = useI18n()
const { user } = useCurrentUser()
const reports = ref<LinkReport[]>([])
const loading = ref(true)
const actionId = ref('')
const error = ref('')
const slug = ref('')
const reason = ref('')
const details = ref('')

const isAdmin = computed(() => user.value?.role === 'admin')

async function loadReports() {
  loading.value = true
  error.value = ''
  try {
    reports.value = await useAPI<LinkReport[]>(isAdmin.value ? '/api/admin/reports' : '/api/link/reports', {
      query: isAdmin.value ? { status: 'open', limit: 100 } : { limit: 100 },
    })
  }
  catch (e) {
    console.error(e)
    error.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    loading.value = false
  }
}

async function submitReport() {
  const reportSlug = slug.value.trim()
  const reportReason = reason.value.trim()
  if (!reportSlug || !reportReason)
    return

  actionId.value = 'submit'
  try {
    await useAPI('/api/link/report', {
      method: 'POST',
      body: {
        slug: reportSlug,
        reason: reportReason,
        details: details.value.trim() || undefined,
      },
    })
    slug.value = ''
    reason.value = ''
    details.value = ''
    await loadReports()
    toast.success('Report submitted')
  }
  catch (e) {
    console.error(e)
    toast.error('Failed to submit report', {
      description: e instanceof Error ? e.message : String(e),
    })
  }
  finally {
    actionId.value = ''
  }
}

async function updateStatus(report: LinkReport, status: 'active' | 'disabled' | 'deleted') {
  actionId.value = `${report.id}:${status}`
  try {
    await useAPI('/api/admin/link-status', {
      method: 'POST',
      body: { slug: report.slug, status },
    })
    await useAPI('/api/admin/report-status', {
      method: 'POST',
      body: {
        id: report.id,
        status: status === 'active' ? 'rejected' : 'resolved',
      },
    })
    reports.value = reports.value.filter(item => item.id !== report.id)
    toast.success(t('reports.action_success'))
  }
  catch (e) {
    console.error(e)
    toast.error(t('reports.action_failed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  }
  finally {
    actionId.value = ''
  }
}

onMounted(loadReports)
</script>

<template>
  <main class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ isAdmin ? $t('reports.title') : 'Reports' }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ isAdmin ? $t('reports.description') : 'Submit reports and review your report history.' }}
        </p>
      </div>
      <Button variant="outline" :disabled="loading" aria-label="Refresh reports" @click="loadReports">
        <Loader v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button>
    </div>

    <Card v-if="!isAdmin">
      <CardHeader>
        <CardTitle>Submit Report</CardTitle>
        <CardDescription>Report an active short link for admin review.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div
          class="
            grid grid-cols-1 gap-3
            md:grid-cols-[220px_1fr]
          "
        >
          <Input v-model="slug" placeholder="slug" aria-label="Reported slug" @keydown.enter="submitReport" />
          <Input v-model="reason" placeholder="Reason" aria-label="Report reason" @keydown.enter="submitReport" />
        </div>
        <Textarea v-model="details" placeholder="Details" aria-label="Report details" />
        <div class="flex justify-end">
          <Button :disabled="!slug.trim() || !reason.trim() || !!actionId" @click="submitReport">
            <Loader v-if="actionId === 'submit'" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>{{ $t('reports.load_failed') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-else-if="loading" class="flex items-center justify-center py-12">
      <Loader class="h-6 w-6 animate-spin" />
    </div>

    <Card v-else-if="!reports.length">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        {{ isAdmin ? $t('reports.empty') : 'No reports found.' }}
      </CardContent>
    </Card>

    <div v-else class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">
                {{ $t('reports.slug') }}
              </th>
              <th class="px-4 py-3 font-medium">
                {{ $t('reports.reason') }}
              </th>
              <th v-if="isAdmin" class="px-4 py-3 font-medium">
                {{ $t('reports.reporter') }}
              </th>
              <th v-else class="px-4 py-3 font-medium">
                Status
              </th>
              <th class="px-4 py-3 font-medium">
                {{ $t('reports.created_at') }}
              </th>
              <th v-if="isAdmin" class="px-4 py-3 text-right font-medium">
                {{ $t('reports.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in reports" :key="report.id" class="border-t">
              <td class="px-4 py-3 font-medium">
                {{ report.slug }}
              </td>
              <td class="max-w-md px-4 py-3">
                <div class="font-medium">
                  {{ report.reason }}
                </div>
                <p
                  v-if="report.details" class="
                    mt-1 line-clamp-2 text-muted-foreground
                  "
                >
                  {{ report.details }}
                </p>
              </td>
              <td v-if="isAdmin" class="px-4 py-3 text-muted-foreground">
                {{ report.reporter_email || $t('dashboard.none') }}
              </td>
              <td v-else class="px-4 py-3">
                <Badge variant="secondary">
                  {{ report.status }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ longDate(report.created_at, locale) }}
              </td>
              <td v-if="isAdmin" class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    :disabled="!!actionId"
                    :aria-label="$t('reports.keep_active')"
                    @click="updateStatus(report, 'active')"
                  >
                    <Loader
                      v-if="actionId === `${report.id}:active`" class="
                        h-4 w-4 animate-spin
                      "
                    />
                    <CheckCircle2 v-else class="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    :disabled="!!actionId"
                    :aria-label="$t('reports.disable')"
                    @click="updateStatus(report, 'disabled')"
                  >
                    <Loader
                      v-if="actionId === `${report.id}:disabled`" class="
                        h-4 w-4 animate-spin
                      "
                    />
                    <Ban v-else class="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    :disabled="!!actionId"
                    :aria-label="$t('reports.delete')"
                    @click="updateStatus(report, 'deleted')"
                  >
                    <Loader
                      v-if="actionId === `${report.id}:deleted`" class="
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
