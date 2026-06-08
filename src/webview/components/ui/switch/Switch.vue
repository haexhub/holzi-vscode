<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
  checked?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()
</script>

<template>
  <SwitchRoot
    v-bind="props"
    :class="cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
      'transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--vscode-button-background)]',
      'data-[state=unchecked]:bg-[var(--vscode-panel-border)]',
      props.class
    )"
    @update:checked="emit('update:checked', $event)"
  >
    <SwitchThumb
      :class="cn(
        'pointer-events-none block h-4 w-4 rounded-full',
        'bg-[var(--vscode-button-foreground)]',
        'shadow-lg ring-0 transition-transform',
        'data-[state=checked]:translate-x-4',
        'data-[state=unchecked]:translate-x-0'
      )"
    />
  </SwitchRoot>
</template>
