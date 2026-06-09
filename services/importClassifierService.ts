import { getCategories } from "@/services/categoryService";
import {
  listClassificationRuleDTOs,
  markClassificationRuleHit
} from "@/services/classificationKnowledgeService";
import type { CategoryDTO, ImportRecordDraftDTO } from "@/types/models";

export interface ClassificationResult {
  categoryId?: string;
  confidence: number;
  matchedKeyword?: string;
}

export async function classifyImportedRecord(
  draft: ImportRecordDraftDTO
): Promise<ClassificationResult> {
  const [categories, rules] = await Promise.all([getCategories(draft.type), listClassificationRuleDTOs()]);
  return classifyImportedRecordWithContext(draft, categories, rules);
}

export async function createImportClassifier() {
  const [expenseCategories, incomeCategories, rules] = await Promise.all([
    getCategories("expense"),
    getCategories("income"),
    listClassificationRuleDTOs()
  ]);

  return (draft: ImportRecordDraftDTO): Promise<ClassificationResult> =>
    classifyImportedRecordWithContext(
      draft,
      draft.type === "income" ? incomeCategories : expenseCategories,
      rules
    );
}

async function classifyImportedRecordWithContext(
  draft: ImportRecordDraftDTO,
  categories: Awaited<ReturnType<typeof getCategories>>,
  rules: Awaited<ReturnType<typeof listClassificationRuleDTOs>>
): Promise<ClassificationResult> {
  const texts = draft.classificationTexts?.length
    ? draft.classificationTexts
    : [draft.merchantName, draft.note, ...Object.values(draft.raw).map((value) => String(value ?? ""))];

  for (const textValue of texts.filter((value): value is string => Boolean(value))) {
    const text = textValue.toLowerCase();

    for (const rule of rules) {
      const category = categories.find((item) => item.id === rule.categoryId);
      if (!category) {
        continue;
      }

      const keyword = rule.keyword.toLowerCase();
      const matched = rule.matchType === "exact" ? text === keyword : text.includes(keyword);
      if (!matched) {
        continue;
      }

      await markClassificationRuleHit(rule);

      return {
        categoryId: rule.categoryId,
        confidence: rule.source === "user" ? 0.98 : Math.min(0.94, 0.55 + rule.priority / 2000),
        matchedKeyword: rule.keyword
      };
    }
  }

  const fallback = classifyBankGenericRecord(draft, categories);
  if (fallback) {
    return fallback;
  }

  const paymentFallback = classifyPaymentGenericRecord(draft, categories);
  if (paymentFallback) {
    return paymentFallback;
  }

  return {
    categoryId: categories.find((item) => item.name.includes("其他"))?.id ?? categories[0]?.id,
    confidence: 0.28
  };
}

function classifyPaymentGenericRecord(
  draft: ImportRecordDraftDTO,
  categories: CategoryDTO[]
): ClassificationResult | null {
  if (draft.provider !== "wechat" && draft.provider !== "alipay") {
    return null;
  }

  const rawText = [draft.merchantName, draft.note, ...Object.values(draft.raw).map((value) => String(value ?? ""))]
    .join(" ")
    .toLowerCase();

  if (draft.type === "income") {
    if (containsAny(rawText, ["退款", "退货", "退费", "返还", "退回", "冲正", "售后"])) {
      return {
        categoryId: findCategoryId(categories, ["退款", "其他"]),
        confidence: 0.78,
        matchedKeyword: `${draft.provider}-refund-generic`
      };
    }

    if (containsAny(rawText, ["收款", "转账", "群收款", "aa收款", "二维码收款", "面对面收款", "提现到账", "到账"])) {
      return {
        categoryId: findCategoryId(categories, ["收款", "红包", "其他"]),
        confidence: 0.72,
        matchedKeyword: `${draft.provider}-collection-generic`
      };
    }

    if (containsAny(rawText, ["余额宝", "零钱通", "理财", "基金", "收益", "利息", "转出到余额"])) {
      return {
        categoryId: findCategoryId(categories, ["投资", "其他"]),
        confidence: 0.72,
        matchedKeyword: `${draft.provider}-investment-generic`
      };
    }

    return {
      categoryId: findCategoryId(categories, ["其他"]),
      confidence: 0.66,
      matchedKeyword: `${draft.provider}-income-default`
    };
  }

  if (containsAny(rawText, ["花呗", "白条", "借呗", "金条", "月付", "主动还款", "账单还款", "信用卡还款", "信用借还"])) {
    return {
      categoryId: findCategoryId(categories, ["金融", "其他"]),
      confidence: 0.8,
      matchedKeyword: `${draft.provider}-credit-repayment-generic`
    };
  }

  if (containsAny(rawText, ["自动续费", "连续包月", "连续包年", "会员", "订阅", "codex", "云服务", "网盘", "wps", "视频会员"])) {
    return {
      categoryId: findCategoryId(categories, ["通讯订阅", "娱乐", "其他"]),
      confidence: 0.78,
      matchedKeyword: `${draft.provider}-subscription-generic`
    };
  }

  if (containsAny(rawText, ["日用百货", "生活用品", "便利店", "超市", "百货", "商场", "淘宝", "天猫", "京东", "拼多多", "抖音"])) {
    return {
      categoryId: findCategoryId(categories, ["购物", "其他"]),
      confidence: 0.74,
      matchedKeyword: `${draft.provider}-shopping-generic`
    };
  }

  if (containsAny(rawText, ["转账", "红包", "亲友", "朋友", "个人收款", "群收款"])) {
    return {
      categoryId: findCategoryId(categories, ["社交", "其他"]),
      confidence: 0.7,
      matchedKeyword: `${draft.provider}-transfer-generic`
    };
  }

  if (containsAny(rawText, ["消费", "付款", "支付", "扫码", "二维码", "商户", "订单", "代付", "缴费"])) {
    return {
      categoryId: findCategoryId(categories, ["其他", "购物"]),
      confidence: 0.67,
      matchedKeyword: `${draft.provider}-expense-default`
    };
  }

  return {
    categoryId: findCategoryId(categories, ["其他"]),
    confidence: 0.66,
    matchedKeyword: `${draft.provider}-expense-default-other`
  };
}

function classifyBankGenericRecord(
  draft: ImportRecordDraftDTO,
  categories: CategoryDTO[]
): ClassificationResult | null {
  if (draft.provider !== "bank") {
    return null;
  }

  const rawText = [draft.merchantName, draft.note, ...Object.values(draft.raw).map((value) => String(value ?? ""))]
    .join(" ")
    .toLowerCase();

  if (draft.type === "income") {
    if (containsAny(rawText, ["代付", "银联入账", "转存", "转入", "提现", "入账", "结息", "收款"])) {
      return {
        categoryId: findCategoryId(categories, ["其他", "投资", "红包"]),
        confidence: 0.72,
        matchedKeyword: "bank-income-generic"
      };
    }
  }

  if (containsAny(rawText, ["微信支付", "支付宝", "快捷支付", "银联", "无卡自助消费", "转支", "消费", "网上支付", "电子商务"])) {
    return {
      categoryId: findCategoryId(categories, ["其他", "购物"]),
      confidence: 0.72,
      matchedKeyword: "bank-expense-generic"
    };
  }

  return {
    categoryId: findCategoryId(categories, ["其他"]),
    confidence: 0.68,
    matchedKeyword: "bank-default-other"
  };
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function findCategoryId(categories: CategoryDTO[], names: string[]): string | undefined {
  for (const name of names) {
    const category = categories.find((item) => item.name.includes(name));
    if (category) {
      return category.id;
    }
  }

  return categories[0]?.id;
}
