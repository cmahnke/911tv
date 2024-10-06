import Util from "./Util";
import Cookies from "js-cookie";

class Persist {
  static set(name: string, value: string, settings: Cookies.CookieAttributes) {
    if (Util.isElectron()) {
      if (settings !== undefined) {
        delete settings.expires;
        if (Object.keys(settings).length > 0) {
          throw new Error(`Handling settings on local storage isn't implemented for ${JSON.stringify(settings)}`);
        }
      }
      localStorage.setItem(name, value);
    } else {
      Cookies.set(name, value, settings);
    }
  }

  static get(name: string) {
    if (Util.isElectron()) {
      const item = localStorage.getItem(name);
      if (item === null) {
        return undefined;
      }
      return item;
    } else {
      return Cookies.get(name);
    }
  }

  static remove(name: string) {
    if (Util.isElectron()) {
      return localStorage.removeItem(name);
    } else {
      return Cookies.remove(name);
    }
  }
}

export default Persist;
