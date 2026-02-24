<script setup lang="ts">
definePageMeta({ layout: 'auth' })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&display=swap' },
  ],
})

const features = [
  { icon: 'i-lucide-message-square-text', title: 'Speak naturally', desc: 'Type "bought 3 bags rice 150 cedis" — AI handles the rest.', color: 'bg-emerald-50 border-emerald-100', iconColor: 'text-emerald-600' },
  { icon: 'i-lucide-scan-line', title: 'Snap receipts & MoMo', desc: 'Photograph any receipt or MoMo screenshot. Vision AI reads it instantly.', color: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-600' },
  { icon: 'i-lucide-brain', title: 'Your AI advisor', desc: 'Gets financial advice grounded in your actual transactions, not generic tips.', color: 'bg-violet-50 border-violet-100', iconColor: 'text-violet-600' },
]

const avatarColors = ['from-emerald-400 to-emerald-600', 'from-amber-400 to-amber-600', 'from-violet-400 to-violet-600', 'from-pink-400 to-pink-600']
const avatarLetters = ['K', 'A', 'O', 'M']
</script>

<template>
  <div class="relative min-h-screen overflow-hidden" style="background: #FAFAF7; font-family: 'Outfit', sans-serif;">
    <!-- Kente-inspired geometric background -->
    <svg class="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="kente" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="20" height="20" fill="#059669" />
          <rect x="20" y="20" width="20" height="20" fill="#D97706" />
          <rect x="10" y="0" width="10" height="10" fill="#1E293B" />
          <rect x="30" y="20" width="10" height="10" fill="#1E293B" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kente)" />
    </svg>

    <!-- Gradient blobs -->
    <div class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
    <div class="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

    <div class="relative z-10 flex flex-col min-h-screen max-w-md mx-auto px-5 py-8">
      <!-- Logo -->
      <div class="flex items-center gap-2 mb-10">
        <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
          <UIcon name="i-lucide-trending-up" class="text-white text-base" />
        </div>
        <span class="text-xl font-black tracking-tight text-slate-800" style="font-family: 'Syne', sans-serif;">TrackAm</span>
      </div>

      <!-- Hero headline -->
      <div class="mb-8">
        <h1 class="text-[2.8rem] font-extrabold leading-[1.05] text-slate-900 mb-4" style="font-family: 'Syne', sans-serif;">
          Track your<br>
          <span class="text-emerald-500">money.</span><br>
          Grow your<br>
          <span class="text-amber-500">business.</span>
        </h1>
        <p class="text-slate-500 text-[15px] leading-relaxed">
          AI-powered financial tracking built for Africa's informal economy. No accounting knowledge needed.
        </p>
      </div>

      <!-- Feature cards -->
      <div class="flex flex-col gap-2.5 mb-8">
        <div
          v-for="f in features"
          :key="f.title"
          class="flex items-start gap-3 p-3.5 rounded-xl border"
          :class="f.color"
        >
          <UIcon :name="f.icon" class="text-xl mt-0.5 shrink-0" :class="f.iconColor" />
          <div>
            <p class="text-sm font-semibold text-slate-800">{{ f.title }}</p>
            <p class="text-xs text-slate-500 leading-relaxed mt-0.5">{{ f.desc }}</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-auto">
        <NuxtLink to="/login">
          <button class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] tracking-wide shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Get Started
            <UIcon name="i-lucide-arrow-right" class="text-lg" />
          </button>
        </NuxtLink>

        <p class="text-center text-sm text-slate-400 mt-3.5">
          Already have an account?
          <NuxtLink to="/login" class="text-emerald-600 font-semibold hover:underline">Sign in</NuxtLink>
        </p>

        <!-- Social proof -->
        <div class="flex items-center justify-center gap-3 mt-5 pt-5 border-t border-slate-200/80">
          <div class="flex -space-x-2">
            <div
              v-for="(letter, i) in avatarLetters"
              :key="letter"
              class="w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
              :class="avatarColors[i]"
            >
              {{ letter }}
            </div>
          </div>
          <p class="text-xs text-slate-500">Trusted by traders across Ghana</p>
        </div>
      </div>
    </div>
  </div>
</template>
