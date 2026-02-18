<template>
  <div class="flex gap-3 justify-start">
    <div class="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
      <div class="flex gap-1.5 items-center">
        <span
          v-for="i in 3"
          :key="i"
          class="w-2 h-2 bg-current opacity-40 rounded-full animate-bounce"
          :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
        />
      </div>
    </div>
  </div>
</template>
