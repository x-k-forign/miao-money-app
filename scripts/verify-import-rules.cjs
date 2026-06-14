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

const cases = [
  ["wechat closed", "ignore", input("wechat", "支出", "商户消费", "交易关闭", "午餐")],
  ["wechat refund", "refund", input("wechat", "收入", "退款", "退款成功", "已全额退款")],
  ["wechat refunded expense remains expense", "expense", input("wechat", "支出", "商户消费", "已退款(¥45.29)", "特来电充值")],
  ["wechat transfer", "transfer", input("wechat", "支出", "信用卡还款", "交易成功", "信用卡还款")],
  ["wechat bank to lingqiantong", "transfer", input("wechat", "/", "转入零钱通-来自招商银行(7625)", "支付成功", "/")],
  ["wechat expense", "expense", input("wechat", "支出", "商户消费", "支付成功", "12306购票")],
  ["wechat outgoing group collection", "expense", input("wechat", "支出", "群收款", "支付成功", "群收款-转给同学")],
  ["wechat income", "income", input("wechat", "收入", "二维码收款", "已收钱", "别人转账给我")],
  ["alipay closed", "ignore", input("alipay", "不计收支", "生活服务", "解冻成功", "预授权解冻")],
  ["alipay refund", "refund", input("alipay", "不计收支", "退款", "退款成功", "退款-订单")],
  ["alipay transfer", "transfer", input("alipay", "支出", "信用借还", "交易成功", "花呗主动还款")],
  ["alipay expense", "expense", input("alipay", "支出", "餐饮美食", "交易成功", "花呗付款")],
  ["alipay income", "income", input("alipay", "收入", "转账收款", "资金已到账", "朋友转账")]
];

for (const [name, expected, value] of cases) {
  const actual = classifyImportTransaction(value).kind;
  assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`);
}

console.log(`规则用例通过: ${cases.length}/${cases.length}`);
verifyRealSamples();

function input(provider, directionText, typeText, statusText, productText) {
  return {
    directionText,
    productText,
    provider,
    rowText: `${directionText} ${typeText} ${statusText} ${productText}`,
    signedAmount: directionText === "支出" ? -10 : 10,
    statusText,
    typeText
  };
}

function verifyRealSamples() {
  const sampleDir = "F:\\cpmputer_jobs\\Codex_Project\\money_project_file";
  if (!fs.existsSync(sampleDir)) {
    console.log("真实样例目录不存在，跳过样例分布检查。");
    return;
  }

  const files = fs.readdirSync(sampleDir);
  const targets = [
    { provider: "wechat", type: "xlsx", name: files.find((name) => name.startsWith("微信支付账单流水文件") && name.endsWith(".xlsx")) },
    { provider: "alipay", type: "csv", name: files.find((name) => name.startsWith("支付宝交易明细") && name.endsWith(".csv")) }
  ];

  for (const target of targets) {
    if (!target.name) {
      console.log(`${target.provider}: 未找到真实样例，跳过。`);
      continue;
    }

    const buffer = fs.readFileSync(path.join(sampleDir, target.name));
    const content = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const rows = parseImportRows(target.type, content);
    const counts = { expense: 0, ignore: 0, income: 0, refund: 0, transfer: 0 };

    for (const row of rows) {
      const amount = parseAmount(pick(row, ["金额", "金额(元)", "交易金额"]));
      const classification = classifyImportTransaction({
        directionText: pick(row, ["收/支", "收支"]),
        productText: pick(row, ["商品", "商品说明", "商品名称"]),
        provider: target.provider,
        rowText: Object.values(row).join(" "),
        signedAmount: amount,
        statusText: pick(row, ["当前状态", "交易状态", "状态"]),
        typeText: pick(row, ["交易类型", "交易分类", "交易摘要", "类型"])
      });
      counts[classification.kind] += 1;
    }

    assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), rows.length);
    console.log(`${target.provider}: ${rows.length} 行`, counts);
  }
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
