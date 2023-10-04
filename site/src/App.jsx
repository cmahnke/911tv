import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import VideoJS from './video.jsx';
import TVStatic from './noise.jsx';
import 'normalize.css';
import "@fontsource/press-start-2p";
import './App.scss'
import urls from './assets/json/urls.json';
import pages from './assets/json/pages.json';

function App() {
  const playerRef = useRef(null);

  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const noiseRef = useRef(null);
  const ttRef = useRef(null);
  const ttPageNrRef = useRef(null);
  const ttTimeRef = useRef(null);
  const ttBodyRef = useRef(null);

  //const staticNoiseRe = useRef(null);

  const timeDiffCookieName = 'timediff';
  const timeCodeCookieName = 'timecode';

  const params = new URLSearchParams(window.location.search);
  // TODO: this doesn't work yet
  if (params['reset'] !== undefined) {
    Cookies.remove(timeDiffCookieName)
    Cookies.remove(timeCodeCookieName)
  }

  // TODO: This will be provided by JSON
  const meta = {'metadata': {'start': '2001-09-11T02:00:00+00:00', 'end': '2001-09-17T00:50:00+00:00', 'timezone': 'EDT'}};
  // TODO: Handle timezone
  const startDate = new Date(meta.metadata.start);
  const endDate = new Date(meta.metadata.end);
  const timezone = new Date(meta.metadata.timezone);

  console.log(`Starting at ${startDate}`);
  var localTime = new Date();
  var timeDiff;
  // TODO: fallback to apptime if diffence is greater then play length
  if (Cookies.get(timeDiffCookieName) === undefined) {
    timeDiff = localTime - startDate;
    Cookies.set(timeDiffCookieName, String(timeDiff), {expires: 14});
  } else {
    timeDiff = Cookies.get(timeDiffCookieName);
  }
  var appTime = new Date(localTime - timeDiff);


  var currPage = getPage(100);
  console.log(currPage);


  const channels = Object.keys(urls)
  var curChannel = channels[0]

  function parseProgramms (urls, chan) {
    // TODO: This is just a PoC
    var streams = Object.values(urls[chan]);
    return streams[0];
  }

  function getPage(number) {
    //TODO: Hook references to other pages in here, when routing exists
    return pages.filter(obj => {
      return obj.number == number
    })[0];
  }

  function toggleTeletext(e) {
    e.preventDefault();
    if (ttRef.current.getAttribute('class') == 'visible') {
      ttRef.current.setAttribute('class', 'hidden');
    } else {
      ttRef.current.setAttribute('class', 'visible');
    }
  }

  function zapChannel(e, direction) {
    var i = channels.indexOf(curChannel);
    if (direction) {
      if (i == channels.length - 1) {
        curChannel = channels[0];
      } else {
        curChannel = channels[i + 1];
      }
      console.log(`Next channel (down), now ${curChannel}`);
    } else {
      if (i == 0) {
        curChannel = channels[channels.length - 1];
      } else {
        curChannel = channels[i - 1];
      }
      console.log(`Previous channel (up), now ${curChannel}`);
    }
  }

  function toggelFullscreen(e) {
    e.preventDefault();
    if (document.fullscreenElement || tvFrameRef.current.getAttribute('class') == 'fullscreen') {
      document.exitFullscreen();
      console.log('Exiting Fullscreen');
    } else {
      console.log('Entering Fullscreen');
      rootRef.current.requestFullscreen();
    }
  }

  function toggelStatic(e) {
    //console.log(this.props.children);
    if (noiseRef.current.getAttribute('class') == 'show') {
      noiseRef.current.setAttribute('class', 'hide');
    } else {
      noiseRef.current.setAttribute('class', 'show');
    }
  }

  // See https://codepen.io/jsanderson/pen/yoLLjv
  function formatTimecode(date) {
    return date.toLocaleString('en-us', {weekday: 'short'}) + " " +
    date.toLocaleString('en-us', {month: 'short'}) + " " +
    date.getDate() + " " +
    date.toTimeString().substring(0,8);
  }

  function tick(elem, time) {
    var currTime;
    if (time === undefined) {
      currTime = new Date();
    } else {
      currTime = time;
    }
    elem.innerHTML = formatTimecode(currTime);
  }

  useEffect(() => {
    ttBodyRef.current.innerHTML = currPage.html;
    const interval = setInterval(() => {
      // TODO: Assignments to the 'localTime' variable from inside React Hook useEffect will be lost after each render. To preserve the value over time, store it in a useRef Hook and keep the mutable value in the '.current' property. Otherwise, you can move this variable directly inside useEffect
      localTime = new Date();
      appTime = new Date(localTime - timeDiff);
      tick(ttTimeRef.current, appTime);
      Cookies.set(timeCodeCookieName, String(appTime), {expires: 14});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // See https://videojs.com/guides/react/
  const videoJsOptions = {
    autoplay: true,
    controls: true,
    fill: true,
    muted: true,
    sources: [
      {
        /*src: parseProgramms(urls, curChannel),*/
        src: '//vjs.zencdn.net/v/oceans.mp4',
        type: 'video/mp4',
      },
    ],
  };

  const noiseOpts = {
    id: "tv-static"
  };
  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tube">
            <div id="teletext" ref={ttRef} className="visible">
              <div id="tt-header">
                <div ref={ttPageNrRef} id="tt-page-nr">100</div>
                <div ref={ttTimeRef} id="tt-time">{formatTimecode(appTime)}</div>
              </div>
              <div ref={ttBodyRef} id="tt-body">
              </div>
            </div>
            {/* TODO: Handle z-index switch */}
            <TVStatic options={noiseOpts} ref={noiseRef} id="tv-static"/>
            <VideoJS options={videoJsOptions} ref={playerRef} id="video-js-player"/>
          </div>
          <div id="controls">
            <button type="button" className="toggle-teletext" onClick={toggleTeletext}>&nbsp;</button>
            <button type="button" className="zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>&nbsp;</button>
            <button type="button" className="zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>&nbsp;</button>
            <button type="button" className="toggle-fullscreen" onClick={toggelFullscreen}>&nbsp;</button>
            <button type="button" className="toggle-static" onClick={toggelStatic}>&nbsp;</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
