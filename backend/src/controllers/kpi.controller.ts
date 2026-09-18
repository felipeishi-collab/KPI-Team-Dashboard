import { Request, Response } from "express";

import {
  getAtNoPisoData,
  getStationsList,
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
      stationId,
      stationName,
      dispatchWindow,
    } = req.query;

    const data = await getAtNoPisoData({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      station: station as string | undefined,
      stationId: stationId as string | undefined,
      stationName: stationName as string | undefined,
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

export async function getStations(
  req: Request,
  res: Response
) {
  try {
    const stations = await getStationsList();

    res.json({
      data: stations,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar lista de estações:",
      error
    );

    res.status(500).json({
      message:
        "Erro ao buscar lista de estações.",
    });
  }
}