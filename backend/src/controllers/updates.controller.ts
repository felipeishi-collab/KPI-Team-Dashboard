import { Request, Response } from "express";

import { getRecentCommits } from "../services/git.service";

export async function getRecentUpdates(
  req: Request,
  res: Response
) {
  try {
    const limitParam = req.query.limit;

    const parsedLimit = limitParam
      ? Number(limitParam)
      : 10;

    const limit =
      Number.isFinite(parsedLimit) &&
      parsedLimit > 0
        ? parsedLimit
        : 10;

    const commits = await getRecentCommits(
      limit
    );

    res.json({
      data: commits,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar atualizações recentes:",
      error
    );

    res.status(500).json({
      message:
        "Erro ao buscar atualizações recentes.",
    });
  }
}
