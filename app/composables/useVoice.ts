// MediaRecorder → POST /api/ai/transcribe → Groq Whisper. Audio needs a live backend.
export function useVoice() {
  const isRecording = ref(false)
  const isTranscribing = ref(false)

  const config = useRuntimeConfig()
  const supported = import.meta.client
    && typeof MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && !!(config.public.apiBaseUrl as string)

  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []

  async function start(): Promise<void> {
    chunks = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // opus/webm → ogg/opus → mp4 covers Chrome/Firefox/Safari; Groq accepts all three.
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      .find(m => MediaRecorder.isTypeSupported(m))

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    mediaRecorder.start()
    isRecording.value = true
  }

  async function stop(apiBaseUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }

      mediaRecorder.onstop = async () => {
        const rawMime = mediaRecorder!.mimeType || 'audio/webm'
        // iOS/some Android report video/* for audio-only recordings — coerce so the guardrail accepts it.
        const recordedMime = rawMime.startsWith('video/') ? rawMime.replace('video/', 'audio/') : rawMime
        const blob = new Blob(chunks, { type: recordedMime })
        mediaRecorder!.stream.getTracks().forEach(t => t.stop())
        mediaRecorder = null

        isRecording.value = false
        isTranscribing.value = true

        try {
          const transcript = await sendToApi(blob, recordedMime, apiBaseUrl)
          resolve(transcript)
        } catch (e) {
          reject(e)
        } finally {
          isTranscribing.value = false
        }
      }

      mediaRecorder.stop()
    })
  }

  async function sendToApi(blob: Blob, mimeType: string, apiBaseUrl: string): Promise<string> {
    const token = await getAuthToken()
    // Extension must match content so Groq detects the codec.
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'

    const form = new FormData()
    form.append('audio', blob, `recording.${ext}`)

    const res = await $fetch<{ transcript: string }>(`${apiBaseUrl}/api/ai/transcribe`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    return res.transcript
  }

  function abort(): void {
    if (mediaRecorder) {
      mediaRecorder.onstop = null // prevent queued onstop firing post-abort
      mediaRecorder.stream.getTracks().forEach(t => t.stop())
      mediaRecorder = null
    }
    isRecording.value = false
    isTranscribing.value = false
    chunks = []
  }

  return { supported, isRecording, isTranscribing, start, stop, abort }
}
