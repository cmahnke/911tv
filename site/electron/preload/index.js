import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import ElectronCookies from '@exponent/electron-cookies';

const appCookieDomain = "https://911tv.projektemacher.org/";

// See https://www.npmjs.com/package/@exponent/electron-cookies
ElectronCookies.enable({
  origin: appCookieDomain,
});

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
    contextBridge.exposeInMainWorld('projektemacher', {settings: {cookieDomain: new URL(appCookieDomain).hostname, cookie: {iaConsent: true}}});
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
