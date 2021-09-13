const { isArray } = Array;

/**
 * Update an object, such as a model, using one or more value tuples.
 * Unlike `Object.assign()`, this function is type-safe.
 * @param obj The target object
 * @param val A tuple containing a single key/value or an object with multiple values
 * @returns An object with the given values set
 */
export function assignTo<T, K extends keyof T>(obj: T, val: [K, T[K]] | Partial<T>): T {
  if (isArray(val)) {
    return copyOnWrite(obj, val[0], val[1]);
  } else {
    for (const key in val) {
      obj = copyOnWrite(obj, key, val[key]) as T;
    }
    return obj;
  }
}

function copyOnWrite<T, K extends keyof T>(target: T, key: K, value: T[K]) {
  return target[key] === value ? target : { ...target, [key]: value };
}
