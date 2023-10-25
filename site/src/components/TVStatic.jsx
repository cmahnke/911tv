import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from "react";
import PropTypes from 'prop-types';
import { Howl } from 'howler';
import Timer from '../classes/Timer.js';

import './TVStatic.scss';
import staticNoiseSound from '../assets/mp3/TVStatic.mp3';
import closeDownSound from '../assets/mp3/1khz.mp3';
import closeDownBackground from '../assets/svg/Philips_PM5544.svg';

export const TVStatic = (props, ref) => {
  const { timer } = props;

  const contents = {
    'static': {'sound': staticNoiseSound, 'interval': 50 },
    'closedown': {'sound': closeDownSound, 'interval': 1000, 'background': closeDownBackground}
  };

  const animationLengthMs = 1500;
  var showState = true;
  const canvasRef = useRef(null);
  var bgNoise ;
  var noisePlayer;
  const [mode, setMode] = useState('static');
  //const [noisePlayer, setNoisePlayer] = useState(0);

  function show(className) {
    showState = true;
    if (className !== undefined) {
      canvasRef.current.classList.remove(className);
    }
    checkClosedown();
    canvasRef.current.classList.remove("hide");
    canvasRef.current.classList.add("show");
    noisePlayer.fade(0, 1, animationLengthMs);
  }

  function hide(className) {
    showState = false;
    if (className !== undefined) {
      canvasRef.current.classList.add(className);
    }
    canvasRef.current.classList.remove("show");
    canvasRef.current.classList.add("hide");
    noisePlayer.fade(1, 0, animationLengthMs);
  }

  function changeMode(newMode) {
    if (newMode in contents) {
      console.log(`Setting mode to ${newMode}`);
      setMode(newMode);
    }
  }

  function checkClosedown() {
    if (timer.appTime > timer.endDate) {
      changeMode('closedown');
    }
  }

  function toggle() {
    if (showState) {
      hide();
    } else {
      show();
    }
  }

  function mute(fade) {
    if (noisePlayer !== undefined) {
      if (fade != undefined) {
        noisePlayer.fade(1, 0, fade);
      } else {
        noisePlayer.stop();
      }
    }
  }

  function unmute() {
    if (noisePlayer !== undefined) {
      noisePlayer.play();
    }
  }

  useImperativeHandle(ref, () => ({
    show: () => { show() },
    hide: () => { hide() },
    toggle: () => { toggle() },
    changeMode: (mode) => { changeMode(mode) },
    mute: () => { mute() },
    unmute: () => { unmute() },
  }));

/*
  useEffect(() => {
    noisePlayer.play();
  });
*/

/*
  function setCanvasSize() {
    canvas = canvasRef.current;
    canvas.setAttribute("height", canvas.height);
    canvas.setAttribute("width", canvas.width);
  }
*/

  useEffect(() => {

    // See https://stackoverflow.com/a/23572465
    var makeNoise = function() {
      var imgd = context.createImageData(canvas.width, canvas.height);
      var pix = imgd.data;

      for (var i = 0, n = pix.length; i < n; i += 4) {
          var c = 7 + Math.sin(i/50000 + time/7); // A sine wave of the form sin(ax + bt)
          pix[i] = pix[i+1] = pix[i+2] = 40 * Math.random() * c; // Set a random gray
          pix[i+3] = 255; // 100% opaque
      }
      context.putImageData(imgd, 0, 0);
      time = (time + 1) % canvas.height;
    }

    var makeTestcard = function () {
      //TODO: Decide if test card should be sharper - certainly not
      // See https://stackoverflow.com/a/41776757
      /*
      if(devicePixelRatio >= 2){
        canvas.width *= 2;
        canvas.height *= 2;
      }
      */

      const parser = new DOMParser();
      var svgDoc = parser.parseFromString(contents['closedown']['background'], 'image/svg+xml').querySelector('svg');
      svgDoc.setAttribute('viewBox', `0 0 ${svgDoc.getAttribute('width')} ${svgDoc.getAttribute('height')}`);
      svgDoc.getElementById('header-date').textContent = timer.formatDate();
      svgDoc.getElementById('header-time').textContent = timer.formatTimeWithSecs();

      var svgData = new XMLSerializer().serializeToString(svgDoc);
      var svg = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"})
      var url = URL.createObjectURL(svg);
      var img = new Image(canvas.width, canvas.height);
      img.src = url
      img.height = canvas.height;
      img.width = canvas.width;
      img.onload = () => {
        context = canvas.getContext("2d");
        context.imageSmoothingEnabled = false;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
      }

      canvasRef.current.classList.add("testcard")
    }

    var time = 0;
    var canvas = canvasRef.current;

    var context = canvas.getContext("2d");
    bgNoise = contents[mode]['sound'];

    //somehow this can be initilized twice
    if (noisePlayer === undefined) {
      console.log('During development hot reload will use the noise sound twice');
      noisePlayer = new Howl({
        src: [bgNoise],
        autoplay: true,
        loop: true
      })
    }
    // The HTML element would be noisePlayer._sounds[0]._node

    const interval = setInterval(() => {
      if (mode === 'static') {
        makeNoise();
      } else if (mode === 'closedown') {
        makeTestcard();
      }
    }, contents[mode]['interval']);
    return () => clearInterval(interval);
  }, [ref, mode]);

  var className = 'tv-static';
  if (props.className !== undefined) {
    className += ' ' + props.className;
  }
  return <canvas id={props.id} ref={canvasRef} className={className}></canvas>
}

TVStatic.propTypes = {
  timer: PropTypes.instanceOf(Timer),
  id: PropTypes.string,
  className: PropTypes.string
};

export default forwardRef(TVStatic);
