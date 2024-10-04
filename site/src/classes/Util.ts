class Util {
  static isElectron() {
    try {
      if (electron !== undefined) {
        return true;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
    } catch (e) {}
    return false;
  }
}

export default Util;
