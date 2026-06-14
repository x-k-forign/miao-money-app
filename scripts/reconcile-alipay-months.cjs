const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};

const { classifyImportTransaction } = require("../services/importTransactionClassifierService.ts");
const { parseImportRows } = require("../services/importParserService.ts");
const { findRefundSourceCandidate } = require("../services/refundMatchingService.ts");

const sampleDir = "F:\\cpmputer_jobs\\Codex_Project\\money_project_file";
const fileName = fs
  .readdirSync(sampleDir)
  .find((name) => name.startsWith("支付宝交易明细") && name.endsWith(".csv"));

if (!fileName) {
  throw new Error("未找到支付宝 CSV 样例");
}

const buffer = fs.readFileSync(path.join(sampleDir, fileName));
const content = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const rows = parseImportRows("csv", content);
const expected = {
  "2026-04": { expense: 787.52, income: 0, netExpense: 787.52 },
  "2026-05": { expense: 408.4, income: 38, netExpense: 408.4 }
};

console.log(`文件: ${fileName}`);
for (const month of Object.keys(expected)) {
  reconcileMonth(month, rows.filter((row) => pick(row, ["交易时间"]).startsWith(month)), expected[month]);
}

function reconcileMonth(month, monthRows, expectedMonth) {
  const raw = { expense: 0, income: 0, neutral: 0 };
  const totals = { expense: 0, ignore: 0, income: 0, refund: 0, transfer: 0 };
  const counts = { expense: 0, ignore: 0, income: 0, refund: 0, transfer: 0 };
  const classified = [];

  for (const row of monthRows) {
    const direction = pick(row, ["收/支", "收支"]);
    const amount = Math.abs(parseAmount(pick(row, ["金额", "金额(元)", "交易金额"])));
    const typeText = pick(row, ["交易分类", "交易类型", "类型"]);
    const productText = pick(row, ["商品说明", "商品", "商品名称"]);
    const statusText = pick(row, ["交易状态", "当前状态", "状态"]);
    const result = classifyImportTransaction({
      directionText: direction,
      productText,
      provider: "alipay",
      rowText: Object.values(row).join(" "),
      signedAmount: direction === "支出" ? -amount : amount,
      statusText,
      typeText
    });

    if (direction === "支出") raw.expense += amount;
    else if (direction === "收入") raw.income += amount;
    else raw.neutral += amount;
    totals[result.kind] += amount;
    counts[result.kind] += 1;
    classified.push({
      amountCents: Math.round(amount * 100),
      direction,
      externalTradeNo: pick(row, ["支付宝交易号", "交易号", "交易单号"]),
      kind: result.kind,
      merchantName: pick(row, ["交易对方", "对方"]),
      merchantOrderNo: pick(row, ["商家订单号", "商户订单号"]),
      note: `${typeText} ${productText} ${pick(row, ["交易对方", "对方"])}`,
      productText,
      provider: "alipay",
      recordDate: pick(row, ["交易时间"]).slice(0, 10),
      statusText,
      typeText
    });
  }

  const expenses = classified.filter((row) => row.kind === "expense");
  const refunds = classified.filter((row) => row.kind === "refund");
  const matchedRefunds = refunds.filter((refund) => findRefundSourceCandidate(refund, expenses));
  const matchedRefundAmount = matchedRefunds.reduce((sum, refund) => sum + refund.amountCents / 100, 0);
  const netExpense = totals.expense - matchedRefundAmount;

  console.log(`\n${month} 行数: ${monthRows.length}`);
  console.log("原始收支:", format(raw));
  console.log("五类金额:", format(totals));
  console.log("五类笔数:", counts);
  console.log(`退款匹配: ${matchedRefunds.length}/${refunds.length}`);

  if (process.argv.includes("--details")) {
    for (const kind of ["ignore", "transfer", "refund", "income"]) {
      console.log(`\n${month} ${kind}:`);
      console.table(classified.filter((row) => row.kind === kind));
    }
  }

  assertMoney(totals.expense, expectedMonth.expense, `${month} 支付宝截图支出`);
  assertMoney(totals.income, expectedMonth.income, `${month} 支付宝截图收入`);
  assertMoney(netExpense, expectedMonth.netExpense, `${month} 系统净支出`);
  assert.equal(matchedRefunds.length, 0, `${month} 关闭原订单不应作为已入账支出匹配`);

}

function format(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value).toFixed(2)]));
}

function assertMoney(actual, expected, label) {
  assert.equal(Math.round(actual * 100), Math.round(expected * 100), `${label}不一致`);
}

function pick(row, names) {
  for (const name of names) {
    const entry = Object.entries(row).find(([key]) => key.trim().toLowerCase() === name.toLowerCase());
    if (entry && String(entry[1] ?? "").trim()) {
      return String(entry[1]).trim();
    }
  }
  return "";
}

function parseAmount(value) {
  const match = /[-+]?\d+(\.\d+)?/.exec(String(value).replace(/[,，\s¥￥]/g, ""));
  return match ? Number(match[0]) : 0;
}
