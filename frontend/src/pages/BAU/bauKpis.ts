export interface BauKpi {
  id: string;
  name: string;
  description: string;
  unit: string;
  dataKey: string;
}

export const bauKpis: BauKpi[] = [
  {
    id: "at_no_piso",
    name: "ATs no piso",
    description: "Quantidade de ATs no piso / ATs no show",
    unit: "ATs",
    dataKey: "at_no_piso",
  },
  {
    id: "percent_at_no_piso",
    name: "% ATs no piso",
    description:
      "Percentual de ATs no piso em relação às ATs delivering",
    unit: "%",
    dataKey: "percent_at_no_piso",
  },
];