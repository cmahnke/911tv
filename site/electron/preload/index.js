import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const appCookieDomain = "https://911tv.projektemacher.org";

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('projektemacher', {settings: {cookieDomain: appCookieDomain, cookie: {iaConsent: true}}});
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
