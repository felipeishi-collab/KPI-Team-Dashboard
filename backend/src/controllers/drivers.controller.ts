import { Request, Response } from "express";
import { getDriversData } from "../services/drivers.service";

export async function getDrivers(
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
    } = req.query;

    const data = await getDriversData({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      station: station as string | undefined,
      stationId: stationId as string | undefined,
      stationName: stationName as string | undefined,
    });

    res.json({ data });
  } catch (error) {
    console.error(
      "Erro ao buscar dados de drivers:",
      error
    );

    res.status(500).json({
      message: "Erro ao buscar dados de drivers.",
    });
  }
}
