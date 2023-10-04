import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import VideoJS from './video.jsx';
import TVStatic from './noise.jsx';
import "@fontsource/press-start-2p";
import './App.scss'
import urls from './assets/json/urls.json';
//import { markdown as intro } from './assets/md/100-intro.md'
//import { markdown as about } from './assets/md/200-about.md'


function App() {
  //const [showTeletext, setTeletextVisibility] = useState(false);
  const playerRef = useRef(null);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const rootRef = useRef(null);
  const tvFrameRef = useRef(null);
  const staticRef = useRef(null);
  const ttRef = useRef(null);
  const ttPageNrRef = useRef(null);
  const ttTimeRef = useRef(null);
  const ttBodyRef = useRef(null);

  // TODO: This will be provides by JSON
  const startDateStr= '2001-09-11T02:00:00+00:00';
  // TODO: Handle timezone
  const startDate = new Date(startDateStr);
  console.log(`Starting at ${startDate}`);
  var localTime = new Date();
  const timeDiff = localTime - startDate;
  var appTime = new Date(localTime - timeDiff);

  const channels = Object.keys(urls)
  var curChannel = channels[0]

  function parseProgramms (urls, chan) {
    // TODO: This is just a PoC
    var streams = Object.values(urls[chan]);
    return streams[0];

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
    //TODO: Handle wraparound
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
    if (staticRef.current.getAttribute('class') == 'top') {
      staticRef.current.setAttribute('class', '');
    } else {
      staticRef.current.setAttribute('class', 'top');
    }
  }

  // See https://codepen.io/jsanderson/pen/yoLLjv
  function tick(elem, time) {
    var currTime;
    if (time !== undefined) {
      currTime = new Date();
    } else {
      currTime = time;
    }
    var currMin;
    var currHour;
    var currSecond;

    //leading zeroes
    if (String(currTime.getMinutes()).length == 1) {
      currMin = "0" + String(currTime.getMinutes());
    } else {
      currMin = String(currTime.getMinutes());
    }

    if (String(currTime.getHours()).length == 1) {
      currHour = '0' + String(currTime.getHours());
    } else {
      currHour = String(currTime.getHours());
    }

    if (String(currTime.getSeconds()).length == 1) {
      currSecond = '0' + String(currTime.getSeconds());
    } else {
      currSecond = String(currTime.getSeconds());
    }

    elem.innerHTML =
      days[currTime.getDay()] +
      " " +
      months[currTime.getMonth()] +
      " " +
      currTime.getDate() +
      " " +
      currHour +
      ":" +
      currMin +
      ":" +
      currSecond;
  }

  //tick(ttTimeRef.current);
  useEffect(() => {
    const interval = setInterval(() => {
      //var time = new Date();
      localTime = new Date();
      tick(ttTimeRef.current, localTime);
      appTime = new Date(localTime - timeDiff);
      Cookies.set('timecode', String(appTime), {expires: 14});
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // See https://videojs.com/guides/react/
  //src: '//vjs.zencdn.net/v/oceans.mp4',
  const videoJsOptions = {
    autoplay: true,
    controls: true,
    fill: true,
    muted: true,
    sources: [
      {
        /* src: parseProgramms(urls, curChannel),*/
        src: '//vjs.zencdn.net/v/oceans.mp4',
        type: 'video/mp4',
      },
    ],
  };

  const noiseOpts = {
    id: "tv-static",
    ref: staticRef
  };
  return (
    <>
      <div id="container" ref={rootRef}>
        <div id="tv-frame" ref={tvFrameRef}>
          <div id="tube">
            <div id="teletext" ref={ttRef} className="visible">
              <div id="tt-header">
                <div ref={ttPageNrRef} id="tt-page-nr">100</div>
                <div ref={ttTimeRef} id="tt-time">&nbsp;</div>
              </div>
              <div ref={ttBodyRef} id="tt-body">
              </div>
            </div>
            <TVStatic options={noiseOpts} id="tv-static"/>
            <VideoJS options={videoJsOptions} id="video-js-player"/>
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
