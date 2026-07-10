import { AIStructuredReport, CommitData } from "./CodeChangesData.types";

export const MOCK_COMMITS: CommitData[] = [
  {
    hash: "a1b2c3d",
    message: "feat: implement stripe payment checkout",
    author: "wangbing",
    timestamp: "10 mins ago",
    branch: "feature/payment-gateway",
    files: [
      {
        filename: "src/services/payment.ts",
        status: "added",
        additions: 12,
        deletions: 0,
        diff: `@@ -0,0 +1,12 @@\n+import Stripe from 'stripe';\n+\n+const stripe = new Stripe(process.env.STRIPE_KEY);\n+\n+export const createSession = async (amount: number) => {\n+  return await stripe.checkout.sessions.create({\n+    payment_method_types: ['card'],\n+    line_items: [{ amount, quantity: 1 }],\n+    mode: 'payment',\n+  });\n+};\n`
      },
      {
        filename: "package.json",
        status: "modified",
        additions: 2,
        deletions: 1,
        diff: `@@ -15,6 +15,7 @@\n   "dependencies": {\n-    "axios": "^1.4.0"\n+    "axios": "^1.4.0",\n+    "stripe": "^12.0.0"\n   }\n }\n`
      }
    ]
  },
  {
    hash: "e4f5g6h",
    message: "fix: resolve null pointer in user auth",
    author: "lihua",
    timestamp: "2 hours ago",
    branch: "main",
    files: [
      {
        filename: "src/auth/jwt.ts",
        status: "modified",
        additions: 5,
        deletions: 3,
        diff: `@@ -45,5 +45,7 @@\n export const verifyToken = (token: string) => {\n-  if (!token) return null;\n-  const decoded = jwt.verify(token, SECRET);\n-  return decoded.userId;\n+  if (!token || token === 'null') return null;\n+  try {\n+    const decoded = jwt.verify(token, SECRET);\n+    return decoded.userId;\n+  } catch (e) { return null; }\n }\n`
      }
    ]
  },
  {
    hash: "8c9d0e1",
    message: "hotfix: handle undefined state in login form",
    author: "wangbing",
    timestamp: "1 day ago",
    branch: "hotfix/login-crash",
    files: [
      {
        filename: "src/components/LoginModal.tsx",
        status: "modified",
        additions: 2,
        deletions: 2,
        diff: `@@ -120,4 +120,4 @@\n   const handleSubmit = () => {\n-    if (form.username === '') {\n+    if (!form || !form.username) {\n       showError('Username required');\n     }\n`
      }
    ]
  }
];

export const getPrecookedReport = (hash: string, filename: string, scope: string, dimension: string): AIStructuredReport => {
  if (hash === "a1b2c3d" || filename.includes("payment")) {
    return {
      summary: `针对 Stripe 支付集成模块进行了${scope === 'commit' ? '「全提交跨模块对齐」' : scope === 'workspace' ? '「工程全局架构校验」' : '「单文件局部 Diff」'}深度验证。结果表明，当前设计存在严重的安全合规风险与跨模块不一致问题。`,
      severity: "HIGH",
      defects: [
        {
          title: "Stripe API SDK 同步初始化引发启动崩溃风险",
          severity: "致命",
          description: `在 payment.ts 第 3 行中，'new Stripe(process.env.STRIPE_KEY)' 属于静态同步加载。若宿主环境未定义 STRIPE_KEY，Node 运行时将抛出实例化致命错误，进而波及整个应用服务的模块载入，产生 system 启动崩溃阻断。`,
          fix: "将同步加载重构为「惰性、延迟单例初始化 (Lazy Singleton)」，在使用支付服务时动态检测并实例化该服务，配合环境变量的前置核验防御机制。"
        },
        {
          title: "支付 Session 创建缺失分布式事务异常捕获",
          severity: "严重",
          description: "createSession 异步接口调用外部 Stripe Gateway 期间未包裹 try-catch 拦截。在高并发支付、网络超时或信用卡预授权失败场景下，抛出的底层异常将直接穿透业务，导致本地订单事务挂起，造成严重的数据不一致。",
          fix: "对外部 I/O 模块交互进行严格的 try-catch 包裹，捕获 Stripe API 具体的错误编码 (例如 limit_exceeded)，提供可靠的本地事务补偿回滚，并向用户呈现友好的错误消息。"
        },
        {
          title: "依赖未锁定导致生产与开发环境依赖版本断层风险",
          severity: "一般",
          description: "在变更包 package.json 中，新增的 'stripe': '^12.0.0' 缺少锁版本。在持续构建环境中如果缺乏 lockfile 强限制，一旦上游释出不兼容的 Major 升级包，系统极易自动拉取损坏的包引入未知漏洞。",
          fix: "锁定具体小包版本或提交 package-lock.json 至版本控制，在编译和打包流程中引入依赖校验规约。"
        }
      ],
      suggestedCode: `import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

// 推荐实施惰性、防御性服务初始化
export const getStripeInstance = (): Stripe => {
  const key = process.env.STRIPE_KEY;
  if (!key) {
    throw new Error('STRIPE_KEY 环境变量未定义，请在工作空间「系统配置 -> 环境变量」中完成配置');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2023-10-16', // 锁死特定的 API 版本
    });
  }
  return stripeClient;
};

export const createSession = async (amount: number) => {
  try {
    const stripe = getStripeInstance();
    return await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cny',
          product_data: { name: 'Veritab AI 订阅套餐' },
          unit_amount: amount,
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://veritab.com/success',
      cancel_url: 'https://veritab.com/cancel',
    });
  } catch (error: any) {
    console.error('Stripe 支付结算会话创建失败:', error.message);
    throw new Error(\`支付网关故障: \${error.message}\`);
  }
};`,
      testCase: {
        name: `【Stripe 支付中心】惰性初始化与环境秘钥缺失拦截验证`,
        precondition: `应用未加载或本地 STRIPE_KEY 环境变量处于未分配状态`,
        steps: `1. 动态引入 payment.ts 模块并观察初始化行为\n2. 校验在不注入环境变量时系统是否不发生全局服务挂载崩溃\n3. 触发调用 createSession(5000) 交易支付指令\n4. 检验业务异常是否被成功捕获，并正常向前端返回秘钥缺失提示`,
        expectedResult: `应用启动不发生崩溃，调用支付事务时精准拦截，向终端反馈「支付密钥未就绪」错误而非底层程序 500 挂死。`,
        unitTestCode: `import { createSession, getStripeInstance } from './payment';

describe('Stripe Payment Gateway Defense Suite', () => {
  const originalEnv = process.env.STRIPE_KEY;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.STRIPE_KEY;
  });

  afterAll(() => {
    process.env.STRIPE_KEY = originalEnv;
  });

  it('should lazy-load without crashing the node process on boot', () => {
    expect(() => require('./payment')).not.toThrow();
  });

  it('should throw clear message when trigger payment with key missing', async () => {
    await expect(createSession(5000)).rejects.toThrow('STRIPE_KEY 环境变量未定义');
  });
});`
      }
    };
  }

  if (hash === "e4f5g6h" || filename.includes("jwt")) {
    return {
      summary: `对 JWT 用户鉴权防线进行了${scope === 'commit' ? '「全提交跨模块对齐」' : scope === 'workspace' ? '「工程全局架构校验」' : '「单文件局部 Diff」'}安全深度审计。检测表明，对 'null' 字符串的补丁修复虽然缓解了偶发异常，但极易造成新型的安全鉴权规避。`,
      severity: "MEDIUM",
      defects: [
        {
          title: "鉴权漏洞：对畸形占位 Token 过滤不足导致安全规避",
          severity: "严重",
          description: "修复分支中仅拦截了字符串 'null'。若客户端发送字符串 'undefined' 或经过二次转译的 Bearer undefined, Bearer [object Object]，jwt.verify 仍然会尝试解析并抛出 SignatureError，或由于第三方包类型重载漏洞造成认证漏洞漏洞越权。",
          fix: "引入统一清洗中间件，将各种非法畸形、占位型、空字符串形式的 Token 统一格式化为 null，不进入 verify 流程。"
        },
        {
          title: "缺少安全遥测与暴力破解风控累积机制",
          severity: "一般",
          description: "校验函数抛出异常时仅捕获并返回了 null。未进行安全审计日志记录，系统无法感知大批量的仿造 JWT 暴力破解攻击，缺乏全局风控审计支撑。",
          fix: "捕获异常时记录安全隔离审计日志 (不含敏感信息)，并对接网关层，将 IP 鉴权失败累积计数引入黑名单风控体系。"
        }
      ],
      suggestedCode: `import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'default_secure_secret_key';

export const verifyToken = (token: string | null | undefined): string | null => {
  if (!token) return null;

  // 1. 过滤 Bearer 前缀并清洗两端空白
  let cleanedToken = token.trim();
  if (cleanedToken.startsWith('Bearer ')) {
    cleanedToken = cleanedToken.substring(7).trim();
  }

  // 2. 集中清洗微服务或前端常见畸形占位字符串
  const invalidPlaceholders = ['null', 'undefined', '[object Object]', 'NaN'];
  if (!cleanedToken || invalidPlaceholders.includes(cleanedToken)) {
    return null;
  }

  try {
    const decoded = jwt.verify(cleanedToken, SECRET) as { userId: string };
    return decoded?.userId || null;
  } catch (error: any) {
    // 3. 安全审计，但不返回泄露系统细节
    console.warn(\`[Auth System Alert] JWT verify failed: \${error.message}\`);
    return null;
  }
};`,
      testCase: {
        name: `【JWT 安全网关】边界占位符与非法字符串防御测试`,
        precondition: `系统鉴权中心就绪，加载 JWT 密约`,
        steps: `1. 传入 verifyToken('Bearer undefined') 模拟前端未就绪请求\n2. 传入 verifyToken('Bearer [object Object]') 模拟未序列化状态\n3. 传入 verifyToken('Bearer fake_token_xxx') 验证伪造数字签名\n4. 验证接口拦截率是否均保持 100%`,
        expectedResult: `所有测试断言均安全降级，并对畸形/伪造 Token 返回 null 拒绝访问，不引发底层抛错。`,
        unitTestCode: `import { verifyToken } from './jwt';

describe('JWT Gatekeeper Robustness Tests', () => {
  it('should intercept invalid placeholder strings gracefully', () => {
    expect(verifyToken('undefined')).toBeNull();
    expect(verifyToken('Bearer null')).toBeNull();
    expect(verifyToken('[object Object]')).toBeNull();
  });

  it('should reject signature tampering and catch internal parser errors', () => {
    expect(verifyToken('Bearer invalid-tampered-signature')).toBeNull();
  });
});`
      }
    };
  }

  // Fallback for Commit 3 or any other
  return {
    summary: `对前端交互组件进行了${scope === 'commit' ? '「全提交跨模块对齐」' : scope === 'workspace' ? '「工程全局架构校验」' : '「单文件局部 Diff」'}代码审计。未就绪状态拦截妥当，但在提交环节缺失状态防抖锁定。`,
    severity: "LOW",
    defects: [
      {
        title: "交互漏洞：缺少高并发快速双击提交锁定防护",
        severity: "提示",
        description: "在 LoginModal 表单处理中，虽然修复了 form 的空指针问题，但 handleSubmit 未加入并发限制。如果用户遇到网络延时并多次频繁敲击「登录」按钮，组件将连续触发多次重复的 API 登录请求，造成服务端会话冗余。",
        fix: "引入 state 变量 isSubmitting。在发送请求前阻断，成功或失败后再释放锁定，实现前端并发卡控。"
      }
    ],
    suggestedCode: `import React, { useState } from 'react';

export const LoginForm = ({ onSubmit }: { onSubmit: (data: any) => Promise<void> }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.username) {
      setErrorMsg('Username required');
      return;
    }

    if (isSubmitting) return; // 1. 拦截高频快速重入
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmit(form);
    } catch (err: any) {
      setErrorMsg(err.message || '登录异常，请重试');
    } finally {
      setIsSubmitting(false); // 2. 释放锁定
    }
  };
};`,
    testCase: {
      name: `【登录对话框】高并发提交防抖锁卡控拦截测试`,
      precondition: `用户处于登录页，交互链路通畅`,
      steps: `1. 动态生成登录按钮表单\n2. 连续短间隔触发 3 次点击提报操作\n3. 监控事件提交次数`,
      expectedResult: `只有第一次有效触发接口提报，后续点击被防抖拦截，保证表单处于加载中。`,
      unitTestCode: `import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm Idempotency Suite', () => {
  it('should prevent double submission under high-frequency clicks', async () => {
    const mockSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<LoginForm onSubmit={mockSubmit} />);

    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});`
    }
  };
};
