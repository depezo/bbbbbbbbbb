/* eslint-disable @typescript-eslint/no-explicit-any */
function clone(obj: unknown): unknown {
  let copy: any;

  // Handle the 3 simple types, and null or undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array
  if (obj instanceof Array) {
    copy = [];
    for (let i = 0, len = obj.length; i < len; i += 1) {
      copy[i] = clone(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {};
    Object.keys(obj).forEach((attr) => {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(attr))
        (copy as Record<string, unknown>)[attr] = clone(
          (obj as Record<string, any>)[attr]
        );
    });
    return copy;
  }

  throw new Error("Unable to copy obj! Its type isn't supported.");
}

// eslint-disable-next-line import/prefer-default-export
export { clone };
