import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import { Howl } from 'howler';
import Timer from '../classes/Timer.js';

import './TVStatic.scss';
import staticNoiseSound from '../assets/mp3/TVStatic.mp3';
import closeDownSound from '../assets/mp3/1khz.mp3';

const sounds = {
  'static': staticNoiseSound,
  'closedown': closeDownSound
};

export const TVStatic = (props, ref) => {
  const { timer } = props;
  const animationLengthMs = 1500;
  var showState = true;
  const canvasRef = useRef(null);
  var bgNoise = sounds['static'];
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
      bgNoise = sounds['closedown'];
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
