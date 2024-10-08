import * as React from "react";
import PropTypes from "prop-types";
import SVG from "react-inlinesvg";
import "./Unmute.scss";

type UnmuteProps = {
  clickCallback: () => void | undefined;
};

export const Unmute = (props: UnmuteProps) => {
  const { clickCallback } = props;
  const checkboxRef = React.useRef<HTMLInputElement>();

  const unmute = () => {
    if (clickCallback !== undefined) {
      clickCallback();
    }
    if (checkboxRef.current != null) {
      checkboxRef.current.checked = false;
    }
  };

  return (
    <React.StrictMode>
      <div id="mute-icon-container" onClick={unmute}>
        <label htmlFor="speaker-checkbox">
          <SVG src="src/assets/svg/speaker.svg" />
        </label>
        <input type="checkbox" id="speaker-checkbox" ref={checkboxRef} className="speaker-checkbox" name="muted" defaultChecked={true} />
      </div>
    </React.StrictMode>
  );
};

Unmute.propTypes = {
  clickCallback: PropTypes.func
};

export default Unmute;
