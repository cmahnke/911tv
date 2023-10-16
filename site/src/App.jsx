import { useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { isMobileSafari } from 'react-device-detect';
import CookieConsent, { getCookieConsentValue } from "react-cookie-consent";
import VideoJS from './components/VideoJS.jsx';
import TVStatic from './components/TVStatic.jsx';
import Teletext, { subTitlesPageNr } from './components/Teletext.jsx';
import { DateTime } from "luxon";
import JSONCrush from 'jsoncrush';
import Timer from './classes/Timer.js';
import "@fontsource/press-start-2p";
import './App.scss'
import urls from './assets/json/urls.json';
import pages from './assets/json/pages.json';

function App() {
  const playerRef = useRef(null);
  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const teletextRef = useRef(null);
  const infoRef = useRef(null);

  const channels = Object.keys(urls.channels)
  var channel = channels[0]
  var reset = false;
  const consentCookieName = 'iaConsent';

  //JSONCrush.uncrush()

  // URL params are 'c' (channel), 'r' (reset) and 't' (time)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('c') !== null && urlParams.get('c') !== undefined) {
    channel = urlParams.get('c');
  }
  if (urlParams.get('r') !== null && urlParams.get('r') !== undefined) {
    reset = true;
  }
  if (urlParams.get('t') !== null && urlParams.get('t') !== undefined) {
    reset = urlParams.get('t');
  }

  /*
   * Dates and times of video URLs are in UTC,
   * Client Time is called local time, timezone doesn't matter
   * App time is the UTC time of the ongoing event, it needs to be convertet into EDT
   */

  const startDate = DateTime.fromISO(urls.metadata.start);
  const endDate = DateTime.fromISO(urls.metadata.end);
  const timer = new Timer(startDate, endDate, urls.metadata.timezone, reset);
  if (subTitlesPageNr in pages) {
    console.log(`Can't initialize subtitles page, number ${subTitlesPageNr} has content page`);
  } else {
    pages.push({number: subTitlesPageNr, markdown: urls.events});
  }

  const videoEventHandler = [
    { name: 'play', handler: () => { console.log('Got play event') } },
    { name: 'playing', handler: () => { noiseRef.current.hide() } },
    { name: 'stalled', handler: () => { noiseRef.current.show() } },
    { name: 'buffering', handler: () => { noiseRef.current.show() } },
    { name: 'loadeddata', handler: () => { playerRef.current.play() } },
    //{ name: '*', handler: (e) => { console.log(e) } },

  ];

  const router = createBrowserRouter([
    {
      path: "/:page?",
      element: <Teletext ref={teletextRef} pages={pages} timer={timer} channel={channel} />,
    },
  ]);

  function playVideo () {
    playerRef.current.log.level('debug');
    playerRef.current.play();
    //player.currentTime(666);
  }

  function parseProgramms (chan, time) {
    //All times from `urls.json` are UTC
    let times = Object.keys(urls.channels[chan]);

    for (let i = 0; i < times.length; i++) {
      if (DateTime.fromISO(times[i]) <= time && DateTime.fromISO(times[i + 1]) > time) {
        let video = { start: time - DateTime.fromISO(times[i]) }
        if ('video_url' in urls.channels[chan][times[i]]) {
          video['url'] = urls.channels[chan][times[i]]['video_url']
        }
        if ('meta_url' in urls.channels[chan][times[i]]) {
          video['info'] = urls.channels[chan][times[i]]['meta_url']
        }
        console.log('Returning program ' + time, video);
        return video;
      }
    }
  }

  function zapChannel(e, direction) {
    var i = channels.indexOf(channel);
    var logPrefix;
    if (direction) {
      if (i == channels.length - 1) {
        channel = channels[0];
      } else {
        channel = channels[i + 1];
      }
      logPrefix = 'Next channel (down), now ';
    } else {
      if (i == 0) {
        channel = channels[channels.length - 1];
      } else {
        channel = channels[i - 1];
      }
      logPrefix = 'Previous channel (up), now ';
    }
    teletextRef.current.setChannel(channel);
    const newProgramme = parseProgramms(channel, timer.appTime)['url'];
    console.log(`${logPrefix}${channel} (${newProgramme['src']})`);
    playerRef.current.src(newProgramme);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || tvFrameRef.current.getAttribute('class') == 'fullscreen') {
      document.exitFullscreen();
      console.log('Exiting Fullscreen');
    } else {
      console.log('Entering Fullscreen');
      rootRef.current.requestFullscreen();
    }
  }

  function toggleInfo() {
    if (infoRef.current.classList.contains('show')) {
      infoRef.current.querySelector('div a').setAttribute('href', parseProgramms(channel, timer.appTime)['info']);
    }
    infoRef.current.classList.toggle('hide');
    infoRef.current.classList.toggle('show');
  }

  useEffect(() => {
    if (getCookieConsentValue(consentCookieName)) {
      playVideo();
    }
  }, []);

  var stream = parseProgramms(channel, timer.appTime);
  var stream_info;
  if (stream['info'] !== undefined) {
    stream_info = stream['info'];
  }

  // See https://videojs.com/guides/react/
  var videoJsOptions = {
    autoplay: false,
    controls: true,
    fill: true,
    muted: true,
    preload: 'auto',
    sources: [
      stream['url']
    ],
  };

  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tube">
            <RouterProvider router={router} />
            <div id="info-container">
              <div ref={infoRef} id="info" className="hide">
                <button type="button" className="button toggle-info" onClick={toggleInfo}>
                  <i className="info-icon"></i>
                </button>
                <div className="info-text">
                  <a target="_blank" rel="noreferrer" href={stream_info}>Stream Metadata</a>
                </div>
              </div>
            </div>
            <TVStatic ref={noiseRef} id="tv-static" className="show" />
            <VideoJS options={videoJsOptions} ref={playerRef} eventHandlers={videoEventHandler} id="video-js-player"/>
          </div>
          <div id="controls">
            <button type="button" className="button toggle-teletext" onClick={() => teletextRef.current.toggle()}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>
              <i className="icon"></i>
            </button>
            <button type="button" className={'button toggle-fullscreen' + (isMobileSafari ? '' : 'hide')} onClick={toggleFullscreen}>
              <i className="icon"></i>
            </button>
            <button type="button" className="button toggle-static" onClick={() => noiseRef.current.toggle()}>
              <i className="icon"></i>
            </button>
          </div>
        </div>
        <CookieConsent cookieName={consentCookieName} cookieValue={true} onAccept={playVideo} expires={999} overlay="true" overlayClasses="consent-overlay" location="bottom">
          This website uses external video services from the <a href="hteletextps://archive.org/">Internet Archive</a>  which sets cookies.
        </CookieConsent>
      </div>
    </>
  )
}

export default App
