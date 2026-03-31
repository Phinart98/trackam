const _state = reactive({
  show: false,
  title: '',
  message: '',
  confirmLabel: 'Delete',
  resolve: null as ((value: boolean) => void) | null
})

export function useConfirm() {
  function confirm(title: string, opts?: { message?: string, confirmLabel?: string }): Promise<boolean> {
    // Cancel any pending dialog rather than leaking the old promise
    if (_state.resolve) _state.resolve(false)
    _state.title = title
    _state.message = opts?.message ?? ''
    _state.confirmLabel = opts?.confirmLabel ?? 'Delete'
    _state.show = true
    return new Promise((resolve) => {
      _state.resolve = resolve
    })
  }

  function accept() {
    const resolve = _state.resolve
    _state.show = false
    _state.resolve = null
    resolve?.(true)
  }

  function cancel() {
    const resolve = _state.resolve
    _state.show = false
    _state.resolve = null
    resolve?.(false)
  }

  return { state: _state, confirm, accept, cancel }
}
