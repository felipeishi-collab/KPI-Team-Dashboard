// ============================================================
// EXPORTAÇÃO DE TABELAS — CSV e XLSX
//
// Sem dependências externas: o CSV é texto puro e o XLSX é
// montado "na mão" (um .xlsx é só um .zip com alguns XMLs
// dentro). Assim não precisa instalar nenhuma lib nova.
//
// Uso:
//   downloadCsv("arquivo.csv", columns, rows)
//   downloadXlsx("arquivo.xlsx", columns, rows, "Aba")
// ============================================================

export type ExportColumnType =
  | "text"
  | "int"
  | "decimal"
  // valor em 0–100 (ex.: 56,3 = 56,3%)
  | "percent"
  // data no formato "AAAA-MM-DD" (vira data de verdade no Excel)
  | "date";

export interface ExportColumn {
  header: string;
  type: ExportColumnType;
  width?: number;
}

export type ExportCell = string | number | null | undefined;

// ============================================================
// HELPERS
// ============================================================

function isEmpty(value: ExportCell): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && !Number.isFinite(value))
  );
}

function triggerDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// CSV
//
// Padrão do Excel em português: separador ";" e vírgula como
// separador decimal. O BOM no início garante que acentos
// (ã, ç…) abram certo no Excel.
// ============================================================

function formatCsvNumber(value: number, maxDecimals: number) {
  return value.toLocaleString("pt-BR", {
    useGrouping: false,
    maximumFractionDigits: maxDecimals,
  });
}

function formatCsvCell(
  value: ExportCell,
  type: ExportColumnType
): string {
  if (isEmpty(value)) {
    return "";
  }

  let text: string;

  if (typeof value === "number") {
    text =
      type === "int"
        ? formatCsvNumber(value, 0)
        : formatCsvNumber(value, 2);
  } else if (type === "date") {
    const [year, month, day] = value.split("-");

    text =
      year && month && day
        ? `${day}/${month}/${year}`
        : value;
  } else {
    text = value;
  }

  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function downloadCsv(
  fileName: string,
  columns: ExportColumn[],
  rows: ExportCell[][]
) {
  const lines = [
    columns
      .map((column) => formatCsvCell(column.header, "text"))
      .join(";"),
    ...rows.map((row) =>
      columns
        .map((column, index) =>
          formatCsvCell(row[index], column.type)
        )
        .join(";")
    ),
  ];

  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });

  triggerDownload(fileName, blob);
}

// ============================================================
// XLSX — XMLs da planilha
// ============================================================

// estilos (índices de cellXfs em STYLES_XML):
// 0 padrão | 1 cabeçalho (negrito) | 2 inteiro | 3 decimal
// 4 percentual | 5 data
const STYLE_BY_TYPE: Record<ExportColumnType, number> = {
  text: 0,
  int: 2,
  decimal: 3,
  percent: 4,
  date: 5,
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // remove caracteres de controle que o XML não aceita
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function sanitizeSheetName(name: string) {
  return (
    name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Planilha"
  );
}

function workbookXml(sheetName: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(
    sanitizeSheetName(sheetName)
  )}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

// índice 0 -> "A", 25 -> "Z", 26 -> "AA"...
function columnLetter(index: number) {
  let letter = "";
  let n = index + 1;

  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }

  return letter;
}

// "AAAA-MM-DD" -> número de série de data do Excel
function toExcelDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const utc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return utc / 86400000 + 25569;
}

function inlineStringCell(ref: string, text: string, style = 0) {
  return `<c r="${ref}" t="inlineStr"${
    style ? ` s="${style}"` : ""
  }><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function buildCell(
  ref: string,
  value: ExportCell,
  type: ExportColumnType
): string {
  if (isEmpty(value)) {
    return "";
  }

  if (type === "date" && typeof value === "string") {
    const serial = toExcelDate(value);

    // período mensal ("AAAA-MM") ou fora do padrão fica como texto
    return serial === null
      ? inlineStringCell(ref, value)
      : `<c r="${ref}" s="${STYLE_BY_TYPE.date}"><v>${serial}</v></c>`;
  }

  if (typeof value === "number") {
    const numeric = type === "percent" ? value / 100 : value;

    return `<c r="${ref}" s="${STYLE_BY_TYPE[type]}"><v>${numeric}</v></c>`;
  }

  return inlineStringCell(ref, value);
}

function sheetXml(
  columns: ExportColumn[],
  rows: ExportCell[][]
) {
  const lastColumn = columnLetter(columns.length - 1);
  const lastRow = rows.length + 1;

  const cols = columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${
          column.width ?? 16
        }" customWidth="1"/>`
    )
    .join("");

  const headerRow = `<row r="1">${columns
    .map((column, index) =>
      inlineStringCell(
        `${columnLetter(index)}1`,
        column.header,
        1
      )
    )
    .join("")}</row>`;

  const dataRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;

      return `<row r="${rowNumber}">${columns
        .map((column, columnIndex) =>
          buildCell(
            `${columnLetter(columnIndex)}${rowNumber}`,
            row[columnIndex],
            column.type
          )
        )
        .join("")}</row>`;
    })
    .join("");

  // cabeçalho congelado + filtro automático nas colunas
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols>
<sheetData>${headerRow}${dataRows}</sheetData>
<autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`;
}

// ============================================================
// XLSX — ZIP (método "store", sem compressão)
// ============================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(
  files: { name: string; content: string }[]
): Blob {
  const encoder = new TextEncoder();

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];

  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // assinatura
    local.setUint16(4, 20, true); // versão necessária
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true); // sem compressão
    local.setUint16(10, 0, true); // hora
    local.setUint16(12, 0x21, true); // data (01/01/1980)
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 0x21, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true);
    central.setUint16(32, 0, true);
    central.setUint16(34, 0, true);
    central.setUint16(36, 0, true);
    central.setUint32(38, 0, true);
    central.setUint32(42, offset, true);

    localParts.push(
      new Uint8Array(local.buffer),
      nameBytes,
      data
    );

    centralParts.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  });

  const centralSize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  );

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true);

  return new Blob(
    [
      ...localParts,
      ...centralParts,
      new Uint8Array(end.buffer),
    ] as BlobPart[],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );
}

export function downloadXlsx(
  fileName: string,
  columns: ExportColumn[],
  rows: ExportCell[][],
  sheetName = "Planilha"
) {
  const blob = buildZip([
    { name: "[Content_Types].xml", content: CONTENT_TYPES_XML },
    { name: "_rels/.rels", content: ROOT_RELS_XML },
    { name: "xl/workbook.xml", content: workbookXml(sheetName) },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: WORKBOOK_RELS_XML,
    },
    { name: "xl/styles.xml", content: STYLES_XML },
    {
      name: "xl/worksheets/sheet1.xml",
      content: sheetXml(columns, rows),
    },
  ]);

  triggerDownload(fileName, blob);
}
