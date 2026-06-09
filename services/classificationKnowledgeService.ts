import { Platform } from "react-native";
import { getCategories } from "@/services/categoryService";
import type { ClassificationRuleDTO, ClassificationRuleSource } from "@/types/models";
import { createLocalId } from "@/utils/id";

export interface LearnClassificationRuleInput {
  categoryId: string;
  keyword: string;
}

const memoryUserRules: ClassificationRuleDTO[] = [];

export async function ensureClassificationRulesSeeded(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const categories = await getCategories();
  const { upsertClassificationRule } = await import("@/db/queries/classificationRules");

  for (const seed of defaultClassificationRuleSeeds) {
    const category = categories.find((item) => item.kind === seed.type && item.name === seed.categoryName);
    if (!category) {
      continue;
    }

    for (const keyword of seed.keywords) {
      await upsertClassificationRule({
        id: createLocalId("rule"),
        keyword,
        matchType: "contains",
        categoryId: category.id,
        source: "system",
        priority: seed.priority
      });
    }
  }
}

export async function learnClassificationRule(input: LearnClassificationRuleInput): Promise<void> {
  const keyword = normalizeKeyword(input.keyword);
  if (!keyword) {
    return;
  }

  if (Platform.OS === "web") {
    const existing = memoryUserRules.find(
      (rule) => rule.keyword === keyword && rule.categoryId === input.categoryId && rule.source === "user"
    );
    if (existing) {
      existing.hitCount += 1;
      existing.lastHitAt = new Date().toISOString();
      return;
    }

    memoryUserRules.unshift({
      categoryId: input.categoryId,
      hitCount: 0,
      id: createLocalId("rule"),
      keyword,
      lastHitAt: null,
      matchType: "contains",
      priority: 1000,
      source: "user"
    });
    return;
  }

  const { upsertClassificationRule } = await import("@/db/queries/classificationRules");
  await upsertClassificationRule({
    id: createLocalId("rule"),
    keyword,
    matchType: "contains",
    categoryId: input.categoryId,
    source: "user",
    priority: 1000
  });
}

export async function listClassificationRuleDTOs(): Promise<ClassificationRuleDTO[]> {
  if (Platform.OS === "web") {
    const categories = await getCategories();
    const systemRules = defaultClassificationRuleSeeds.flatMap((seed) => {
      const category = categories.find((item) => item.kind === seed.type && item.name === seed.categoryName);
      if (!category) {
        return [];
      }

      return seed.keywords.map<ClassificationRuleDTO>((keyword) => ({
        categoryId: category.id,
        hitCount: 0,
        id: `system-${seed.type}-${seed.categoryName}-${keyword}`,
        keyword,
        lastHitAt: null,
        matchType: "contains",
        priority: seed.priority,
        source: "system"
      }));
    });

    return [...memoryUserRules, ...systemRules].sort(compareRules);
  }

  await ensureClassificationRulesSeeded();
  const { listClassificationRules } = await import("@/db/queries/classificationRules");
  const rules = await listClassificationRules();

  return rules
    .map((rule) => ({
      categoryId: rule.categoryId,
      hitCount: rule.hitCount,
      id: rule.id,
      keyword: rule.keyword,
      lastHitAt: rule.lastHitAt,
      matchType: rule.matchType,
      priority: rule.priority,
      source: rule.source
    }))
    .sort(compareRules);
}

export async function markClassificationRuleHit(rule: ClassificationRuleDTO): Promise<void> {
  if (Platform.OS === "web") {
    const target = memoryUserRules.find((item) => item.id === rule.id);
    if (target) {
      target.hitCount += 1;
      target.lastHitAt = new Date().toISOString();
    }
    return;
  }

  if (rule.source === "system" || rule.source === "user") {
    const { markClassificationRuleHit } = await import("@/db/queries/classificationRules");
    await markClassificationRuleHit(rule.id);
  }
}

function normalizeKeyword(value: string): string {
  return value.trim().slice(0, 40);
}

function compareRules(a: ClassificationRuleDTO, b: ClassificationRuleDTO): number {
  if (a.source !== b.source) {
    return a.source === "user" ? -1 : 1;
  }

  return b.priority - a.priority || b.hitCount - a.hitCount;
}

type ClassificationRuleSeed = {
  categoryName: string;
  keywords: string[];
  priority: number;
  type: "income" | "expense";
};

const baseClassificationRuleSeeds = [
  {
    categoryName: "餐饮",
    keywords: [
      "美团", "大众点评", "饿了么", "口碑", "外卖", "餐饮", "早餐", "午餐", "晚餐", "夜宵", "饭店", "餐厅", "食堂", "小吃", "面馆", "粉面", "米粉", "拉面", "兰州拉面", "沙县", "黄焖鸡", "麻辣烫", "冒菜", "火锅", "串串", "烧烤", "烤肉", "炸鸡", "汉堡", "披萨", "寿司", "烘焙", "面包", "蛋糕", "甜品", "咖啡", "星巴克", "瑞幸", "库迪", "奶茶", "喜茶", "奈雪", "茶百道", "一点点", "蜜雪", "古茗", "沪上阿姨", "麦当劳", "肯德基", "必胜客", "德克士", "华莱士", "海底捞", "呷哺", "霸王茶姬"
    ],
    priority: 760,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "淘宝", "天猫", "京东", "拼多多", "唯品会", "得物", "小红书", "抖音商城", "快手小店", "闲鱼", "苏宁", "国美", "亚马逊", "当当", "1688", "盒马非餐", "山姆", "costco", "宜家", "名创优品", "无印良品", "优衣库", "zara", "hm", "耐克", "阿迪", "李宁", "安踏", "特步", "衣服", "服饰", "鞋", "箱包", "饰品", "数码", "手机", "电脑", "家电", "百货", "超市购物", "商场", "专柜"
    ],
    priority: 700,
    type: "expense"
  },
  {
    categoryName: "交通",
    keywords: [
      "地铁", "公交", "轨道交通", "一卡通", "交通卡", "公交卡", "羊城通", "深圳通", "八达通", "高德打车", "滴滴", "曹操出行", "t3出行", "花小猪", "享道", "首汽约车", "出租车", "打车", "网约车", "顺风车", "火车票", "高铁", "动车", "12306", "车票", "汽车票", "客运", "轮渡", "机场大巴", "停车场出行", "百度用车", "百度用车费用"
    ],
    priority: 720,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "健身", "健身房", "私教", "瑜伽", "普拉提", "舞蹈课", "游泳", "羽毛球", "乒乓球", "篮球", "足球", "网球", "台球", "滑雪", "滑冰", "骑行", "跑步", "keep", "乐刻", "超级猩猩", "威尔仕", "一兆韦德", "运动馆", "体育馆", "球馆", "运动装备"
    ],
    priority: 650,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "游戏", "手游", "网游", "steam", "switch", "playstation", "xbox", "王者荣耀", "和平精英", "原神", "网易游戏", "腾讯游戏", "米哈游", "棋牌", "剧本杀", "密室", "ktv", "酒吧", "livehouse", "演唱会", "展览", "漫展", "门票", "票务", "大麦", "猫眼演出", "摩天轮票务", "网易云音乐", "qq音乐", "酷狗", "酷我", "腾讯视频", "爱奇艺", "优酷", "芒果tv", "哔哩哔哩", "bilibili", "喜马拉雅", "会员续费"
    ],
    priority: 660,
    type: "expense"
  },
  {
    categoryName: "通讯订阅",
    keywords: [
      "中国移动", "移动话费", "中国联通", "联通话费", "中国电信", "电信话费", "话费", "流量", "宽带", "固话", "手机号", "通信", "通讯费", "5g套餐", "校园卡", "腾讯王卡", "阿里宝卡", "米粉卡"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "居家",
    keywords: [
      "房租", "租金", "租房", "公寓", "自如", "贝壳租房", "链家", "我爱我家", "物业", "物业费", "水费", "电费", "燃气", "天然气", "暖气", "取暖费", "供暖", "宽带安装", "家政", "保洁", "搬家", "货拉拉搬家", "维修基金", "停车位租金"
    ],
    priority: 710,
    type: "expense"
  },
  {
    categoryName: "家庭宠物",
    keywords: [
      "幼儿园", "托育", "早教", "儿童", "宝宝", "婴儿", "奶粉", "尿不湿", "纸尿裤", "童装", "童鞋", "玩具", "绘本", "儿童乐园", "游乐场", "亲子", "母婴", "孩子培训", "少儿英语", "儿童摄影", "疫苗", "儿科"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "旅行",
    keywords: [
      "携程", "飞猪", "去哪儿", "同程", "马蜂窝", "途牛", "酒店", "民宿", "宾馆", "客栈", "airbnb", "booking", "机票", "航班", "航空", "南航", "国航", "东航", "海航", "春秋航空", "机场", "签证", "护照", "景区", "门票", "旅游", "旅行", "度假", "露营", "营地", "温泉", "邮轮"
    ],
    priority: 670,
    type: "expense"
  },
  {
    categoryName: "汽车",
    keywords: [
      "加油", "油费", "中石化", "中石油", "壳牌", "高速费", "etc", "停车", "停车费", "洗车", "保养", "维修保养", "4s店", "车险", "保险公司车险", "违章", "罚款", "年检", "充电桩", "特来电", "星星充电", "蔚来充电", "小鹏充电", "汽车用品", "轮胎", "补胎", "代驾"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "医疗",
    keywords: [
      "医院", "门诊", "挂号", "急诊", "住院", "体检", "药店", "药房", "买药", "处方", "医保", "牙科", "口腔", "眼科", "中医", "诊所", "康复", "疫苗", "核酸", "检查费", "ct", "b超", "验血", "美年大健康", "爱康国宾", "叮当快药", "阿里健康", "京东健康", "平安好医生", "鼻炎喷雾剂", "鼻炎药", "通鼻喷", "过敏性鼻炎"
    ],
    priority: 720,
    type: "expense"
  },
  {
    categoryName: "学习办公",
    keywords: [
      "学费", "培训", "课程", "网课", "补习", "家教", "考试", "报名费", "教材", "图书", "书店", "当当图书", "得到", "樊登", "混沌学园", "极客时间", "慕课", "网易云课堂", "腾讯课堂", "新东方", "学而思", "猿辅导", "作业帮", "驾校", "驾考", "证书", "考证"
    ],
    priority: 670,
    type: "expense"
  },
  {
    categoryName: "家庭宠物",
    keywords: [
      "宠物", "猫粮", "狗粮", "猫砂", "宠物医院", "宠物店", "兽医", "疫苗宠物", "驱虫", "宠物美容", "宠物寄养", "猫窝", "狗窝", "宠物用品", "猫玩具", "狗玩具", "宠物保险"
    ],
    priority: 640,
    type: "expense"
  },
  {
    categoryName: "社交",
    keywords: [
      "礼金", "份子钱", "随礼", "红包支出", "结婚", "婚礼", "满月酒", "生日礼物", "节日礼物", "礼品", "礼物", "慰问", "人情", "拜年", "压岁钱", "捐款", "公益", "慈善"
    ],
    priority: 640,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "维修", "修理", "家电维修", "手机维修", "电脑维修", "开锁", "换锁", "管道疏通", "空调清洗", "空调维修", "水电维修", "补漏", "防水", "换屏", "配件", "售后维修", "师傅上门"
    ],
    priority: 640,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "快递", "运费", "邮费", "寄件", "顺丰", "京东快递", "中通", "圆通", "申通", "韵达", "邮政", "ems", "德邦", "极兔", "菜鸟", "丰巢", "闪送", "达达", "同城配送", "跑腿"
    ],
    priority: 650,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "电影", "影院", "影城", "电影院", "万达影城", "cgv", "金逸影城", "博纳影城", "横店电影", "中影", "猫眼电影", "淘票票", "电影票", "imax", "点映"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "日用品", "生活用品", "纸巾", "抽纸", "洗衣液", "洗发水", "沐浴露", "牙膏", "牙刷", "洗洁精", "清洁", "消毒", "收纳", "厨房用品", "锅具", "餐具", "家居", "床品", "家纺", "五金", "便利店", "711", "全家", "罗森", "便利蜂", "屈臣氏", "万宁", "名创优品日用"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "化妆品", "护肤", "彩妆", "美妆", "口红", "粉底", "面膜", "精华", "乳液", "防晒", "香水", "美容", "美甲", "美发", "理发", "洗剪吹", "染发", "烫发", "丝芙兰", "sephora", "完美日记", "花西子", "欧莱雅", "雅诗兰黛", "兰蔻", "资生堂", "sk-ii"
    ],
    priority: 670,
    type: "expense"
  },
  {
    categoryName: "其他",
    keywords: [
      "手续费", "服务费", "平台服务", "管理费", "年费", "工本费", "证件费", "罚金", "罚款", "扣费", "自动扣款", "其他消费", "未知商户", "个人收款", "商户收款"
    ],
    priority: 420,
    type: "expense"
  },
  {
    categoryName: "工资",
    keywords: [
      "工资", "薪资", "薪水", "薪酬", "代发工资", "工资代发", "工资发放", "基本工资", "绩效工资", "劳务工资", "工资收入", "公司发薪", " payroll", "salary", "wages"
    ],
    priority: 760,
    type: "income"
  },
  {
    categoryName: "兼职",
    keywords: [
      "兼职", "副业", "劳务费", "稿费", "咨询费", "服务费收入", "佣金收入", "接单", "外包", "自由职业", "临时工", "小时工", "家教收入", "代练收入", "跑腿收入"
    ],
    priority: 710,
    type: "income"
  },
  {
    categoryName: "奖金",
    keywords: [
      "奖金", "绩效", "年终奖", "季度奖", "项目奖", "提成", "分红", "补贴", "津贴", "报销", "差旅报销", "餐补", "交通补贴", "高温补贴", "住房补贴", "奖励"
    ],
    priority: 720,
    type: "income"
  },
  {
    categoryName: "红包",
    keywords: [
      "红包", "微信红包", "支付宝红包", "转账收款", "亲友转账", "收款", "礼金收入", "压岁钱收入", "新年红包", "生日红包"
    ],
    priority: 690,
    type: "income"
  },
  {
    categoryName: "投资",
    keywords: [
      "投资", "理财", "基金", "股票", "债券", "股息", "分红收入", "利息", "银行利息", "余额宝", "零钱通", "定期收益", "理财收益", "基金赎回", "证券", "券商", "国债", "收益发放"
    ],
    priority: 700,
    type: "income"
  },
  {
    categoryName: "退款",
    keywords: [
      "退款", "退货", "退费", "返还", "返款", "冲正", "撤销交易", "订单退款", "售后退款", "押金退还", "保证金退还", "医保报销", "保险理赔", "退票", "退款成功"
    ],
    priority: 730,
    type: "income"
  },
  {
    categoryName: "其他",
    keywords: [
      "其他收入", "收款到账", "入账", "来账", "转入", "存入", "结算款", "商户结算", "平台结算", "提现到账", "余额提现", "银行卡转入"
    ],
    priority: 430,
    type: "income"
  }
] as const satisfies ClassificationRuleSeed[];

const expandedClassificationRuleSeeds = [
  {
    categoryName: "餐饮",
    keywords: [
      "盒马", "叮咚买菜", "美团买菜", "每日优鲜", "朴朴超市", "钱大妈", "生鲜", "菜市场", "农贸市场", "水果店", "水果", "鲜丰水果", "百果园", "零食", "良品铺子", "三只松鼠", "来伊份", "锅圈", "正新鸡排", "绝味", "周黑鸭", "紫燕百味鸡", "老乡鸡", "乡村基", "真功夫", "永和大王", "喜家德", "袁记云饺", "达美乐", "汉堡王", "塔斯汀", "茶颜悦色", "书亦烧仙草", "益禾堂", "CoCo", "快乐柠檬", "便利蜂餐食", "罗森便当", "全家便当"
    ],
    priority: 755,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "抖店", "快手订单", "微信小店", "微店", "有赞", "转转", "寺库", "识货", "蘑菇街", "考拉海购", "网易严选", "小米商城", "华为商城", "苹果官网", "Apple Store", "戴尔", "联想", "小熊电器", "九阳", "苏泊尔", "美的", "格力", "海尔", "奥特莱斯", "百盛", "银泰", "万象城", "大悦城", "吾悦广场", "龙湖天街", "永辉超市", "沃尔玛", "家乐福", "大润发", "华润万家", "物美", "永旺", "奥乐齐", "ALDI"
    ],
    priority: 695,
    type: "expense"
  },
  {
    categoryName: "交通",
    keywords: [
      "哈啰", "青桔", "美团单车", "共享单车", "共享电动车", "公交地铁", "乘车码", "云闪付乘车", "支付宝乘车", "微信乘车", "巴士", "班车", "城际", "铁路", "火车", "候补车票", "改签", "退票手续费", "携程火车", "智行火车", "同程车票", "滴滴出行", "滴滴快车", "滴滴专车", "神州专车", "如祺出行", "嘀嗒出行", "顺风出行", "e代驾交通", "客运站"
    ],
    priority: 715,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "健身卡", "月卡", "年卡", "团课", "拳击", "搏击", "攀岩", "桨板", "飞盘", "高尔夫", "射箭", "轮滑", "台球厅", "保龄球", "蹦床", "马拉松", "赛事报名", "运动康复", "筋膜枪", "蛋白粉", "肌酸", "lululemon", "迪卡侬", "滔搏", "胜道体育"
    ],
    priority: 650,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "网吧", "电竞馆", "桌游", "电玩城", "游乐园", "水上乐园", "方特", "迪士尼", "环球影城", "欢乐谷", "海昌", "脱口秀", "相声", "话剧", "音乐节", "live", "club", "酒馆", "棋牌室", "麻将馆", "腾讯会员", "优酷会员", "芒果会员", "B站大会员", "百度网盘会员", "WPS会员", "夸克会员", "迅雷会员", "豆瓣", "小宇宙"
    ],
    priority: 655,
    type: "expense"
  },
  {
    categoryName: "通讯订阅",
    keywords: [
      "手机充值", "通信充值", "套餐费", "月租", "副卡", "亲情号", "宽带费", "路由器", "光猫", "广电网络", "中国广电", "电信营业厅", "移动营业厅", "联通营业厅", "话费充值", "流量包", "国际漫游", "短信费"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "居家",
    keywords: [
      "押金", "房屋押金", "中介费", "租赁", "房贷", "按揭", "公积金还款", "装修", "建材", "家具", "家居家装", "居然之家", "红星美凯龙", "欧派", "索菲亚", "全友", "顾家家居", "宜家家居", "马桶", "卫浴", "瓷砖", "地板", "灯具", "窗帘", "维修上门", "保姆", "月嫂", "钟点工"
    ],
    priority: 705,
    type: "expense"
  },
  {
    categoryName: "家庭宠物",
    keywords: [
      "学杂费", "校服", "文具孩子", "托班", "兴趣班", "钢琴课", "画画课", "舞蹈班", "跆拳道", "编程课", "乐高课", "研学", "夏令营", "冬令营", "儿童医院", "妇幼", "玩具反斗城", "孩子游泳", "儿童理发", "儿童牙科", "儿童保险"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "旅行",
    keywords: [
      "民航", "航旅纵横", "滴滴机场", "机场停车", "行李托运", "值机", "贵宾厅", "租车", "神州租车", "一嗨租车", "房车", "客房", "住宿", "青旅", "青年旅舍", "度假村", "旅行社", "跟团游", "自由行", "当地玩乐", "潜水", "滑翔伞", "旅拍", "纪念品"
    ],
    priority: 665,
    type: "expense"
  },
  {
    categoryName: "汽车",
    keywords: [
      "92号汽油", "95号汽油", "98号汽油", "油卡", "加油卡", "高速公路", "路桥费", "过路费", "拖车", "救援", "玻璃水", "机油", "车品", "行车记录仪", "车载", "车膜", "贴膜", "喷漆", "钣金", "汽车美容", "车位费", "月保", "临停", "充电服务费"
    ],
    priority: 688,
    type: "expense"
  },
  {
    categoryName: "医疗",
    keywords: [
      "医药", "西药", "中药", "处方药", "非处方药", "OTC", "感冒药", "消炎药", "牙医", "正畸", "洗牙", "拔牙", "配镜", "眼镜", "隐形眼镜", "助听器", "理疗", "按摩康复", "心理咨询", "宠物医疗除外", "社康", "卫生院", "妇幼保健", "药急送", "海王星辰", "老百姓大药房", "益丰大药房", "大参林"
    ],
    priority: 715,
    type: "expense"
  },
  {
    categoryName: "学习办公",
    keywords: [
      "知识星球", "得到课程", "小鹅通", "荔枝微课", "千聊", "B站课程", "Coursera", "Udemy", "多邻国", "扇贝", "百词斩", "墨墨背单词", "考研", "考公", "雅思", "托福", "GRE", "CPA", "法考", "软考", "教资", "教材费", "资料费", "论文", "打印学习", "复印学习"
    ],
    priority: 668,
    type: "expense"
  },
  {
    categoryName: "家庭宠物",
    keywords: [
      "猫罐头", "狗罐头", "猫条", "冻干", "宠物零食", "牵引绳", "宠物洗澡", "宠物疫苗", "绝育", "猫三联", "狂犬疫苗", "宠物体检", "宠物殡葬", "宠物摄影", "宠物乐园", "波奇", "E宠", "宠物家"
    ],
    priority: 640,
    type: "expense"
  },
  {
    categoryName: "社交",
    keywords: [
      "婚庆", "婚宴", "乔迁", "升学宴", "百日宴", "探病", "白事", "丧事", "帛金", "香典", "礼盒", "花店", "鲜花", "蛋糕礼物", "贺卡", "纪念日", "情人节礼物", "母亲节", "父亲节", "教师节"
    ],
    priority: 640,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "上门维修", "啄木鸟维修", "万师傅", "鲁班到家", "家修", "疏通下水道", "修空调", "修冰箱", "修洗衣机", "修热水器", "修手机", "修电脑", "修表", "修鞋", "改衣", "缝补", "锁具", "电工", "水管", "水龙头"
    ],
    priority: 638,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "快递费", "物流", "物流费", "配送费", "取件", "到付", "保价", "包装费", "驿站", "菜鸟驿站", "妈妈驿站", "京东物流", "跨越速运", "安能物流", "货运", "搬运费", "同城急送", "UU跑腿", "美团跑腿", "蜂鸟配送"
    ],
    priority: 650,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "影票", "观影", "电影卡", "爆米花", "影院卖品", "CGV影城", "万达电影", "金逸电影", "卢米埃", "百丽宫", "UME", "橙天嘉禾", "幸福蓝海", "保利影城", "华谊兄弟影院"
    ],
    priority: 688,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "生活缴费日用", "卫生纸", "卷纸", "湿巾", "洗手液", "肥皂", "香皂", "拖把", "扫把", "垃圾袋", "保鲜膜", "保鲜袋", "洗碗布", "毛巾", "浴巾", "衣架", "插线板", "电池", "灯泡", "雨伞", "杯子", "水杯", "保温杯", "剃须刀", "卫生巾", "护垫", "避孕套", "计生用品"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "洁面", "爽肤水", "化妆水", "眼霜", "面霜", "唇膏", "眉笔", "眼影", "腮红", "卸妆", "洗面奶", "美容院", "皮肤管理", "医美", "光子嫩肤", "水光针", "脱毛", "纹眉", "睫毛", "接发", "发膜", "护发", "染烫", "屈臣氏美妆", "橘朵", "毛戈平", "珀莱雅", "薇诺娜"
    ],
    priority: 670,
    type: "expense"
  },
  {
    categoryName: "其他",
    keywords: [
      "跨行手续费", "取现手续费", "账户管理费", "短信服务费", "滞纳金", "违约金", "补卡费", "挂失费", "认证费", "保证金", "押金支出", "预授权", "税费", "个人所得税", "印花税", "不明支出", "其他扣款", "银行扣款"
    ],
    priority: 420,
    type: "expense"
  },
  {
    categoryName: "工资",
    keywords: [
      "工资卡", "薪金", "月薪", "发薪", "工资条", "企业网银代发", "单位代发", "人事代发", "劳资", "工资补发", "工资差额", "薪酬发放", "薪资入账"
    ],
    priority: 755,
    type: "income"
  },
  {
    categoryName: "兼职",
    keywords: [
      "兼职收入", "劳务收入", "稿酬", "课酬", "讲课费", "翻译费", "设计费", "开发费", "剪辑费", "摄影费", "直播收入", "带货佣金", "平台佣金", "任务奖励", "众包收入"
    ],
    priority: 710,
    type: "income"
  },
  {
    categoryName: "奖金",
    keywords: [
      "绩效奖金", "项目奖金", "销售提成", "季度奖金", "年度奖金", "全勤奖", "优秀员工", "激励金", "竞赛奖金", "抽奖中奖", "中奖", "返利", "补助", "补发", "公司报销"
    ],
    priority: 720,
    type: "income"
  },
  {
    categoryName: "红包",
    keywords: [
      "收红包", "红包到账", "微信转账", "支付宝转账", "亲属转账", "朋友转账", "AA收款", "群收款", "面对面收款", "二维码收款", "赞赏", "打赏收入"
    ],
    priority: 690,
    type: "income"
  },
  {
    categoryName: "投资",
    keywords: [
      "现金分红", "基金分红", "股票分红", "债券利息", "存款利息", "定存利息", "货币基金", "理财赎回", "理财到期", "投资收益", "证券转入", "银证转账转入", "股票卖出", "基金卖出", "币息"
    ],
    priority: 700,
    type: "income"
  },
  {
    categoryName: "退款",
    keywords: [
      "原路退回", "退款入账", "退回银行卡", "退押金", "退保证金", "退订", "退租", "退差价", "价保退款", "运费险", "理赔到账", "报销到账", "退税", "个税退税", "航班退款", "酒店退款"
    ],
    priority: 730,
    type: "income"
  },
  {
    categoryName: "其他",
    keywords: [
      "他行转入", "本行转入", "普通转入", "实时转入", "收入入账", "收入到账", "款项到账", "尾款", "结清", "收回借款", "借款归还", "保证金收入", "押金收入", "补偿款", "赔付款"
    ],
    priority: 430,
    type: "income"
  }
] as const satisfies ClassificationRuleSeed[];

const sampleFileClassificationRuleSeeds = [
  {
    categoryName: "餐饮",
    keywords: [
      "龙岩学院合作食堂", "大众餐", "淘宝闪购", "麦记牛奶", "蜜雪冰城933870店", "烤茗堂港式拌面", "重庆鸡公煲", "东哥黄焖鸡", "街头牛排", "小哥瓦罐", "进哥大叔福鼎肉片", "Mickey米琪", "米琪星创意生日蛋糕", "极拉图冰淇淋与茶", "小萌茼学麻辣烫", "龙岩六意水果店", "金满华超市", "派仔巷里", "北京鸿易博", "龙岩市PIG森活", "美团App", "美团平台商户", "美团北京三快在线"
    ],
    priority: 780,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "淘宝平台商户", "淘宝平台", "小红书订单", "莱仕达", "pdhm踏板", "链动小铺", "卡券之家", "UP智能柜", "智能柜", "上海部恩科技", "上海钧丰网络科技", "商业服务", "日用百货"
    ],
    priority: 725,
    type: "expense"
  },
  {
    categoryName: "交通",
    keywords: [
      "哈啰骑行", "订单支付", "中铁网络", "12306消费", "福州地铁集团", "福州地铁", "龙岩学院校车", "校车", "花小猪打车", "花小猪10元代金券", "花小猪5元优惠券", "滴滴10元无门槛券", "滴滴3折拼车卷", "普拉斯专车", "拼车", "日程车", "team团队包车", "包车直达", "个人车日抛"
    ],
    priority: 735,
    type: "expense"
  },
  {
    categoryName: "娱乐",
    keywords: [
      "网易云音乐-会员自动续费", "PY市场", "虚拟物品购买", "p站会员", "会籍订阅代付", "小云雀订阅服务", "视频号", "内容破圈推流", "推流服务", "蝴蝶号", "上海宽娱", "宽娱", "厦门美图网科技", "深圳市脸萌科技", "脸萌科技", "美图网科技", "杭州乐读科技", "乐读科技"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "学习办公",
    keywords: [
      "数智云助学", "诚意1号公寓打印文件", "打印文件", "龙岩学院", "教育培训", "张宁炼8002", "带货主播话术", "直播卖货脚本", "直播间技巧", "话术大全", "新人新手直播", "代写服务"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "其他",
    keywords: [
      "微信零钱通", "零钱通", "零钱通转出", "零钱通转出-到农业银行", "零钱通转出-到招商银行", "转入零钱通", "已转入零钱通", "资金已到账", "微信支付-零钱通", "财付通", "信用借还", "花呗主动还款", "花呗还款", "美团月付还款", "京东白条", "白条还款", "金条业务", "京东金融京东白条", "网银在线", "账户存取", "提现-实时提现", "实时提现", "交易关闭", "不计收支"
    ],
    priority: 520,
    type: "expense"
  },
  {
    categoryName: "退款",
    keywords: [
      "美团平台商户-退款", "退款-普拉斯专车包", "退款-Team空位", "退款-花小猪", "退款-p站会员", "已全额退款", "退款成功", "交易关闭退款", "订单关闭退款", "支付宝退款", "微信退款", "商户退款", "平台退款"
    ],
    priority: 760,
    type: "income"
  },
  {
    categoryName: "投资",
    keywords: [
      "余额宝", "余额宝-转出到余额", "余额宝-自动转入", "自动转入", "转出到余额", "建信基金管理有限责任公司", "零钱通存取", "理财通购买", "零钱通购买", "零钱通收益", "余额宝收益"
    ],
    priority: 735,
    type: "income"
  },
  {
    categoryName: "其他",
    keywords: [
      "微信零钱提现", "银联入账", "代付", "转存", "转入零钱通", "微信零钱提现财付通", "钱包返现账户提现", "收钱码收款", "收钱码", "二维码收款", "提现到账", "实时提现到账", "转账备注:微信转账", "微信转账收入", "群收款", "AA收款"
    ],
    priority: 520,
    type: "income"
  }
] as const satisfies ClassificationRuleSeed[];

const bankStatementClassificationRuleSeeds = [
  {
    categoryName: "餐饮",
    keywords: [
      "上海拉扎斯信息", "上海拉扎斯信息科", "拉扎斯网络科技", "拉扎斯", "饿了么平台", "饿了么订单", "百胜咨询", "百胜咨询(上海)", "肯德基券", "KFC券", "麦当劳券", "曼波尔", "曼波尔·深夜牛排", "长乐饭冰冰", "糖叙", "福州朴朴电子商务", "福建朴朴信息技术", "朴朴电子商务", "朴朴信息技术", "惠迪", "万嘉便利", "龙岩兴铁超市", "厦门坤旺达商贸", "施玉峰", "刘春成", "赵文", "陈欢", "任瑞磊", "陈帆", "黄衍君", "胡学金", "张惠兰", "林依建", "洪华玲", "陈书梅", "黄帅", "向万军"
    ],
    priority: 700,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "抖音支付", "上海蒜芽信息科技", "上海蒜芽信息科", "蒜芽", "OOLLET LIMITED", "Nuvei GS", "Worldpay", "广州途锦科技", "北京嘉信浩远信息", "天津迎客松科技", "天津迎", "上海部恩", "上海部恩科技", "链动小铺", "商城订单", "平台订单", "商户订单", "小店订单", "商品购买", "虚拟商品", "自动发货", "直充", "优惠券直充", "会员体验卡", "代金券"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "交通",
    keywords: [
      "厦门轨道建设", "厦门轨道", "支付宝-消费厦门轨", "广州骑安", "骑安", "小桔新能源", "新电途", "万帮星", "充电消费", "新能源充电", "地铁集团", "轨道建设", "花小猪优惠券", "打车优惠券", "拼车卷", "拼车券", "满减券", "专车包", "龙岩市公共交通", "公共交通", "北京阳光海天", "停车管理", "悦旅园博苑", "厦门悦旅园博苑"
    ],
    priority: 730,
    type: "expense"
  },
  {
    categoryName: "通讯订阅",
    keywords: [
      "福建联通", "支付宝-消费中国联", "中国联", "联通充值", "话费扣款", "通信扣费", "运营商扣费"
    ],
    priority: 710,
    type: "expense"
  },
  {
    categoryName: "旅行",
    keywords: [
      "汉庭星空", "汉庭星空(上海)酒", "汉庭酒店", "华住", "酒店预订", "住宿预订", "民宿预订", "天津迎客松旅行", "旅游服务"
    ],
    priority: 690,
    type: "expense"
  },
  {
    categoryName: "医疗",
    keywords: [
      "陕西郑远元专业修", "郑远元", "专业修脚", "足病", "修脚", "采耳", "理疗馆", "康复馆"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "学习办公",
    keywords: [
      "广州尖子生文具", "尖子生文具", "文具", "打印店", "复印店", "校园打印", "资料打印", "合肥科思通途教育", "科思通途教育", "教育科技有限公司", "在线课程支付"
    ],
    priority: 700,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "蓝调造型", "蓝调造型阳光店", "造型阳光店", "理发店", "美发店", "发型设计"
    ],
    priority: 680,
    type: "expense"
  },
  {
    categoryName: "其他",
    keywords: [
      "支付宝-消费", "微信支付-", "支付宝", "微信支付", "消费", "扫二维码付款", "二维码付款", "付款码付款", "商户消费", "消费-", "普通消费", "消费 支付宝", "消费 微信", "转支", "掌上银行", "生活费", "个人转账支出", "向个人付款", "转账付款", "对外转账", "银行卡扣款", "银行消费", "快捷支付", "银联快捷支付", "银联无卡自助消费", "无卡自助消费", "转账汇款", "网上支付", "银行卡快捷", "支付宝信贷业务待", "信贷业务待", "花呗账单", "借呗还款", "信用卡还款", "保费-赛福聚合", "国税总局", "税务日间", "个人所得税缴纳", "妙手ERP", "郑州宝岛科技", "广州明日之星网络", "北京嘉信浩远信息"
    ],
    priority: 500,
    type: "expense"
  },
  {
    categoryName: "退款",
    keywords: [
      "支付宝 +", "微信支付 +", "抖音支付 +", "原交易退回", "消费退款", "扫码退款", "商户退回", "平台退回", "退款-直充", "退款-自动充值", "退优惠券", "退款-代付", "退款-会员"
    ],
    priority: 735,
    type: "income"
  },
  {
    categoryName: "其他",
    keywords: [
      "支付宝转入", "微信转入", "转入银行卡", "他人转入", "个人转入", "个人收款到账", "扫二维码收款", "二维码收款到账", "转账收入", "银行卡入账", "转存入账", "结息", "个人活期结息", "活期结息", "汇入汇款", "转账汇入", "银行来账", "银行入账", "快捷支付退款", "银联退款", "本行CRS存款", "CRS存款", "现金存款", "柜台存款", "自助存款"
    ],
    priority: 520,
    type: "income"
  }
] as const satisfies ClassificationRuleSeed[];

const expandedCategoryClassificationRuleSeeds = [
  {
    categoryName: "社交",
    keywords: [
      "微信红包（单发)", "微信红包（单发）", "红包单发", "发给", "发给朋友", "发给亲友", "亲友红包", "个人红包", "微信红包支出", "红包支出"
    ],
    priority: 760,
    type: "expense"
  },
  {
    categoryName: "其他",
    keywords: [
      "转账备注:微信转账", "个人微信转账", "微信转账支出", "转账给个人", "向个人微信转账", "群收款付款", "群收款支出", "参与群收款", "群收款", "个人转账"
    ],
    priority: 610,
    type: "expense"
  },
  {
    categoryName: "通讯订阅",
    keywords: [
      "剪映服务", "即梦订阅服务", "小云雀订阅服务", "美图公司", "连续包年", "连续包月", "自动续费", "会员自动续费", "网易云音乐-会员自动续费", "PY市场", "虚拟物品购买", "p站会员", "会籍订阅代付", "SMARTWAY PANASIA", "￥68月", "益享卡", "官方卡密", "自动发卡", "WPS会员", "百度网盘会员", "夸克会员", "迅雷会员", "腾讯会员", "B站大会员", "芒果会员", "优酷会员", "爱奇艺会员", "美图会员", "剪映会员", "即梦", "软件订阅", "SaaS", "云服务", "阿里云", "腾讯云", "应用会员", "转账备注:codex", "codex服务", "Codex"
    ],
    priority: 820,
    type: "expense"
  },
  {
    categoryName: "金融",
    keywords: [
      "信用借还", "花呗", "花呗主动还款", "花呗账单", "花呗分期", "白条", "京东白条", "京东金融京东白条", "金条", "金条业务", "美团月付", "美团月付还款", "借呗", "借呗还款", "信用卡还款", "还款成功", "主动还款", "信贷业务待", "支付宝信贷业务待", "分期还款", "账单还款", "最低还款", "贷款还款", "车贷", "老爸车贷", "汽车贷款", "车贷还款"
    ],
    priority: 830,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "海力士DDR5", "DDR5", "笔记本内存", "拯救者", "y9000p", "内存条", "硬盘", "固态硬盘", "显卡", "键盘", "鼠标", "耳机", "显示器", "数据线", "充电器", "充电宝", "手机壳", "钢化膜", "莱仕达", "pdhm踏板", "游戏手柄", "数码配件", "电脑配件", "手机配件", "电子书", "pdf电子书", "电子书籍", "找书", "代找电子书"
    ],
    priority: 810,
    type: "expense"
  },
  {
    categoryName: "金融",
    keywords: [
      "保障费用", "保险", "保费", "保费-赛福聚合", "运费险", "保险理赔", "税费", "国税总局", "税务", "个人所得税", "个税", "个税退税", "印花税", "社保", "医保缴费", "公积金缴费", "车险", "意外险", "医疗险", "重疾险", "财产险"
    ],
    priority: 800,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "生活服务", "租车", "支付宝预授权", "预授权", "芝麻免押", "芝麻免押下单", "代付成功", "亲友代付", "客服QQ", "拼Business服务", "质保1个月", "修脚", "采耳", "郑远元", "蓝调造型", "理发店", "美发店", "造型店", "家政服务", "洗衣", "干洗", "开锁", "跑腿服务", "同城服务"
    ],
    priority: 780,
    type: "expense"
  },
  {
    categoryName: "居家",
    keywords: [
      "水电燃气", "水费", "电费", "燃气费", "天然气", "煤气费", "暖气费", "供暖费", "物业水费", "物业电费", "阶梯电价", "生活缴费", "缴费账单", "电网", "国家电网", "南方电网", "供电局", "自来水", "水务集团", "水务公司", "燃气集团", "燃气公司", "华润燃气", "港华燃气", "新奥燃气", "昆仑燃气", "供热公司", "热力公司", "支付宝生活缴费", "微信生活缴费", "云缴费", "城市服务缴费", "住户缴费", "户号缴费", "水电费", "水电煤", "电费充值", "燃气充值", "IC卡燃气", "燃气卡充值"
    ],
    priority: 850,
    type: "expense"
  },
  {
    categoryName: "餐饮",
    keywords: [
      "外卖", "外送", "配送餐", "餐饮外卖", "美团外卖", "饿了么", "饿了么平台", "蜂鸟配送", "美团平台商户", "美团订单", "美团优选外卖", "肯德基宅急送", "麦乐送", "麦当劳外送", "必胜客宅急送", "达美乐外送", "瑞幸外送", "霸王茶姬外卖", "喜茶外送", "奈雪外送", "蜜雪冰城外卖", "拼好饭", "美团拼好饭", "到家美食会", "闪送餐食", "送餐费", "配送费", "包装费", "骑手配送", "外卖红包", "外卖订单", "外卖平台", "餐费配送", "夜宵外卖", "午餐外卖", "晚餐外卖"
    ],
    priority: 860,
    type: "expense"
  },
  {
    categoryName: "餐饮",
    keywords: [
      "零食饮料", "零食", "饮料", "奶茶", "咖啡", "果茶", "茶饮", "甜品", "冰淇淋", "面包", "蛋糕", "糖果", "薯片", "坚果", "饼干", "巧克力", "口香糖", "矿泉水", "可乐", "汽水", "功能饮料", "便利店饮料", "自动售货机", " vending", "咖啡机", "瑞幸咖啡", "星巴克", "库迪咖啡", "幸运咖", "蜜雪冰城", "霸王茶姬", "喜茶", "奈雪", "茶百道", "古茗", "一点点", "沪上阿姨", "益禾堂", "书亦烧仙草", "良品铺子", "三只松鼠", "百草味", "来伊份", "零食很忙", "赵一鸣零食", "锅巴", "辣条", "卤味小吃", "周黑鸭", "绝味鸭脖"
    ],
    priority: 855,
    type: "expense"
  },
  {
    categoryName: "购物",
    keywords: [
      "服饰鞋包", "衣服", "服装", "上衣", "裤子", "裙子", "外套", "羽绒服", "内衣", "袜子", "帽子", "围巾", "鞋", "鞋子", "运动鞋", "皮鞋", "拖鞋", "箱包", "背包", "手提包", "行李箱", "饰品", "项链", "耳环", "手链", "淘宝服饰", "天猫服饰", "京东服饰", "得物", "唯品会", "抖音商城服饰", "小红书店铺", "优衣库", "UNIQLO", "ZARA", "H&M", "UR", "MJstyle", "森马", "太平鸟", "波司登", "耐克", "Nike", "阿迪达斯", "Adidas", "李宁", "安踏", "特步", "361", "鸿星尔克", "斯凯奇", "蕉内", "Ubras"
    ],
    priority: 845,
    type: "expense"
  },
  {
    categoryName: "居家",
    keywords: [
      "家居家装", "家具", "家装", "装修", "建材", "五金", "灯具", "窗帘", "床品", "床垫", "沙发", "茶几", "餐桌", "书桌", "衣柜", "收纳柜", "置物架", "厨具", "锅具", "餐具", "卫浴", "马桶", "花洒", "瓷砖", "地板", "乳胶漆", "墙纸", "家纺", "四件套", "枕头", "被子", "宜家", "IKEA", "居然之家", "红星美凯龙", "欧派", "索菲亚", "全友", "顾家家居", "林氏家居", "芝华仕", "喜临门", "慕思", "小米有品家居", "京东京造", "淘宝家装", "天猫家装", "多乐士", "立邦", "九牧", "箭牌卫浴"
    ],
    priority: 845,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "家政保洁", "家政", "保洁", "家庭保洁", "深度保洁", "开荒保洁", "日常保洁", "钟点工", "保姆", "月嫂", "育儿嫂", "护工", "上门清洁", "擦玻璃", "油烟机清洗", "空调清洗", "洗衣机清洗", "冰箱清洗", "地毯清洗", "沙发清洗", "除螨", "甲醛治理", "搬家保洁", "管道疏通", "下水道疏通", "开锁", "换锁", "修锁", "家电清洗", "啄木鸟家庭维修", "天鹅到家", "到位", "58到家", "美团家政", "支付宝家政", "京东服务家政", "阿姨来了", "e家洁", "家政服务"
    ],
    priority: 845,
    type: "expense"
  },
  {
    categoryName: "旅行",
    keywords: [
      "酒店住宿", "酒店", "宾馆", "旅馆", "客栈", "民宿", "公寓酒店", "青年旅舍", "青旅", "钟点房", "住宿", "住店", "订房", "酒店预订", "住宿预订", "房费", "押金房费", "携程酒店", "飞猪酒店", "去哪儿酒店", "同程酒店", "美团酒店", "艺龙酒店", "Booking", "Agoda", "Airbnb", "途家", "木鸟民宿", "小猪民宿", "华住", "汉庭", "全季", "桔子酒店", "如家", "首旅如家", "锦江之星", "维也纳酒店", "亚朵", "希尔顿", "万豪", "洲际", "智选假日", "民宿预订", "酒店集团"
    ],
    priority: 850,
    type: "expense"
  },
  {
    categoryName: "生活服务",
    keywords: [
      "美容美发", "美容", "美发", "理发", "剪发", "洗剪吹", "烫发", "染发", "造型", "发型设计", "发廊", "理发店", "美发店", "造型店", "美甲", "美睫", "纹眉", "半永久", "皮肤管理", "祛痘", "清洁护理", "面部护理", "身体护理", "SPA", "按摩护理", "美容院", "医美", "光子嫩肤", "水光针", "脱毛", "植发", "蓝调造型", "Tony", "发型师", "丝域养发", "养发馆", "美丽田园", "克丽缇娜", "奈瑞儿", "美团丽人", "大众点评丽人"
    ],
    priority: 855,
    type: "expense"
  },
  {
    categoryName: "社交",
    keywords: [
      "社交聚会", "聚会", "聚餐", "团建", "AA", "AA付款", "AA收款", "群收款", "朋友聚餐", "同学聚会", "同事聚会", "生日聚会", "请客", "请客吃饭", "份子钱聚会", "活动费", "报名费聚会", "桌游", "桌游吧", "轰趴", "轰趴馆", "KTV", "酒吧", "清吧", "Livehouse", "剧本杀", "密室", "棋牌室", "台球厅", "保龄球", "夜宵局", "饭局", "局费", "聚会费", "娱乐局", "群活动", "联谊", "聚会门票", "活动AA", "AA餐费"
    ],
    priority: 835,
    type: "expense"
  },
  {
    categoryName: "学习办公",
    keywords: [
      "办公", "办公用品", "文具", "打印", "复印", "扫描", "资料打印", "文件打印", "打印店", "复印店", "名片", "印章", "刻章", "快印", "装订", "A4纸", "笔记本", "签字笔", "文件夹", "档案袋", "便利贴", "订书机", "计算器", "硒鼓", "墨盒", "打印机", "办公耗材", "办公设备", "工位用品", "会议室", "会议费", "差旅办公", "企业服务", "工商服务", "财税服务", "发票服务", "用友", "金蝶", "钉钉", "飞书", "企业微信", "WPS办公", "腾讯会议", "Zoom", "幕布", "石墨文档", "办公软件"
    ],
    priority: 840,
    type: "expense"
  },
  {
    categoryName: "金融",
    keywords: [
      "理财支出", "理财买入", "基金买入", "基金申购", "基金定投", "股票买入", "证券转入", "证券入金", "券商入金", "港股入金", "美股入金", "黄金买入", "贵金属买入", "定期理财", "结构性存款", "银行理财", "余额宝转入", "零钱通转入", "理财转入", "购买理财", "买入基金", "买入黄金", "买入股票", "定投扣款", "基金扣款", "证券扣款", "蚂蚁财富", "天天基金", "东方财富", "同花顺", "雪球", "华泰证券", "招商证券", "银河证券", "中信证券", "国泰君安", "富途", "老虎证券", "陆金所", "京东金融理财", "腾讯理财通"
    ],
    priority: 845,
    type: "expense"
  },
  {
    categoryName: "金融",
    keywords: [
      "转账支出", "转账付款", "转账备注:微信转账", "微信转账支出", "支付宝转账支出", "个人转账", "向个人付款", "转账给个人", "给朋友转账", "亲友转账支出", "朋友转账", "转给", "转出给", "对外转账", "银行卡转账", "网银转账", "手机银行转账", "普通转账", "实时转账", "跨行转账", "汇款", "转账汇款", "微信转账", "支付宝转账", "个人付款", "代付", "代付款", "帮付", "垫付", "还给朋友", "转账备注", "收款方", "付款给", "发起转账", "转支", "掌上银行转账"
    ],
    priority: 805,
    type: "expense"
  },
  {
    categoryName: "公益",
    keywords: [
      "公益捐赠", "公益", "捐赠", "捐款", "慈善", "爱心捐", "公益项目", "公益基金", "慈善基金", "红十字", "中华慈善", "腾讯公益", "支付宝公益", "蚂蚁森林公益", "水滴公益", "轻松筹", "水滴筹", "爱心筹", "公益宝贝", "希望工程", "助学捐款", "救灾捐款", "灾害救助", "流浪动物救助", "动物保护", "环保捐赠", "公益月捐", "月捐", "善款", "捐助", "慈善总会", "壹基金", "韩红基金", "免费午餐", "乡村助学", "公益捐助"
    ],
    priority: 850,
    type: "expense"
  },
  {
    categoryName: "汽车",
    keywords: [
      "停车过路", "停车", "停车费", "停车场", "停车缴费", "停车收费", "临停", "临时停车", "路边停车", "智慧停车", "城市停车", "小区停车", "商场停车", "机场停车", "高铁站停车", "停车管理", "ETC", "etc扣费", "高速费", "过路费", "过桥费", "高速通行费", "通行费", "收费站", "高速公路", "高速收费", "路桥费", "桥隧费", "粤通卡", "闽通卡", "鲁通卡", "苏通卡", "沪通卡", "浙通卡", "高速ETC", "ETC充值", "停车券", "无感停车", "车牌付", "福州城投", "城投停车", "捷停车", "停简单", "ETCP", "道闸"
    ],
    priority: 860,
    type: "expense"
  },
  {
    categoryName: "二手转卖",
    keywords: [
      "闲鱼转账", "闲鱼", "二手", "转卖", "卖出", "出售", "二手转卖", "海力士DDR5", "笔记本内存", "小米Life", "棒球帽", "su7 ultra", "收回二手款", "二手收入", "卖货收入", "转卖收入", "回收款"
    ],
    priority: 810,
    type: "income"
  },
  {
    categoryName: "收款",
    keywords: [
      "收钱码收款", "收钱码", "二维码收款", "面对面收款", "个人收款", "群收款", "AA收款", "转账收款", "收款到账", "钱包返现账户提现", "转账收款到余额宝", "支付宝转账", "微信转账", "亲友转账", "他人转入", "个人转入", "收款", "收款入账", "砍车费", "微信其他收入", "其他收款"
    ],
    priority: 790,
    type: "income"
  }
] as const satisfies ClassificationRuleSeed[];

const defaultClassificationRuleSeeds = [
  ...baseClassificationRuleSeeds,
  ...expandedClassificationRuleSeeds,
  ...sampleFileClassificationRuleSeeds,
  ...bankStatementClassificationRuleSeeds,
  ...expandedCategoryClassificationRuleSeeds
];
