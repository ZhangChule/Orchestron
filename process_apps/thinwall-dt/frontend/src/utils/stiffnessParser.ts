import type { KeyPoint } from "../app/types";

// #region File reading
export async function readTextFile(file: File) {
  const buffer = await file.arrayBuffer();
  for (const encoding of ["utf-8", "gbk"]) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      // Try the next common CSV text encoding.
    }
  }
  return new TextDecoder().decode(buffer);
}
// #endregion

// #region Matrix token helpers
function splitMatrixLine(line: string) {
  return line
    .trim()
    .split(/[,\s;]+/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function parseMatrixRow(line: string, lineNumber: number) {
  const values = splitMatrixLine(line).map(Number);
  if (!values.length || values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error(`刚度矩阵第 ${lineNumber} 行需要全部为正数。`);
  }
  return values;
}
// #endregion

// #region Stiffness matrix parser
// 文件只记录刚度值：每一行是 K 方向测点，空行分隔 I 方向的不同二维矩阵。
// 例如一行六列表示 I=1, J=1, K=6；点 id 按 K/J/I 编为 K1_J1_I1。
export function parseStiffnessKeyPoints(text: string): KeyPoint[] {
  const rawLines = text.split(/\r?\n/);
  const matrices: number[][][] = [];
  let currentMatrix: number[][] = [];

  rawLines.forEach((rawLine, rawIndex) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      if (currentMatrix.length) {
        matrices.push(currentMatrix);
        currentMatrix = [];
      }
      return;
    }
    currentMatrix.push(parseMatrixRow(line, rawIndex + 1));
  });

  if (currentMatrix.length) {
    matrices.push(currentMatrix);
  }
  if (!matrices.length) {
    throw new Error("刚度文件为空。");
  }

  const rowCount = matrices[0].length;
  const colCount = matrices[0][0]?.length ?? 0;
  if (!rowCount || !colCount) {
    throw new Error("刚度矩阵至少需要 1 行 1 列。");
  }

  matrices.forEach((matrix, matrixIndex) => {
    if (matrix.length !== rowCount) {
      throw new Error(`第 ${matrixIndex + 1} 个刚度矩阵行数不一致。`);
    }
    matrix.forEach((row, rowIndex) => {
      if (row.length !== colCount) {
        throw new Error(`第 ${matrixIndex + 1} 个刚度矩阵第 ${rowIndex + 1} 行列数不一致。`);
      }
    });
  });

  const points: KeyPoint[] = [];
  matrices.forEach((matrix, matrixIndex) => {
    matrix.forEach((row, rowIndex) => {
      row.forEach((stiffness, colIndex) => {
        points.push({
          id: `K${colIndex + 1}_J${rowIndex + 1}_I${matrixIndex + 1}`,
          x: 0,
          y: 0,
          z: 0,
          stiffness,
          matrixIndex,
          rowIndex,
          colIndex,
        });
      });
    });
  });

  console.debug(
    "[stiffnessParser] id/stiffness",
    points.map(({ id, stiffness }) => ({
      id,
      stiffness,
    })),
  );

  return points;
}
// #endregion
