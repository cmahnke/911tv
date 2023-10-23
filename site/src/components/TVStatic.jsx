import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import { Howl } from 'howler';
import Timer from '../classes/Timer.js';

import './TVStatic.scss';
import staticNoiseSound from '../assets/mp3/TVStatic.mp3';
import closeDownSound from '../assets/mp3/1khz.mp3';
import closeDownBackground from '../assets/svg/Philips_PM5544.svg';

const contents = {
  'static': {'sound': staticNoiseSound, 'interval': 50},
  'closedown': {'sound': closeDownSound, 'interval': 1000, 'background': closeDownBackground}
};

export const TVStatic = (props, ref) => {
  const { timer } = props;
  const animationLengthMs = 1500;
  var showState = true;
  const canvasRef = useRef(null);
  var bgNoise = contents['static']['sound'];
  var noisePlayer;

  function show() {
    showState = true;
    checkClosedown();
    canvasRef.current.classList.remove("hide");
    canvasRef.current.classList.add("show");
    noisePlayer.fade(0, 1, animationLengthMs);
  }

  function hide() {
    showState = false;
    canvasRef.current.classList.remove("show");
    canvasRef.current.classList.add("hide");
    noisePlayer.fade(1, 0, animationLengthMs);
  }

  function checkClosedown() {
    if (timer.appTime > timer.endDate) {
      bgNoise = contents['closedown']['sound'];
      //TODO: Switch to test card
    }
  }

  function toggle() {
    if (showState) {
      hide();
    } else {
      show();
    }
  }

  useImperativeHandle(ref, () => ({
    show: () => { show() },
    hide: () => { hide() },
    toggle: () => { toggle() },
  }));

  function parseSVG(data) {
    const parser = new DOMParser();
    return parser.parseFromString(data, 'image/svg+xml').querySelector('svg');
  }

/*
  useEffect(() => {
    noisePlayer.play();
  });
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

    //TODO: Finish this
    var makeTestcard = function () {
      const svg = parseSVG(contents['closedown']['background']);
      //TODO: Update image here
      let template = '';
      svg.getElementById('header-date').textContent = timer.formatDate();
      svg.getElementById('footer-time').textContent = timer.formatTime();
      context.drawImage(svg, 0, 0);

    }

    var time = 0;
    var canvas = canvasRef.current;
    var context = canvas.getContext("2d");

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
      makeNoise();
    }, 50);
    return () => clearInterval(interval);
  }, [ref]);

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
