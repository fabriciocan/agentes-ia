<template>
  <div
    class="absolute inset-0 overflow-hidden pointer-events-none"
    aria-hidden="true"
  >
    <div
      v-for="i in 60"
      :key="i"
      class="absolute rounded-full bg-white dark:bg-white opacity-70"
      :style="{
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${Math.random() * 3 + 2}s`
      }"
      :class="i % 3 === 0 ? 'animate-pulse' : i % 3 === 1 ? 'animate-ping' : ''"
    />
  </div>
</template>
