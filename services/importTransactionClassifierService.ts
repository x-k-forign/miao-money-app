import type { ImportProvider, ImportTransactionKind, RecordType } from "@/types/models";

export interface ImportTransactionClassificationInput {
  directionText: string;
  productText?: string;
  provider: ImportProvider;
  rowText: string;
  signedAmount: number;
  statusText: string;
  typeText: string;
}

export interface ImportTransactionClassification {
  kind: ImportTransactionKind;
  ledgerType: RecordType;
  reason: string;
}

const IGNORE_STATUS_KEYWORDS = [
  "交易关闭",
  "已关闭",
  "支付失败",
  "已取消",
  "解冻成功",
  "芝麻免押下单成功",
  "预授权"
];

const REFUND_KEYWORDS = ["退款成功", "已全额退款", "已退款", "退款-", "退款－", "退款"];

const WECHAT_TRANSFER_KEYWORDS = [
  "转入零钱通-来自零钱",
  "转入零钱通－来自零钱",
  "转入零钱通-来自银行卡",
  "转入零钱通－来自银行卡",
  "零钱转入零钱通",
  "微信零钱转入零钱通",
  "零钱通转出-到零钱",
  "零钱通转出－到零钱",
  "零钱通转出-到银行卡",
  "零钱通转出－到银行卡",
  "零钱通转出到零钱",
  "零钱通转出到银行卡",
  "零钱通转入微信零钱",
  "零钱提现",
  "零钱充值",
  "信用卡还款",
  "理财通购买",
  "理财通赎回"
];

const ALIPAY_TRANSFER_KEYWORDS = [
  "账户存取",
  "投资理财",
  "余额宝-自动转入",
  "余额宝－自动转入",
  "余额宝-转出到余额",
  "余额宝－转出到余额",
  "余额转入余额宝",
  "转入余额宝",
  "余额宝转出",
  "提现-实时提现",
  "提现－实时提现",
  "充值到余额",
  "花呗主动还款",
  "信用借还",
  "信用卡还款"
];

const WECHAT_EXPENSE_KEYWORDS = [
  "商户消费",
  "扫二维码付款",
  "二维码付款",
  "外卖",
  "打车",
  "交通",
  "购物",
  "话费",
  "打印",
  "充电",
  "12306",
  "付款",
  "消费"
];

const WECHAT_INCOME_KEYWORDS = ["群收款", "二维码收款", "别人转账给我", "转账给我", "别人发红包给我", "红包收入"];

const ALIPAY_EXPENSE_CATEGORIES = [
  "餐饮美食",
  "交通出行",
  "日用百货",
  "教育培训",
  "文化休闲",
  "充值缴费",
  "酒店旅游",
  "生活服务",
  "商业服务",
  "爱车养车"
];

export function classifyImportTransaction(
  input: ImportTransactionClassificationInput
): ImportTransactionClassification {
  const direction = normalizeText(input.directionText);
  const status = normalizeText(input.statusText);
  const type = normalizeText(input.typeText);
  const product = normalizeText(input.productText ?? "");
  const fullText = normalizeText(`${input.typeText} ${input.productText ?? ""} ${input.rowText}`);

  if (isRefundTransaction(direction, input.statusText, type, product)) {
    return result("refund", "income", "退款状态或退款描述");
  }

  if (containsAny(status, IGNORE_STATUS_KEYWORDS) || containsAny(fullText, ["芝麻免押下单成功", "预授权"])) {
    return result("ignore", fallbackLedgerType(input.signedAmount), "无效、关闭或预授权交易");
  }

  if (input.provider === "wechat") {
    return classifyWechat(direction, fullText, input.signedAmount);
  }

  if (input.provider === "alipay") {
    return classifyAlipay(direction, status, type, product, fullText, input.signedAmount);
  }

  return result(
    input.signedAmount < 0 ? "expense" : "income",
    fallbackLedgerType(input.signedAmount),
    "金额符号兜底"
  );
}

function classifyWechat(
  direction: string,
  fullText: string,
  signedAmount: number
): ImportTransactionClassification {
  if (isWechatTransfer(fullText)) {
    return result("transfer", fallbackLedgerType(signedAmount), "微信零钱、理财或还款资金调换");
  }

  if (direction.includes("支出")) {
    return result("expense", "expense", "微信收支字段为支出");
  }

  if (direction.includes("收入") && containsAny(fullText, WECHAT_INCOME_KEYWORDS)) {
    return result("income", "income", "微信他人收款或红包");
  }

  if (containsAny(fullText, WECHAT_EXPENSE_KEYWORDS)) {
    return result("expense", "expense", "微信真实消费");
  }

  if (direction.includes("收入") && !isOwnAccountFlow(fullText)) {
    return result("income", "income", "微信收支字段为收入");
  }

  if (direction.includes("收入") || isOwnAccountFlow(fullText)) {
    return result("transfer", "income", "微信本人账户资金流转");
  }

  return result(signedAmount < 0 ? "expense" : "income", fallbackLedgerType(signedAmount), "微信金额符号兜底");
}

function isRefundTransaction(direction: string, rawStatus: string, type: string, product: string): boolean {
  const description = `${type}${product}`;
  const status = normalizeText(rawStatus);
  if (containsAny(description, REFUND_KEYWORDS)) {
    return true;
  }

  if (direction.includes("支出") && /已退款\s*[(（]/.test(rawStatus)) {
    return false;
  }

  if (direction.includes("支出") && status.includes("已全额退款")) {
    return false;
  }

  return containsAny(status, ["退款成功", "已全额退款", "已退款¥", "已退款￥"]);
}

function isWechatTransfer(fullText: string): boolean {
  return (
    containsAny(fullText, WECHAT_TRANSFER_KEYWORDS) ||
    fullText.includes(normalizeText("转入零钱通-来自")) ||
    fullText.includes(normalizeText("转入零钱通－来自")) ||
    fullText.includes(normalizeText("零钱通转出-到")) ||
    fullText.includes(normalizeText("零钱通转出－到"))
  );
}

function classifyAlipay(
  direction: string,
  status: string,
  type: string,
  product: string,
  fullText: string,
  signedAmount: number
): ImportTransactionClassification {
  if (isAlipayTransfer(type, product, fullText)) {
    return result("transfer", fallbackLedgerType(signedAmount), "支付宝余额、理财或还款资金调换");
  }

  if (containsAny(type, ALIPAY_EXPENSE_CATEGORIES) || containsAny(fullText, ALIPAY_EXPENSE_CATEGORIES)) {
    return result("expense", "expense", "支付宝真实消费分类");
  }

  if (direction.includes("支出") && isSuccessfulOrUnspecified(status)) {
    return result("expense", "expense", "支付宝成功支出");
  }

  if (direction.includes("收入") && !isOwnAccountFlow(fullText)) {
    return result("income", "income", "支付宝外部收入");
  }

  if (direction.includes("收入") || isOwnAccountFlow(fullText)) {
    return result("transfer", "income", "支付宝本人账户资金流转");
  }

  if (direction.includes("不计收支")) {
    return result("ignore", fallbackLedgerType(signedAmount), "支付宝不计收支且无有效业务命中");
  }

  return result(signedAmount < 0 ? "expense" : "income", fallbackLedgerType(signedAmount), "支付宝金额符号兜底");
}

function isAlipayTransfer(type: string, product: string, fullText: string): boolean {
  if (containsAny(`${type}${product}`, ALIPAY_TRANSFER_KEYWORDS)) {
    return true;
  }

  if (fullText.includes("转账收款到余额宝")) {
    return isOwnAccountFlow(fullText);
  }

  return false;
}

function isOwnAccountFlow(text: string): boolean {
  if (containsAny(text, ["别人转账", "朋友转账", "他人转账", "转账收款", "二维码收款", "群收款", "红包"])) {
    return false;
  }

  if (containsAny(text, [
    "本人账户",
    "本人银行卡",
    "自己的账户",
    "自己账户",
    "同名账户",
    "我的余额",
    "我的银行卡"
  ])) {
    return true;
  }

  return (
    containsAny(text, ["余额宝", "零钱通", "理财通", "银行卡", "余额", "零钱"]) &&
    containsAny(text, ["自动转入", "转入余额", "转出到", "充值到", "实时提现"])
  );
}

function isSuccessfulOrUnspecified(status: string): boolean {
  return (
    !status ||
    containsAny(status, ["交易成功", "支付成功", "代付成功", "已收钱", "已存入零钱", "提现已到账", "资金已到账"])
  );
}

function fallbackLedgerType(signedAmount: number): RecordType {
  return signedAmount < 0 ? "expense" : "income";
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[【】[\]()（）]/g, "");
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function result(
  kind: ImportTransactionKind,
  ledgerType: RecordType,
  reason: string
): ImportTransactionClassification {
  return { kind, ledgerType, reason };
}
