import React, { forwardRef } from "react";
//import PropTypes from 'prop-types';

// See https://stackoverflow.com/a/23572465

export const TVStatic = (props, noiseRef) => {

  React.useEffect(() => {
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
    var canvas = noiseRef.current;
    var context = canvas.getContext("2d");
    const interval = setInterval(() => {
      makeNoise();
    }, 50);
    return () => clearInterval(interval);
  }, [noiseRef]);

  var className = 'tv-static';
  if (props.className !== undefined) {
    className += ' ' + props.className;
  }
  return <canvas id={props.id} ref={noiseRef} className={className}></canvas>
}

/*
TVStatic.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string
};
*/

export default forwardRef(TVStatic);
