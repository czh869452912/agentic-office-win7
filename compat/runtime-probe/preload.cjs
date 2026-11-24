const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('runtimeProbe', {
  sandboxed: process.sandboxed,
  contextIsolated: process.contextIsolated,
  ping: () => ipcRenderer.invoke('runtime-probe:ping'),
})
