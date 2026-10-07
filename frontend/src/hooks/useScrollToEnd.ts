import {
  useCallback,
  useEffect,
  useRef,
} from "react";

// ============================================================
// useScrollToEnd
//
// Para gráficos com rolagem horizontal: leva a rolagem para o
// fim (dias mais recentes) quando o elemento aparece e sempre
// que `key` muda (ex.: quantidade de períodos ou granularidade).
//
// Callback ref pelo mesmo motivo do useContainerWidth: o
// gráfico só entra no DOM depois que os dados chegam.
// ============================================================

export function useScrollToEnd<T extends HTMLElement>(
  key: number | string
) {
  const elementRef = useRef<T | null>(null);

  const scrollToEnd = () => {
    const element = elementRef.current;

    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  };

  const ref = useCallback((element: T | null) => {
    elementRef.current = element;

    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, []);

  useEffect(scrollToEnd, [key]);

  return ref;
}
