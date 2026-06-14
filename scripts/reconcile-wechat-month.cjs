const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
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
  .find((name) => name.startsWith("微信支付账单流水文件") && name.endsWith(".xlsx"));

if (!fileName) {
  throw new Error("未找到微信 XLSX 样例");
}

const buffer = fs.readFileSync(path.join(sampleDir, fileName));
const content = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const rows = parseImportRows("xlsx", content).filter((row) => pick(row, ["交易时间"]).startsWith("2026-05"));
const kindTotals = emptyTotals();
const directionTotals = emptyTotals();
const statusCounts = {};
const kindRows = { expense: [], ignore: [], income: [], refund: [], transfer: [] };
const matchRows = [];

for (const row of rows) {
  const amount = Math.abs(parseAmount(pick(row, ["金额", "金额(元)", "交易金额"])));
  const direction = pick(row, ["收/支", "收支"]);
  const status = pick(row, ["当前状态", "交易状态", "状态"]);
  const typeText = pick(row, ["交易类型", "交易分类", "交易摘要", "类型"]);
  const productText = pick(row, ["商品", "商品说明", "商品名称"]);
  const result = classifyImportTransaction({
    directionText: direction,
    productText,
    provider: "wechat",
    rowText: Object.values(row).join(" "),
    signedAmount: direction === "支出" ? -amount : amount,
    statusText: status,
    typeText
  });

  kindTotals[result.kind] += amount;
  if (direction === "支出") directionTotals.expense += amount;
  else if (direction === "收入") directionTotals.income += amount;
  else directionTotals.ignore += amount;
  statusCounts[status || "(空)"] = (statusCounts[status || "(空)"] ?? 0) + 1;
  kindRows[result.kind].push({
    amount,
    date: pick(row, ["交易时间"]),
    direction,
    merchant: pick(row, ["交易对方"]),
    product: productText,
    reason: result.reason,
    status,
    typeText
  });
  matchRows.push({
    amountCents: Math.round(amount * 100),
    externalTradeNo: pick(row, ["交易单号", "交易号", "交易订单号"]),
    kind: result.kind,
    merchantName: pick(row, ["交易对方"]),
    merchantOrderNo: pick(row, ["商户单号", "商家订单号", "商户订单号"]),
    note: `${typeText} ${productText} ${pick(row, ["交易对方"])}`,
    provider: "wechat",
    recordDate: pick(row, ["交易时间"]).slice(0, 10)
  });
}

console.log(`文件: ${fileName}`);
console.log(`2026-05 行数: ${rows.length}`);
console.log("微信原始收/支合计:", formatTotals(directionTotals));
console.log("五类规则合计:", formatTotals(kindTotals));
console.log("交易状态:", statusCounts);
assertMoney(directionTotals.expense, 6032.89, "微信截图支出");
assertMoney(directionTotals.income, 3696.4, "微信截图收入");
assertMoney(kindTotals.expense, 6032.89, "系统原始支出");
assertMoney(kindTotals.income + kindTotals.refund, 3696.4, "系统收入加退款");
assertMoney(kindTotals.transfer, directionTotals.ignore, "内部调换");
assertMoney(
  kindTotals.income - (kindTotals.expense - kindTotals.refund),
  directionTotals.income - directionTotals.expense,
  "收支余额"
);
const expenses = matchRows.filter((row) => row.kind === "expense");
const refunds = matchRows.filter((row) => row.kind === "refund");
const matchedRefunds = refunds.filter((refund) => findRefundSourceCandidate(refund, expenses));
assert.equal(matchedRefunds.length, refunds.length, `退款匹配失败 ${refunds.length - matchedRefunds.length} 笔`);
console.log(`退款原消费匹配: ${matchedRefunds.length}/${refunds.length}`);
console.log("2026-05 微信截图与系统五类口径对账通过。");

if (process.argv.includes("--details")) {
  for (const kind of ["transfer", "refund", "ignore", "income"]) {
    console.log(`\n${kind} 金额最高的 30 笔:`);
    console.table(kindRows[kind].sort((a, b) => b.amount - a.amount).slice(0, 30));
  }
}

function emptyTotals() {
  return { expense: 0, ignore: 0, income: 0, refund: 0, transfer: 0 };
}

function formatTotals(totals) {
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.toFixed(2)]));
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

function assertMoney(actual, expected, label) {
  assert.equal(Math.round(actual * 100), Math.round(expected * 100), `${label}不一致`);
}
