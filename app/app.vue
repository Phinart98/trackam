<script setup lang="ts">
useHead({
  title: 'TrackAm — Track Your Money, Grow Your Business',
  meta: [
    { name: 'description', content: 'AI-powered financial tracking for Africa\'s informal economy' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }
  ],
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
