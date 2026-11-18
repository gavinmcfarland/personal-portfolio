/* localStorage that never throws — for the dev-only type trial tools
   (FontPicker, TextTuner). A private window or blocked storage just means the
   choice doesn't survive a reload. */

export const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* nothing to do */
  }
};
