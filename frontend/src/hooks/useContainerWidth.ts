import { useCallback, useRef, useState } from "react";

// ============================================================
// useContainerWidth
//
// Mede o tamanho real (em pixels) de um elemento e mantém
// atualizado conforme a tela é redimensionada.
//
// Usado pelos gráficos em SVG (linha e barras do BAU): o viewBox
// deles precisa bater com o tamanho renderizado de verdade, senão
// o preserveAspectRatio="none" estica tudo — inclusive os textos
// dos eixos — de forma não uniforme (largura fluida x altura
// fixa em CSS), deixando as datas e os valores da escala
// "esticados". Com o viewBox casado com o tamanho medido, a
// escala horizontal fica 1:1 com a vertical e o texto renderiza
// no tamanho de fonte real.
//
// Usa um "callback ref" (em vez de useRef + useEffect) de
// propósito: alguns desses containers só aparecem no DOM depois
// que os dados chegam da API (o card fica escondido atrás de um
// "carregando..." até lá). Com useRef + useEffect(() => {...}, []),
// o efeito roda uma vez já no mount do componente pai — nesse
// momento o container ainda não existe, ref.current é null, o
// ResizeObserver nunca chega a ser criado, e a largura fica presa
// no fallback pra sempre (é exatamente esse o bug: o gráfico de
// linha continuava esticado enquanto os de barra, que já nascem
// com dado pronto, funcionavam). Um callback ref é chamado pelo
// React toda vez que o nó é (des)anexado, então funciona não
// importa quando o elemento realmente aparece.
//
// Retorna [ref, width, height] — a maioria dos gráficos só
// precisa da largura (a altura do container já é fixa em CSS e
// bate com o viewBox), mas a altura também é medida pra cobrir os
// breakpoints responsivos que reduzem a altura do card no mobile.
// ============================================================

export function useContainerWidth<
  T extends HTMLElement
>(fallbackWidth: number, fallbackHeight = 0) {
  const [width, setWidth] =
    useState(fallbackWidth);

  const [height, setHeight] = useState(
    fallbackHeight
  );

  const observerRef =
    useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: T | null) => {
    // se já existia um observer de uma renderização
    // anterior (elemento trocou ou desmontou), desliga
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!element) {
      return;
    }

    const updateSize = () => {
      const measuredWidth =
        element.clientWidth;

      const measuredHeight =
        element.clientHeight;

      if (measuredWidth > 0) {
        setWidth(measuredWidth);
      }

      if (measuredHeight > 0) {
        setHeight(measuredHeight);
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    observerRef.current = observer;
  }, []);

  return [ref, width, height] as const;
}
