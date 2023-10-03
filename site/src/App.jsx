import React, { useState, useEffect, useRef } from 'react';
import VideoJS from './video.jsx';
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

  const ttRef = useRef(null);
  const ttPageNrRef = useRef(null);
  const ttTimeRef = useRef(null);
  const ttBodyRef = useRef(null);

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

  // See https://codepen.io/jsanderson/pen/yoLLjv
  function tick(elem) {
    var currTime = new Date();
    var currMin;
    var currHour;

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

    elem.innerHTML =
      days[currTime.getDay()] +
      " " +
      months[currTime.getMonth()] +
      " " +
      currTime.getDate() +
      " " +
      currHour +
      ":" +
      currMin;
  }

  //tick(ttTimeRef.current);
  useEffect(() => {
    const interval = setInterval(() => {
      tick(ttTimeRef.current);
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
        src: '//vjs.zencdn.net/v/oceans.mp4',
        type: 'video/mp4',
      },
    ],
  };
  return (
    <>
      <div id="tv-frame">
        <div id="tube">
          <div id="teletext" ref={ttRef} className="visible">
            <div id="tt-header">
              <div ref={ttPageNrRef} id="tt-page-nr">100</div>
              <div ref={ttTimeRef} id="tt-time">&nbsp;</div>
            </div>
            <div ref={ttBodyRef} id="tt-body">
            </div>
          </div>
          <VideoJS options={videoJsOptions} id="video-js-player"/>
        </div>
        <div id="controls">
          <button type="button" className="toggle-teletext" onClick={toggleTeletext}>&nbsp;</button>
          <button type="button" className="zap-channel-up" onClick={(e) => { zapChannel(e, false)}}>&nbsp;</button>
          <button type="button" className="zap-channel-down" onClick={(e) => { zapChannel(e, true)}}>&nbsp;</button>
        </div>
      </div>

    </>
  )
}

export default App
