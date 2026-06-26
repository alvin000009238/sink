<script setup lang="ts">
import { toErrorMessage } from '#shared/utils/error'
import { watchDebounced } from '@vueuse/core'
import { LinkIcon, Loader, RefreshCw, Shield, UserCheck, UserX } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface ManagedUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
  created_at: number
  updated_at: number
  link_count: number
  active_session_count: number
}

const { locale } = useI18n()
const { user: currentUser } = useCurrentUser()
const users = ref<ManagedUser[]>([])
const loading = ref(true)
const savingId = ref('')
const error = ref('')
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

const activeCount = computed(() => users.value.filter(item => item.status === 'active').length)
const disabledCount = computed(() => users.value.filter(item => item.status === 'disabled').length)
const adminCount = computed(() => users.value.filter(item => item.role === 'admin').length)

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    users.value = await useAPI<ManagedUser[]>('/api/admin/users', {
      query: {
        limit: 100,
        search: search.value || undefined,
        role: roleFilter.value || undefined,
        status: statusFilter.value || undefined,
      },
    })
  }
  catch (e) {
    console.error(e)
    error.value = toErrorMessage(e)
  }
  finally {
    loading.value = false
  }
}

function replaceUser(updated: ManagedUser) {
  const index = users.value.findIndex(item => item.id === updated.id)
  if (index >= 0) {
    users.value[index] = {
      ...users.value[index],
      ...updated,
    }
  }
}

function isProtectedUser(item: ManagedUser) {
  return item.id === 'system' || item.id === currentUser.value?.id
}

async function updateUser(item: ManagedUser, patch: Pick<ManagedUser, 'role'> | Pick<ManagedUser, 'status'>) {
  savingId.value = `${item.id}:${'role' in patch ? 'role' : 'status'}`
  try {
    const updated = await useAPI<ManagedUser>('/api/admin/user-status', {
      method: 'POST',
      body: {
        id: item.id,
        ...patch,
      },
    })
    replaceUser(updated)
    toast.success('User updated')
  }
  catch (e) {
    console.error(e)
    toast.error('Failed to update user', {
      description: toErrorMessage(e),
    })
  }
  finally {
    savingId.value = ''
  }
}

watchDebounced([search, roleFilter, statusFilter], () => {
  loadUsers()
}, { debounce: 300, maxWait: 1000 })

onMounted(loadUsers)
</script>

<template>
  <main class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Users
        </h1>
        <p class="text-sm text-muted-foreground">
          Manage school OAuth users, roles, and access status.
        </p>
      </div>
      <Button variant="outline" :disabled="loading" aria-label="Refresh users" @click="loadUsers">
        <Loader v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Refresh
      </Button>
    </div>

    <section
      class="
        grid grid-cols-1 gap-4
        sm:grid-cols-3
      "
    >
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Active users</CardDescription>
          <CardTitle>{{ activeCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Disabled users</CardDescription>
          <CardTitle>{{ disabledCount }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Admins</CardDescription>
          <CardTitle>{{ adminCount }}</CardTitle>
        </CardHeader>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>User Directory</CardTitle>
        <CardDescription>Filter by email, role, or account status.</CardDescription>
      </CardHeader>
      <CardContent
        class="
          grid grid-cols-1 gap-3
          md:grid-cols-[1fr_180px_180px]
        "
      >
        <Input v-model="search" placeholder="Search email or name..." aria-label="Search users" />
        <select
          v-model="roleFilter"
          aria-label="Filter by role"
          class="
            h-9 rounded-md border border-input bg-transparent px-3 text-sm
            shadow-xs outline-none
          "
        >
          <option value="">
            All roles
          </option>
          <option value="student">
            Students
          </option>
          <option value="admin">
            Admins
          </option>
        </select>
        <select
          v-model="statusFilter"
          aria-label="Filter by status"
          class="
            h-9 rounded-md border border-input bg-transparent px-3 text-sm
            shadow-xs outline-none
          "
        >
          <option value="">
            All statuses
          </option>
          <option value="active">
            Active
          </option>
          <option value="disabled">
            Disabled
          </option>
        </select>
      </CardContent>
    </Card>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Failed to load users</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-else-if="loading" class="flex items-center justify-center py-12">
      <Loader class="h-6 w-6 animate-spin" />
    </div>

    <Card v-else-if="!users.length">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        No users found.
      </CardContent>
    </Card>

    <div v-else class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">
                User
              </th>
              <th class="px-4 py-3 font-medium">
                Role
              </th>
              <th class="px-4 py-3 font-medium">
                Status
              </th>
              <th class="px-4 py-3 text-right font-medium">
                Links
              </th>
              <th class="px-4 py-3 text-right font-medium">
                Sessions
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
            <tr v-for="item in users" :key="item.id" class="border-t">
              <td class="px-4 py-3">
                <div class="font-medium">
                  {{ item.name || item.email }}
                </div>
                <div class="text-muted-foreground">
                  {{ item.email }}
                </div>
              </td>
              <td class="px-4 py-3">
                <Badge :variant="item.role === 'admin' ? 'default' : 'secondary'">
                  {{ item.role }}
                </Badge>
              </td>
              <td class="px-4 py-3">
                <Badge :variant="item.status === 'active' ? 'outline' : 'destructive'">
                  {{ item.status }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right">
                {{ item.link_count }}
              </td>
              <td class="px-4 py-3 text-right">
                {{ item.active_session_count }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ longDate(item.created_at, locale) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <Button
                    as-child
                    size="icon"
                    variant="outline"
                    :aria-label="`Manage links for ${item.email}`"
                  >
                    <NuxtLink :to="{ path: '/dashboard/links', query: { creator: item.email, status: 'all' } }">
                      <LinkIcon class="h-4 w-4" />
                    </NuxtLink>
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    :disabled="!!savingId || isProtectedUser(item)"
                    :aria-label="item.role === 'admin' ? 'Set as student' : 'Set as admin'"
                    @click="updateUser(item, { role: item.role === 'admin' ? 'student' : 'admin' })"
                  >
                    <Loader
                      v-if="savingId === `${item.id}:role`" class="
                        h-4 w-4 animate-spin
                      "
                    />
                    <Shield v-else class="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    :variant="item.status === 'active' ? 'destructive' : 'secondary'"
                    :disabled="!!savingId || isProtectedUser(item)"
                    :aria-label="item.status === 'active' ? 'Disable user' : 'Reactivate user'"
                    @click="updateUser(item, { status: item.status === 'active' ? 'disabled' : 'active' })"
                  >
                    <Loader
                      v-if="savingId === `${item.id}:status`" class="
                        h-4 w-4 animate-spin
                      "
                    />
                    <UserX v-else-if="item.status === 'active'" class="h-4 w-4" />
                    <UserCheck v-else class="h-4 w-4" />
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
