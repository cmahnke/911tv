import { useEffect, useRef, useCallback } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { isMobileSafari } from "react-device-detect";
import CookieConsent, { Cookies, getCookieConsentValue } from "react-cookie-consent";
import VideoJS, { VideoJSHandle } from "./components/VideoJS.tsx";
import TVStatic, { TVStaticHandle } from "./components/TVStatic.tsx";
import Teletext, { subTitlesPageNr, TeletextHandle } from "./components/Teletext.jsx";
import Unmute from "./components/Unmute.tsx";
import { DateTime } from "luxon";
import { decompressFromBase64 } from "lz-string";
import Timer from "./classes/Timer.ts";
import Util from "./classes/Util.ts";
import Tuner from "./classes/Tuner.ts";
import "@fontsource/press-start-2p";
import "./App.scss";
import urlsImport from "./assets/json/urls-lz-string-compressed.json";
import pagesImport from "./assets/json/pages-lz-string-compressed.json";

const consentCookieName = "iaConsent";

type CompressedJson = {
  type: "lz-string" | "brotli";
  content: string;
};

function parseJson<T>(json: T | CompressedJson): T | Promise<T> {
  if (typeof json === "object" && json !== null && Object.keys(json).length === 2) {
    const compressed = json as CompressedJson;
    if ("type" in compressed && compressed.type === "lz-string") {
      return JSON.parse(decompressFromBase64(compressed.content)) as T;
    } else if ("type" in compressed && compressed.type === "brotli") {
      console.log("'brotli' isn't supported yet!");
      return import("brotli-unicode/js").then((Brotli) => {
        const decompressed = Brotli.decompress(compressed.content);
        return JSON.parse(new TextDecoder().decode(decompressed)) as T;
      });
    }
  }
  return json as T;
}

type UrlMetadata = {
  start: string;
  end: string;
  timezone: string;
};

type UrlsData = {
  channels: Record<string, object>;
  metadata: UrlMetadata;
  events: Record<string, string>;
};

type Page = {
  number: number;
  title: string;
  html?: string | string[];
  markdown?: Record<string, string>;
};

declare global {
  interface Window {
    app: {
      timer: boolean;
    };
    projektemacher: {
      settings: {
        cookies?: Record<string, string>;
        cookie: Record<string, string>;
        cookieDomain: string;
      };
    };
  }
}

// Parse data outside component to avoid re-parsing on render
const parsedUrls = parseJson<UrlsData>(urlsImport as UrlsData | CompressedJson);
if (parsedUrls instanceof Promise) {
  throw new Error("Async JSON parsing not supported at initialization");
}
const urls = parsedUrls;

const urlParams = new URLSearchParams(window.location.search);
let initialDebug = false;
let initialReset: boolean | string = false;

if (urlParams.get("d") !== null) {
  initialDebug = true;
  urlParams.delete("d");
}
if (urlParams.get("r") !== null) {
  initialReset = true;
  urlParams.delete("r");
}
if (urlParams.get("t") !== null) {
  initialReset = urlParams.get("t")!;
  urlParams.delete("t");
}
if (urlParams.get("a") !== null) {
  urlParams.delete("a");
  Cookies.set(consentCookieName, "true", { expires: 999 });
  console.log(`Set ${consentCookieName} to ${Cookies.get(consentCookieName)}`);
}

const updateAddress = (params: URLSearchParams): string => {
  let paramsStr = params.toString();
  if (paramsStr !== "") {
    paramsStr = "?" + paramsStr;
  }
  return window.location.origin + window.location.pathname + paramsStr;
};

if (window.location.href !== updateAddress(urlParams)) {
  history.replaceState({}, "", updateAddress(urlParams));
}

if (Util.isElectron()) {
  if (window.projektemacher.settings.cookies !== undefined) {
    for (const [c, v] of Object.entries(window.projektemacher.settings.cookie)) {
      Cookies.set(c, v, {
        expires: 999,
        domain: window.projektemacher.settings.cookieDomain
      });
    }
  }
}

const initialStation = urlParams.get("c");
const startDate = DateTime.fromISO(urls.metadata.start);
const endDate = DateTime.fromISO(urls.metadata.end);
const timer = new Timer(startDate, endDate, urls.metadata.timezone, initialReset);
const tuner = new Tuner(urls.channels);
if (initialStation !== null) {
  tuner.station = initialStation;
}

const parsedPages = parseJson<Page[]>(pagesImport as Page[] | CompressedJson) as Page[];
const pages: Page[] = parsedPages;
if (pages.some((p) => p.number === subTitlesPageNr)) {
  console.log(`Can't initialize subtitles page, number ${subTitlesPageNr} has content page`);
} else {
  pages.push({ number: subTitlesPageNr, markdown: urls.events } as Page);
}

function App() {
  let powerOn = true;
  let muted = false;
  let teletextOn = true;

  const playerRef = useRef<VideoJSHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tvFrameRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<TVStaticHandle>(null);
  const metaRef = useRef<HTMLAnchorElement>(null);
  const teletextRef = useRef<TeletextHandle>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoContainerRef = useRef<HTMLDivElement>(null);
  const audioToggleRef = useRef<HTMLButtonElement>(null);
  const teletextToggleRef = useRef<HTMLButtonElement>(null);
  const fullscreenToggleRef = useRef<HTMLButtonElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playlistPluginRef = useRef<{ dispose: () => void } | undefined>(undefined);

  const cookieConsent = (
    <CookieConsent
      cookieName={consentCookieName}
      cookieValue={true}
      onAccept={autoPlay}
      expires={999}
      overlay="true"
      overlayClasses="consent-overlay"
      location="bottom"
    >
      This website uses external video services from the{" "}
      <a href="https://archive.org/">Internet Archive</a> which might set cookies.
    </CookieConsent>
  );

  const router = createHashRouter([
    {
      path: "/:page?",
      element: (
        <Teletext ref={teletextRef} pages={pages} timer={timer} channel={tuner.station} />
      )
    }
  ]);

  function getAudioContext(): AudioContext {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch (e) {
        console.log("AudioContext failed", e);
        audioContextRef.current = new AudioContext();
      }
    }
    return audioContextRef.current;
  }

  function autoPlay() {
    if (playlistPluginRef.current !== undefined) {
      playlistPluginRef.current.dispose();
    }
    playlistPluginRef.current = playerRef.current?.channelPlaylistPlugin({
      channel: tuner.channel,
      timer: timer,
      autostart: true,
      callbacks: {
        playing: () => {
          noise(false);
        },
        gap: () => {
          noise("gap");
        },
        ended: () => {
          noise("closedown");
        },
        fault: () => {
          noise("immediately");
        },
        meta: setMeta
      }
    });
    setTeletextStation(tuner.channel.name);
  }

  function zapChannel(e: React.MouseEvent, direction: boolean) {
    if (!powerOn) {
      return;
    }
    const logPrefix = `Switched from ${tuner.station} to `;
    tuner.zap(direction);
    teletextRef.current?.setChannel(tuner.station);
    console.log(`${logPrefix}${tuner.station}`);
    noise("immediately");
    autoPlay();
  }

  function setTitle(e: React.MouseEvent | undefined, title: string) {
    if (e !== undefined && e.target !== undefined) {
      (e.target as HTMLElement).title = title;
    }
  }

  function noise(state: boolean | string) {
    if (typeof state === "boolean" && state === false) {
      if (powerOn) {
        noiseRef.current?.hide();
      }
    } else {
      if (typeof state === "boolean") {
        throw new Error(
          "noise() needs to be either called with false to disable or the mode as string"
        );
      }
      noiseRef.current?.show(state);
    }
  }

  function firstClickCallback() {
    enableAudio();
  }

  function toggleAudio(e: React.MouseEvent) {
    if (!powerOn) {
      return;
    }
    console.log("Toggling audio");
    if (!audioStatus()) {
      enableAudio();
      setTitle(e, "Audio enabled");
    } else {
      disableAudio();
      setTitle(e, "Audio disabled");
    }
  }

  function enableAudio() {
    if (!powerOn) {
      return;
    }
    muted = false;
    getAudioContext().resume();
    playerRef.current?.volume(1);
    noiseRef.current?.unmute();
    audioToggleRef.current?.classList.remove("disabled");
    audioToggleRef.current?.classList.add("enabled");
  }

  function disableAudio() {
    muted = true;
    getAudioContext().suspend();
    playerRef.current?.volume(0);
    noiseRef.current?.mute();
    audioToggleRef.current?.classList.remove("enabled");
    audioToggleRef.current?.classList.add("disabled");
    console.log("Audio is suspended");
  }

  function audioStatus(): boolean {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === "suspended" || muted) {
      return false;
    }
    return true;
  }

  function toggleFullscreen() {
    if (
      document.fullscreenElement ||
      tvFrameRef.current?.getAttribute("class") === "fullscreen"
    ) {
      document.exitFullscreen();
      console.log("Exiting Fullscreen");
    } else {
      console.log("Entering Fullscreen");
      rootRef.current?.requestFullscreen();
    }
  }

  function showInfoContainer() {
    infoContainerRef.current?.classList.remove("hide");
    infoContainerRef.current?.classList.add("show");
  }

  function hideInfoContainer() {
    infoContainerRef.current?.classList.add("hide");
    infoContainerRef.current?.classList.remove("show");
  }

  function toggleInfo() {
    infoRef.current?.classList.toggle("hide");
    infoRef.current?.classList.toggle("show");
  }

  function on() {
    powerOn = true;
    autoPlay();
    noiseRef.current?.hide();
    showInfoContainer();
    enableAudio();
  }

  function off() {
    teletextRef.current?.hide();
    noiseRef.current?.changeMode("static");
    noiseRef.current?.show("immediately");
    hideInfoContainer();
    disableAudio();
    tuner.off();
    if (playlistPluginRef.current !== undefined) {
      playlistPluginRef.current.dispose();
    }
    powerOn = false;
  }

  function setMeta(url: string) {
    if (metaRef.current !== null) {
      metaRef.current.classList.remove("disabled");
      metaRef.current.href = url;
    }
  }

  function setTeletextStation(station: string) {
    if (teletextRef.current !== null) {
      teletextRef.current.setChannel(station);
    }
  }

  function togglePower() {
    if (powerOn) {
      off();
    } else {
      on();
    }
  }

  function toggleTeletext(e: React.MouseEvent) {
    if (!powerOn) {
      return;
    }
    if (teletextOn) {
      teletextRef.current?.hide();
      teletextOn = false;
      setTitle(e, "Teletext disabled");
    } else {
      teletextRef.current?.show();
      teletextOn = true;
      setTitle(e, "Teletext enabled");
    }
  }

  useEffect(() => {
    if (tuner.channel.checkStreamEnd(timer.appTime)) {
      hideInfoContainer();
      console.log("Event time passed, displaying test card.");
      noiseRef.current?.changeMode("closedown");
    }
  });

  useEffect(() => {
    if (!initialDebug) return;
    const intervalId = setInterval(() => {
      if (window.app.timer === true) {
        console.log(timer, timer.formatTimecode(), timer.formatURLTimecode());
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const stableAutoPlay = useCallback(autoPlay, []);

  useEffect(() => {
    if (getCookieConsentValue(consentCookieName)) {
      stableAutoPlay();
    }
  }, [stableAutoPlay]);

  const videoJsOptions = {
    autoplay: false,
    controls: true,
    fluid: true,
    muted: false,
    preload: "auto",
    nativeControlsForTouch: false,
    userActions: {
      click: false
    }
  };

  return (
    <div id="container" ref={rootRef}>
      {!Util.isElectron() && <Unmute clickCallback={firstClickCallback} />}
      <div id="tv-frame" ref={tvFrameRef} onDoubleClick={() => toggleFullscreen()}>
        <div id="tv-border"></div>
        <div id="tube">
          <RouterProvider router={router} />
          <div ref={infoContainerRef} className="show" id="info-container">
            <div ref={infoRef} id="info" className="hide">
              <button type="button" className="button toggle-info" onClick={toggleInfo}>
                <i className="info-icon"></i>
              </button>
              <div className="info-text">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href=""
                  ref={metaRef}
                  className="disabled"
                >
                  Stream Metadata
                </a>
              </div>
            </div>
          </div>
          <TVStatic ref={noiseRef} id="tv-static" className="show" timer={timer} />
          <VideoJS ref={playerRef} options={videoJsOptions} />
        </div>
        <div id="tv-footer">
          <div className="tv-footer-spacer"></div>
          <div id="tv-brand">
            <a
              target="_blank"
              rel="noreferrer"
              className="tv-brand-link"
              title="Projektemacher product"
              href="https://projektemacher.org/"
            >
              &nbsp;
            </a>
          </div>
          <div id="tv-controls">
            <button
              aria-label="Mute"
              title={audioStatus() ? "Audio enabled" : "Audio disabled"}
              ref={audioToggleRef}
              type="button"
              className={"button toggle-audio " + (audioStatus() ? "enabled" : "disabled")}
              onClick={(e) => toggleAudio(e)}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Teletext"
              title={teletextOn ? "Teletext enabled" : "Teletext disabled"}
              ref={teletextToggleRef}
              type="button"
              className="button toggle-teletext"
              onClick={(e) => toggleTeletext(e)}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Previous channel"
              title="Previous channel"
              type="button"
              className="button zap-channel-down"
              onClick={(e) => zapChannel(e, false)}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Next channel"
              title="Next channel"
              type="button"
              className="button zap-channel-up"
              onClick={(e) => zapChannel(e, true)}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Fullscreen"
              title="Fullscreen"
              ref={fullscreenToggleRef}
              type="button"
              className={"button toggle-fullscreen " + (isMobileSafari ? "hide" : "")}
              onClick={toggleFullscreen}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Power"
              title={powerOn ? "Power off" : "Power on"}
              type="button"
              className="button toggle-power"
              onClick={(e) => {
                (e.target as HTMLElement).title = powerOn ? "Power off" : "Power on";
                togglePower();
              }}
            >
              <i className="icon"></i>
            </button>
          </div>
        </div>
      </div>
      {!Util.isElectron() && cookieConsent}
    </div>
  );
}

export default App;