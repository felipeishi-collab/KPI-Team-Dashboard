import { Request, Response } from "express";

import {
  getAtNoPisoData,
} from "../services/kpi.service";

export async function getAtNoPiso(
  req: Request,
  res: Response
) {
  try {
    const {
      startDate,
      endDate,
      station,
      dispatchWindow,
    } = req.query;

    const data = await getAtNoPisoData({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      station: station as string | undefined,
      dispatchWindow:
        dispatchWindow as string | undefined,
    });

    res.json({
      data,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar dados do KPI AT no Piso:",
      error
    );

    res.status(500).json({
      message:
        "Erro ao buscar dados do KPI AT no Piso.",
    });
  }
}