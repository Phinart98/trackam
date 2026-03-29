<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const tab = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)

const isSignIn = computed(() => tab.value === 'signin')

async function submit() {
  if (!email.value || !password.value) return
  loading.value = true
  try {
    if (isSignIn.value) {
      await auth.login(email.value, password.value)
    } else {
      await auth.signUp(email.value, password.value, name.value || undefined)
    }
    if (!auth.profile?.onboarded) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    toast.add({ title: message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const testimonials = [
  { name: 'Ama Asante', role: 'Fabric trader, Kantamanto', quote: 'I finally know where my money goes. My savings doubled in 2 months.' },
  { name: 'Kofi Mensah', role: 'Food vendor, Accra', quote: 'The AI advisor told me my lunch break cost more than I made on Mondays!' },
  { name: 'Abena Owusu', role: 'Freelance tailor, Kumasi', quote: 'Tracking MoMo payments used to be a headache. Not anymore.' },
]
const currentTestimonial = ref(0)
let intervalId: ReturnType<typeof setInterval>
onMounted(() => {
  intervalId = setInterval(() => { currentTestimonial.value = (currentTestimonial.value + 1) % testimonials.length }, 4000)
})
onUnmounted(() => clearInterval(intervalId))
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left: decorative panel (desktop only) -->
    <div class="hidden lg:flex w-[480px] xl:w-[560px] bg-gradient-to-br from-slate-900 to-emerald-950 flex-col justify-between p-12 relative overflow-hidden shrink-0">
      <!-- Kente pattern -->
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%); background-size: 24px 24px;" />
      <div class="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />

      <!-- Logo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <UIcon name="i-lucide-trending-up" class="text-white text-lg" />
        </div>
        <span class="text-2xl font-black text-white font-display">TrackAm</span>
      </div>

      <!-- Stats -->
      <div class="relative z-10 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white/10 border border-white/10 rounded-2xl p-4">
            <p class="text-emerald-400 text-2xl font-bold">85.8%</p>
            <p class="text-white/60 text-xs mt-1">of African workers are in the informal economy</p>
          </div>
          <div class="bg-white/10 border border-white/10 rounded-2xl p-4">
            <p class="text-amber-400 text-2xl font-bold">$1.1T</p>
            <p class="text-white/60 text-xs mt-1">mobile money transactions in Africa, 2024</p>
          </div>
        </div>

        <!-- Testimonial carousel -->
        <div class="bg-white/10 border border-white/10 rounded-2xl p-5">
          <UIcon name="i-lucide-quote" class="text-emerald-400 text-2xl mb-3" />
          <p class="text-white/90 text-sm leading-relaxed mb-4">
            "{{ testimonials[currentTestimonial]!.quote }}"
          </p>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
              <span class="text-white text-xs font-bold">{{ testimonials[currentTestimonial]!.name.charAt(0) }}</span>
            </div>
            <div>
              <p class="text-white text-xs font-semibold">{{ testimonials[currentTestimonial]!.name }}</p>
              <p class="text-white/50 text-[11px]">{{ testimonials[currentTestimonial]!.role }}</p>
            </div>
            <!-- Dots -->
            <div class="ml-auto flex gap-1">
              <div
                v-for="(_, i) in testimonials"
                :key="i"
                class="w-1.5 h-1.5 rounded-full transition-colors"
                :class="i === currentTestimonial ? 'bg-emerald-400' : 'bg-white/20'"
              />
            </div>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-white/30 text-xs">TrackAm · BeOrchid Africa Developers Hackathon 2026</p>
    </div>

    <!-- Right: form -->
    <div class="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16">
      <div class="max-w-md w-full mx-auto">
        <!-- Back (mobile only) -->
        <NuxtLink to="/" class="lg:hidden inline-flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700 transition-colors">
          <UIcon name="i-lucide-arrow-left" class="text-base" />
          Back
        </NuxtLink>

        <!-- Logo (mobile only) -->
        <div class="lg:hidden flex items-center gap-2 mb-6">
          <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
            <UIcon name="i-lucide-trending-up" class="text-white text-base" />
          </div>
          <span class="text-xl font-black tracking-tight text-slate-800 font-display">TrackAm</span>
        </div>

        <h2 class="text-3xl font-bold text-slate-900 mb-1.5 font-display">
          {{ isSignIn ? 'Welcome back' : 'Create account' }}
        </h2>
        <p class="text-slate-500 text-sm mb-7">
          {{ isSignIn ? 'Sign in to continue tracking your business.' : 'Join thousands of traders managing their money with AI.' }}
        </p>

        <!-- Tab toggle -->
        <div class="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            class="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
            :class="isSignIn ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
            @click="tab = 'signin'"
          >
            Sign In
          </button>
          <button
            class="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
            :class="!isSignIn ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
            @click="tab = 'signup'"
          >
            Sign Up
          </button>
        </div>

        <!-- Form -->
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div v-if="!isSignIn">
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Full Name</label>
            <UInput
              v-model="name"
              placeholder="Kofi Mensah"
              size="lg"
              class="w-full"
              :ui="{ base: 'w-full rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
            <UInput
              v-model="email"
              type="email"
              placeholder="kofi@example.com"
              size="lg"
              leading-icon="i-lucide-mail"
              class="w-full"
              :ui="{ base: 'w-full rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              size="lg"
              leading-icon="i-lucide-lock"
              class="w-full"
              :ui="{ base: 'w-full rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || !email || !password"
            class="mt-2 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin text-lg" />
            <span>{{ loading ? (isSignIn ? 'Signing in…' : 'Creating account…') : (isSignIn ? 'Sign In' : 'Create Account') }}</span>
            <UIcon v-if="!loading" name="i-lucide-arrow-right" class="text-lg" />
          </button>
        </form>

        <p class="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          By continuing, you agree to our Terms of Service.<br>
          Your financial data is stored securely.
        </p>
      </div>
    </div>
  </div>
</template>
