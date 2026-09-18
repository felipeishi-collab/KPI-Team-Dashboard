import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Raiz do repositório (duas pastas acima de backend/src/services)
const REPO_ROOT = path.resolve(
  __dirname,
  "../../.."
);

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

const FIELD_SEPARATOR = "\x1f";
const RECORD_SEPARATOR = "\x1e";

export async function getRecentCommits(
  limit: number = 10
): Promise<CommitInfo[]> {
  try {
    const prettyFormat = `%h${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ad${FIELD_SEPARATOR}%s${RECORD_SEPARATOR}`;

    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        `-${limit}`,
        "--date=iso-strict",
        `--pretty=format:${prettyFormat}`,
      ],
      { cwd: REPO_ROOT }
    );

    return stdout
      .split(RECORD_SEPARATOR)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [hash, author, date, message] =
          entry.split(FIELD_SEPARATOR);

        return {
          hash,
          author,
          date,
          message,
        };
      });
  } catch (error) {
    console.error(
      "Erro ao ler o histórico do git:",
      error
    );

    return [];
  }
}
