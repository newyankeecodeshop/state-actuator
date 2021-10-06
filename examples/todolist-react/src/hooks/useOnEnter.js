import { useCallback } from "react";

export default function useOnEnter(callback) {
  return useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        callback(event);
      }
    },
    [callback]
  );
}
