/**
 * Voice recording composable — MediaRecorder → Groq Whisper via backend.
 *
 * Works on all modern browsers including Safari 14.1+ (unlike Web Speech API
 * which is Chrome/Edge only). Audio is recorded locally then sent to
 * POST /api/ai/transcribe where Spring AI calls Groq whisper-large-v3-turbo.
 *
 * Usage:
 *   const { supported, isRecording, isTranscribing, start, stop, abort } = useVoice()
 *   await start()           → begins capture, flips isRecording
 *   await stop(apiBaseUrl)  → stops, transcribes, returns transcript string
 *   abort()                 → cancel mid-recording, no API call
 */

export function useVoice() {
  const isRecording = ref(false)
  const isTranscribing = ref(false)

  // No mock fallback — audio requires a live backend to run Groq Whisper
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

    // Prefer opus/webm (Chrome, Firefox) → ogg/opus (Firefox fallback) → mp4 (Safari)
    // All three are accepted by Groq's Whisper endpoint
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
        const recordedMime = mediaRecorder!.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type: recordedMime })
        // Release the browser's mic indicator immediately
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
    // File extension must match content so Groq detects the codec correctly
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
      mediaRecorder.onstop = null // prevent queued onstop from firing after abort
      mediaRecorder.stream.getTracks().forEach(t => t.stop())
      mediaRecorder = null
    }
    isRecording.value = false
    isTranscribing.value = false
    chunks = []
  }

  return { supported, isRecording, isTranscribing, start, stop, abort }
}
