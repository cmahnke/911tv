import { useEffect, useRef } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { isMobileSafari } from "react-device-detect";
import CookieConsent, { Cookies, getCookieConsentValue } from "react-cookie-consent";
import VideoJS from "./components/VideoJS.jsx";
import TVStatic from "./components/TVStatic.jsx";
import Teletext, { subTitlesPageNr } from "./components/Teletext.jsx";
import Unmute from "./components/Unmute.tsx";
import { DateTime } from "luxon";
import { decompressFromBase64 } from "lz-string";
//import {decompress} from "brotli-unicode/js";
import Timer from "./classes/Timer.ts";
import Util from "./classes/Util.ts";
import Tuner from "./classes/Tuner.ts";
import "@fontsource/press-start-2p";
import "./App.scss";
import urlsImport from "./assets/json/urls-lz-string-compressed.json";
import pagesImport from "./assets/json/pages-lz-string-compressed.json";
//import urlsImport from "./assets/json/urls.json";
//import pagesImport from "./assets/json/pages.json";

const consentCookieName = "iaConsent";

function parseJson(json) {
  if (typeof json == "object" && Object.keys(json).length == 2) {
    if ("type" in json && json.type === "lz-string") {
      return JSON.parse(decompressFromBase64(json["content"]));
    } else if ("type" in json && json.type === "brotli") {
      console.log("'brotli' isn't supported yet!");
      return import("brotli-unicode/js").then((Brotli) => {
        const decompressed = Brotli.decompress(json["content"]);
        return JSON.parse(TextDecoder.decode(decompressed));
      });
    }
  }
  return json;
}

function App() {
  //State without React state
  var powerOn = true;
  var muted = false;
  var teletextOn = true;

  const playerRef = useRef(null);
  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const metaRef = useRef(null);
  const teletextRef = useRef(null);
  const infoRef = useRef(null);
  const infoContainerRef = useRef(null);
  const audioToggleRef = useRef(null);
  const teletextToggleRef = useRef(null);
  const fullscreenToggleRef = useRef(null);

  // App internal
  let urls = parseJson(urlsImport);
  const tuner = new Tuner(urls.channels);
  let playlistPlugin;
  let debug = false;
  let reset = false;

  // Electron
  if (Util.isElectron()) {
    if (projektemacher.settings.cookies !== undefined) {
      for (const [c, v] of Object.entries(projektemacher.settings.cookie)) {
        Cookies.set(c, v, {
          expires: 999,
          domain: projektemacher.settings.cookieDomain
        });
      }
    }
  }

  // Audio context
  let audioContext;
  try {
    audioContext = new AudioContext();
  } catch (e) {
    console.log("AudioContext failed", e);
  }

  const updateAdress = (urlParams) => {
    let params = urlParams.toString();
    if (params != "") {
      params = "?" + params;
    }
    return window.location.origin + window.location.pathname + params;
  };

  // URL params are 'c' (channel), 'r' (reset), 'a' (accept), 'd' (debug) and 't' (time)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("d") !== null && urlParams.get("d") !== undefined) {
    debug = true;
    urlParams.delete("d");
  }
  if (urlParams.get("c") !== null && urlParams.get("c") !== undefined) {
    tuner.station = urlParams.get("c");
    urlParams.delete("c");
  }
  if (urlParams.get("r") !== null && urlParams.get("r") !== undefined) {
    reset = true;
    urlParams.delete("r");
  }
  if (urlParams.get("t") !== null && urlParams.get("t") !== undefined) {
    reset = urlParams.get("t");
    urlParams.delete("t");
  }
  // Accept cookie notice - used for debugging
  if (urlParams.get("a") !== null && urlParams.get("a") !== undefined) {
    urlParams.delete("a");
    Cookies.set(consentCookieName, true, { expires: 999 });
    console.log(`Set ${consentCookieName} to ${Cookies.get(consentCookieName)}`);
  }

  if (window.location.href != updateAdress(urlParams)) {
    history.replaceState({}, "", updateAdress(urlParams));
  }

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */
  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timer = new Timer(startDate, endDate, urls.metadata.timezone, reset);

  let pages = parseJson(pagesImport);
  if (subTitlesPageNr in pages) {
    console.log(`Can't initialize subtitles page, number ${subTitlesPageNr} has content page`);
  } else {
    pages.push({ number: subTitlesPageNr, markdown: urls.events });
  }
  // remove from memory
  urls = null;

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
      This website uses external video services from the <a href="https://archive.org/">Internet Archive</a> which might set cookies.
    </CookieConsent>
  );

  const router = createHashRouter([
    {
      path: "/:page?",
      element: <Teletext ref={teletextRef} pages={pages} timer={timer} channel={tuner.station} />
    }
  ]);

  function autoPlay() {
    if (playlistPlugin !== undefined) {
      playlistPlugin.dispose();
    }
    playlistPlugin = playerRef.current.channelPlaylistPlugin({
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

  function zapChannel(e, direction) {
    if (!powerOn) {
      return;
    }
    var logPrefix = `Switched from ${tuner.station} to `;
    tuner.zap(direction);
    teletextRef.current.setChannel(tuner.station);
    console.log(`${logPrefix}${tuner.station}`);
    noise("immediately");
    autoPlay();
  }

  function setTitle(e, title) {
    if (e !== undefined && e.target !== undefined) {
      e.target.title = title;
    }
  }

  function noise(state) {
    if (typeof state === "boolean" && state == false) {
      if (powerOn) {
        noiseRef.current.hide();
      }
    } else {
      if (typeof state === "boolean") {
        throw new Error("noise() needs to be either called with false to disable or the modfe as string");
      }
      noiseRef.current.show(state);
    }
  }

  function firstClickCallback() {
    enableAudio();
  }

  function toggleAudio(e) {
    if (!powerOn) {
      return;
    }
    console.log("Toggleing audio");
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
    audioContext.resume();
    playerRef.current.volume(1);
    noiseRef.current.unmute();
    audioToggleRef.current.classList.remove("disabled");
    audioToggleRef.current.classList.add("enabled");
  }

  function disableAudio() {
    muted = true;
    audioContext.suspend();
    playerRef.current.volume(0);
    noiseRef.current.mute();
    audioToggleRef.current.classList.remove("enabled");
    audioToggleRef.current.classList.add("disabled");
    console.log("Audio is suspended");
  }

  function audioStatus() {
    if (audioContext.state === "suspended" || muted) {
      return false;
    }
    return true;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || tvFrameRef.current.getAttribute("class") == "fullscreen") {
      document.exitFullscreen();
      console.log("Exiting Fullscreen");
    } else {
      console.log("Entering Fullscreen");
      rootRef.current.requestFullscreen();
    }
  }

  function showInfoContainer() {
    infoContainerRef.current.classList.remove("hide");
    infoContainerRef.current.classList.add("show");
  }

  function hideInfoContainer() {
    infoContainerRef.current.classList.add("hide");
    infoContainerRef.current.classList.remove("show");
  }

  function toggleInfo() {
    infoRef.current.classList.toggle("hide");
    infoRef.current.classList.toggle("show");
  }

  function on() {
    powerOn = true;
    autoPlay();
    //teletextRef.current.show();
    noiseRef.current.hide("immediately");
    showInfoContainer();
    enableAudio();
  }

  function off() {
    teletextRef.current.hide();
    noiseRef.current.changeMode("static");
    noiseRef.current.show("immediately");
    hideInfoContainer();
    disableAudio();
    tuner.off();
    if (playlistPlugin !== undefined) {
      playlistPlugin.dispose();
    }
    powerOn = false;
  }

  function setMeta(url) {
    if (metaRef.current !== null) {
      metaRef.current.classList.remove("disabled");
      metaRef.current.href = url;
    }
  }

  function setTeletextStation(station) {
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

  function toggleTeletext(e) {
    if (!powerOn) {
      return;
    }
    if (teletextOn) {
      teletextRef.current.hide();
      teletextOn = false;
      setTitle(e, "Teletext disabled");
    } else {
      teletextRef.current.show();
      teletextOn = true;
      setTitle(e, "Teletext enabled");
    }
  }

  useEffect(() => {
    if (tuner.channel.checkStreamEnd(timer.appTime)) {
      hideInfoContainer();
      console.log("Event time passed, displaying test card.");
      noiseRef.current.changeMode("closedown");
    }
  });

  useEffect(() => {
    if (debug) {
      setInterval(() => {
        if (window.app.timer == true) {
          console.log(timer, timer.formatTimecode(), timer.formatURLTimecode());
        }
      }, 1000);
    }
  }, []);

  /*
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (audioContext.state != "suspended") {
        audioToggleRef.current.classList.remove("disabled");
        audioToggleRef.current.classList.add("enabled");
      } else {
        console.log(audioContext.state, audioStatus())
      }
    }, 250)
    return () => clearInterval(intervalId)
    //audioContext.onstatechange = () => {
    //  console.log(audioContext.state);
    //};
  }, []);
  */

  useEffect(() => {
    if (getCookieConsentValue(consentCookieName)) {
      autoPlay();
    }
  }, []);

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: false,
    controls: true,
    //fill: true,
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
      {(() => {
        if (!Util.isElectron()) {
          return <Unmute clickCallback={firstClickCallback} />;
        }
      })()}
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
                <a target="_blank" rel="noreferrer" href="" ref={metaRef} className="disabled">
                  Stream Metadata
                </a>
              </div>
            </div>
          </div>
          <TVStatic ref={noiseRef} id="tv-static" className="show" timer={timer} />
          <VideoJS ref={playerRef} id="video-js-player" options={videoJsOptions} />
        </div>
        <div id="tv-footer">
          <div className="tv-footer-spacer"></div>
          <div id="tv-brand">
            <a target="_blank" rel="noreferrer" className="tv-brand-link" title="Projektemacher product" href="https://projektemacher.org/">
              %nbsp;
            </a>
          </div>
          <div id="tv-controls">
            <button
              aria-label="Mute"
              title={audioStatus() ? "Audio enabled" : "Audio disabled"}
              ref={audioToggleRef}
              type="button"
              className={"button toggle-audio " + (audioStatus() ? "enabled" : "disabled")}
              onClick={(e) => {
                toggleAudio(e);
              }}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Teletext"
              title={teletextOn ? "Teletext enabled" : "Teletext disabled"}
              ref={teletextToggleRef}
              type="button"
              className="button toggle-teletext"
              onClick={(e) => {
                toggleTeletext(e);
              }}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Previous channel"
              title="Previous channel"
              type="button"
              className="button zap-channel-down"
              onClick={(e) => {
                zapChannel(e, false);
              }}
            >
              <i className="icon"></i>
            </button>
            <button
              aria-label="Next channel"
              title="Next channel"
              type="button"
              className="button zap-channel-up"
              onClick={(e) => {
                zapChannel(e, true);
              }}
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
                if (powerOn) {
                  e.target.title = "Power off";
                } else {
                  e.target.title = "Power on";
                }
                togglePower();
              }}
            >
              <i className="icon"></i>
            </button>
          </div>
        </div>
      </div>
      {(() => {
        if (!Util.isElectron()) {
          return cookieConsent;
        }
      })()}
    </div>
  );
}

export default App;
