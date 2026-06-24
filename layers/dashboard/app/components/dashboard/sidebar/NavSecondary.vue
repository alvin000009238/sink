<script setup lang="ts">
import { ArrowUpCircle, Coffee, Languages, Laptop, Moon, Sun } from 'lucide-vue-next'
import { useSidebar } from '@/components/ui/sidebar'

const colorMode = useColorMode()
const { setLocale, locales } = useI18n()
const { state } = useSidebar()
const { hasUpdate, currentVersion, latestVersion } = useVersionCheck()

const isAnimating = ref(false)

function playAnimation() {
  if (isAnimating.value)
    return
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 1500)
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            class="flex w-full p-1.5 pr-0" :class="[
              state === 'collapsed'
                ? 'flex-col items-center gap-2'
                : 'items-center justify-between',
            ]"
          >
            <div class="flex items-center">
              <button
                class="
                  relative flex h-8 items-center justify-center rounded-md px-2
                  hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                  focus-visible:outline-none
                "
                @click="playAnimation"
              >
                <div
                  v-if="isAnimating" class="
                    pointer-events-none absolute -top-3.5 left-1/2 flex
                    -translate-x-1/2 justify-center gap-0.5
                  "
                >
                  <svg
                    class="
                      animate-coffee-steam h-3.5 w-1.5 text-zinc-500/70
                      dark:text-white/70
                    " viewBox="0 0 10 30" fill="none" xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 25C2 20 8 15 5 10C2 5 8 0 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  <svg
                    class="
                      animate-coffee-steam h-3.5 w-1.5 text-zinc-500/70
                      [animation-delay:0.15s]
                      dark:text-white/70
                    " viewBox="0 0 10 30" fill="none" xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 25C8 20 2 15 5 10C8 5 2 0 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  <svg
                    class="
                      animate-coffee-steam h-3.5 w-1.5 text-zinc-500/70
                      [animation-delay:0.3s]
                      dark:text-white/70
                    " viewBox="0 0 10 30" fill="none" xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 25C3 20 7 15 5 10C3 5 7 0 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <Coffee class="size-4" :class="{ 'animate-coffee-wiggle': isAnimating }" />
              </button>

              <TooltipProvider v-if="hasUpdate">
                <Tooltip :delay-duration="100">
                  <TooltipTrigger as-child>
                    <a
                      href="https://github.com/ccbikai/Sink/releases"
                      target="_blank"
                      class="
                        relative flex h-8 items-center justify-center rounded-md
                        px-2
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                      "
                    >
                      <ArrowUpCircle class="size-4" />
                      <span
                        class="
                          absolute top-1 right-1 size-2 animate-pulse
                          rounded-full bg-green-500
                        "
                      />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent :side="state === 'collapsed' ? 'right' : 'top'">
                    <p>{{ $t('sidebar.update', { current: currentVersion, version: latestVersion }) }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div
              class="flex gap-1" :class="[
                state === 'collapsed' ? 'flex-col items-center' : 'items-center',
              ]"
            >
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    class="
                      flex size-8 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                    "
                  >
                    <Languages class="size-4" />
                    <span class="sr-only">{{ $t('layouts.header.select_language') }}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                  class="min-w-min"
                >
                  <DropdownMenuItem
                    v-for="locale in locales"
                    :key="locale.code"
                    class="cursor-pointer"
                    @click="setLocale(locale.code)"
                  >
                    <span class="mr-1">{{ locale.emoji }}</span>
                    {{ locale.name }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    class="
                      flex size-8 items-center justify-center rounded-md
                      hover:bg-sidebar-accent
                      hover:text-sidebar-accent-foreground
                    "
                  >
                    <Sun
                      class="
                        size-4
                        dark:hidden
                      "
                    />
                    <Moon
                      class="
                        hidden size-4
                        dark:block
                      "
                    />
                    <span class="sr-only">{{ $t('theme.toggle') }}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  :align="state === 'collapsed' ? 'start' : 'end'"
                  :side="state === 'collapsed' ? 'right' : 'top'"
                  class="min-w-min"
                >
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'light'"
                  >
                    <Sun class="mr-1 h-4 w-4" />
                    {{ $t('theme.light') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'dark'"
                  >
                    <Moon class="mr-1 h-4 w-4" />
                    {{ $t('theme.dark') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    class="cursor-pointer"
                    @click="colorMode.preference = 'system'"
                  >
                    <Laptop class="mr-1 h-4 w-4" />
                    {{ $t('theme.system') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
