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
  if (!email.value) return
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    if (!auth.profile?.onboarded) {
      router.push('/onboarding')
    }
    else {
      router.push('/dashboard')
    }
  }
  catch {
    toast.add({ title: 'Something went wrong', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="font-family: 'Outfit', sans-serif;">
    <!-- Back button -->
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700 transition-colors">
      <UIcon name="i-lucide-arrow-left" class="text-base" />
      Back
    </NuxtLink>

    <!-- Logo + title -->
    <div class="flex items-center gap-2 mb-6">
      <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
        <UIcon name="i-lucide-trending-up" class="text-white text-base" />
      </div>
      <span class="text-xl font-black tracking-tight text-slate-800" style="font-family: 'Syne', sans-serif;">TrackAm</span>
    </div>

    <h2 class="text-2xl font-bold text-slate-900 mb-1" style="font-family: 'Syne', sans-serif;">
      {{ isSignIn ? 'Welcome back' : 'Create account' }}
    </h2>
    <p class="text-slate-500 text-sm mb-6">
      {{ isSignIn ? 'Sign in to continue tracking your business.' : 'Join thousands of traders managing their money with AI.' }}
    </p>

    <!-- Tab toggle -->
    <div class="flex bg-slate-100 rounded-xl p-1 mb-6">
      <button
        class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
        :class="isSignIn ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
        @click="tab = 'signin'"
      >
        Sign In
      </button>
      <button
        class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
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
          :ui="{ base: 'rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
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
          :ui="{ base: 'rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
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
          :ui="{ base: 'rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20' }"
        />
      </div>

      <button
        type="submit"
        :disabled="loading || !email"
        class="mt-2 w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin text-lg" />
        <span>{{ loading ? 'Signing in…' : (isSignIn ? 'Sign In' : 'Create Account') }}</span>
        <UIcon v-if="!loading" name="i-lucide-arrow-right" class="text-lg" />
      </button>
    </form>

    <!-- Privacy note -->
    <p class="text-center text-xs text-slate-400 mt-6 leading-relaxed">
      By continuing, you agree to our Terms of Service.<br>
      Your financial data is stored securely.
    </p>
  </div>
</template>
