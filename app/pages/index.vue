<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const features = [
  { icon: 'i-lucide-message-square-text', title: 'Speak naturally', desc: 'Type "bought 3 bags rice 150 cedis" — AI handles the rest.', color: 'bg-emerald-50 border-emerald-100', iconColor: 'text-emerald-600' },
  { icon: 'i-lucide-scan-line', title: 'Snap receipts & MoMo', desc: 'Photograph any receipt or MoMo screenshot. Vision AI reads it instantly.', color: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-600' },
  { icon: 'i-lucide-brain', title: 'Your AI advisor', desc: 'Get financial advice grounded in your actual transactions — not generic tips.', color: 'bg-violet-50 border-violet-100', iconColor: 'text-violet-600' },
]

const avatarColors = ['from-emerald-400 to-emerald-600', 'from-amber-400 to-amber-600', 'from-violet-400 to-violet-600', 'from-pink-400 to-pink-600']
const avatarLetters = ['K', 'A', 'O', 'M']
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left: content -->
    <div class="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 lg:max-w-xl xl:max-w-2xl relative overflow-hidden">
      <!-- Kente background -->
      <svg class="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
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
      <div class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      <div class="relative z-10 max-w-sm">
        <!-- Logo -->
        <div class="flex items-center gap-2.5 mb-10">
          <div class="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
            <UIcon name="i-lucide-trending-up" class="text-white" />
          </div>
          <span class="text-2xl font-black tracking-tight text-slate-900 font-display">TrackAm</span>
        </div>

        <!-- Headline -->
        <h1 class="text-5xl lg:text-6xl font-extrabold leading-[1.05] text-slate-900 mb-5 font-display">
          Track your<br>
          <span class="text-emerald-500">money.</span><br>
          Grow your<br>
          <span class="text-amber-500">business.</span>
        </h1>
        <p class="text-slate-500 text-base leading-relaxed mb-8">
          AI-powered financial tracking built for Africa's informal economy. No accounting knowledge needed.
        </p>

        <!-- Feature cards -->
        <div class="flex flex-col gap-2.5 mb-10">
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
        <NuxtLink to="/login">
          <button class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4">
            Get Started
            <UIcon name="i-lucide-arrow-right" class="text-lg" />
          </button>
        </NuxtLink>

        <p class="text-center text-sm text-slate-400 mb-6">
          Already have an account?
          <NuxtLink to="/login" class="text-emerald-600 font-semibold hover:underline">Sign in</NuxtLink>
        </p>

        <!-- Social proof -->
        <div class="flex items-center gap-3">
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
          <p class="text-xs text-slate-500">Trusted by traders across Africa</p>
        </div>
      </div>
    </div>

    <!-- Right: illustration panel (desktop only) -->
    <div class="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-600 to-emerald-900 items-center justify-center relative overflow-hidden">
      <!-- Pattern overlay -->
      <div class="absolute inset-0 opacity-[0.07]" style="background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%); background-size: 24px 24px;" />

      <!-- Phone mockup -->
      <div class="relative z-10 w-72">
        <!-- Phone frame -->
        <div class="bg-white/10 backdrop-blur-sm rounded-[36px] p-3 shadow-2xl border border-white/20">
          <div class="bg-slate-900 rounded-[28px] overflow-hidden">
            <!-- Status bar -->
            <div class="bg-slate-900 px-5 pt-3 pb-2 flex items-center justify-between">
              <span class="text-white/60 text-[10px] font-medium">9:41</span>
              <div class="w-16 h-4 bg-slate-800 rounded-full" />
              <div class="flex gap-1">
                <div class="w-3 h-3 rounded-sm bg-white/40" />
              </div>
            </div>

            <!-- Mock dashboard content -->
            <div class="px-4 pb-5 pt-2 space-y-3">
              <!-- Balance card mock -->
              <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4">
                <p class="text-white/70 text-[10px] font-medium mb-1">Total Balance</p>
                <p class="text-white text-2xl font-bold">GH₵ 1,840</p>
                <div class="flex gap-3 mt-3">
                  <div>
                    <p class="text-white/60 text-[9px]">Income</p>
                    <p class="text-emerald-200 text-xs font-bold">+4,320</p>
                  </div>
                  <div>
                    <p class="text-white/60 text-[9px]">Expenses</p>
                    <p class="text-red-300 text-xs font-bold">-2,480</p>
                  </div>
                </div>
              </div>

              <!-- Forecast mock -->
              <div class="bg-white/10 rounded-xl p-3">
                <p class="text-white/70 text-[9px] font-semibold uppercase tracking-wide mb-2">Month Forecast</p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-emerald-500/30 rounded-lg p-2">
                    <p class="text-white/60 text-[9px]">Est. Balance</p>
                    <p class="text-white text-xs font-bold">GH₵ 920</p>
                  </div>
                  <div class="bg-amber-500/30 rounded-lg p-2">
                    <p class="text-white/60 text-[9px]">Daily spend</p>
                    <p class="text-white text-xs font-bold">GH₵ 84</p>
                  </div>
                </div>
                <!-- Progress bar -->
                <div class="mt-2 h-1.5 bg-white/20 rounded-full">
                  <div class="h-full w-2/3 bg-emerald-400 rounded-full" />
                </div>
                <p class="text-white/50 text-[9px] mt-1">67% of budget used</p>
              </div>

              <!-- Mini chart bars mock -->
              <div class="bg-white/10 rounded-xl p-3">
                <p class="text-white/70 text-[9px] font-semibold uppercase tracking-wide mb-2">Weekly Activity</p>
                <div class="flex items-end gap-1.5 h-12">
                  <div v-for="(h, i) in [60, 40, 75, 55, 90, 70, 45]" :key="i" class="flex-1 flex flex-col items-center gap-0.5">
                    <div class="w-full rounded-sm bg-emerald-400/40" :style="{ height: `${h}%` }" />
                  </div>
                </div>
              </div>

              <!-- Recent tx mock -->
              <div class="space-y-2">
                <div v-for="(tx, i) in [{ icon: 'i-lucide-shopping-basket', label: 'Kantamanto Market', amt: '-85', color: 'bg-pink-500/30 text-pink-300' }, { icon: 'i-lucide-trending-up', label: 'Kente fabric sale', amt: '+320', color: 'bg-emerald-500/30 text-emerald-300' }]" :key="i"
                  class="flex items-center gap-2 bg-white/10 rounded-xl p-2.5">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center" :class="tx.color.split(' ')[0]">
                    <UIcon :name="tx.icon" class="text-sm" :class="tx.color.split(' ')[1]" />
                  </div>
                  <p class="text-white/80 text-[10px] flex-1 truncate">{{ tx.label }}</p>
                  <p class="text-[10px] font-bold" :class="tx.amt.startsWith('+') ? 'text-emerald-300' : 'text-red-300'">{{ tx.amt }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating labels -->
      <div class="absolute top-16 left-8 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
        <p class="text-white/80 text-xs font-medium">🌍 Built for Africa</p>
      </div>
      <div class="absolute bottom-20 right-8 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
        <p class="text-white/80 text-xs font-medium">✦ AI-Powered Insights</p>
      </div>
    </div>
  </div>
</template>
