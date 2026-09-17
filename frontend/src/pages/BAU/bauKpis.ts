export interface BauKpi {
  id: string;
  name: string;
  description: string;
  unit: string;
  dataKey: string;
}

export const bauKpis: BauKpi[] = [
  {
    id: "qty_delivering",
    name: "Qty Delivering",
    description: "Quantidade de pedidos em entrega",
    unit: "Pedidos",
    dataKey: "qty_delivering",
  },
  {
    id: "qty_ats",
    name: "Qty ATs",
    description: "Quantidade de ATs",
    unit: "ATs",
    dataKey: "qty_ats",
  },
  {
    id: "qty_drivers",
    name: "Qty Drivers",
    description: "Quantidade de drivers",
    unit: "Drivers",
    dataKey: "qty_drivers",
  },
];