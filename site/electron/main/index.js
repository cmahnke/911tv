import { app, shell, BrowserWindow, ipcMain, nativeImage } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../public/images/favicon-512.png?asset";

const appId = "org.projektemacher.911tv";
const appName = "911TV";
const appVersion = "2024.10";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    title: appName,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      enableRemoteModule: true,
      sandbox: false,
    },
  });

  if (process.platform == "darwin") {
    const image = nativeImage.createFromPath(icon);
    app.dock.setIcon(image);
    // See https://www.electronjs.org/docs/latest/api/app#appsetaboutpaneloptionsoptions
    app.setAboutPanelOptions({
      applicationName: appName,
      applicationVersion: appVersion,
      credits: "Videos and Metadata provided by the Internet Archive,",
      copyright: "Videos copyrighted by their respective owners",
      authors: ["Christian Mahnke"],
      website: "https://911tv.projektemacher.org/",
    });
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    //, {query: {"a": true}}
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { a: true },
    });
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(appId);

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
