# PRISM

一个问题，多家 AI 同时回答。支持明暗主题、模型连接、回答历史和浏览器扩展。

在线体验：https://prism-six-tiany-1120.xiaoboss.chatgpt.site


PRISM connects each user's API credentials to five providers. The Cloudflare Worker serves the frontend and manages email authentication, encrypted credentials, model discovery, and question requests. D1 stores accounts, sessions, connection settings, and results used for request deduplication.

## Local development

Use Node 24 or later.

```sh
node scripts/build.mjs
node scripts/dev.mjs
node --test scripts/test.mjs
```

The preview runs at http://127.0.0.1:4177. Local state lives in ignored .local/. Run the dev server with --fixtures to inspect a signed-in account with simulated providers. Fixtures exist only in the local server and are excluded from production.

Tests substitute email and model HTTP services. They cover authentication, expired and reused codes, logout, invalid keys, user isolation, duplicate-request suppression, and the five provider response formats. Live delivery and inference require real credentials.

The connection guide is available before sign-in. Each provider has official setup links and a three-step walkthrough; credential entry and validation require a PRISM session. Connecting one provider is sufficient to ask questions.

Real questions and provider results are saved under the authenticated account. The history view lists the latest 50 questions, restores their existing answers without calling models again, and polls unfinished requests until they finish or time out. Failed providers can be retried individually; retries consume API quota and do not regenerate successful answers. Preview animations never create history records. The history migration preserves all existing account and credential data.

For browser QA of partial failures, run `node scripts/dev.mjs --fixtures --fail-deepseek-once`. The first local DeepSeek generation fails with a simulated rate limit; its retry succeeds. This switch is excluded from the deployed Worker.

## Production configuration

The hosting manifest binds D1 as DB. Sites applies the tracked schema migration. Build with node scripts/build.mjs before packaging.

Configure these server environment entries in Sites settings.

- PRISM_SECRET is the application encryption secret. Preserve it across deployments. Rotation requires migration of existing encrypted credentials.
- RESEND_API_KEY is the email sending credential.
- AUTH_FROM_EMAIL is a verified sender authorized by Resend.

Email delivery remains unavailable until the last two settings are configured. The interface displays this setup state. Login requires a successfully delivered and valid one-time code.

Users add their own API keys in the authenticated connection dialog. Keys are encrypted with AES-GCM and bound to the user and provider. APIs return connection metadata only. API usage is billed by each provider. The five accounts can use different email addresses.

Hosting access is configured separately in Sites. PRISM email login and account isolation operate inside that hosting boundary.

免登录测试：将生产运行时 ALLOW_GUEST_TEST 设为 true 后，无需邮件验证码即可填写 API Key。服务端创建独立的 HttpOnly 测试会话，6 小时有效；密钥加密保存，历史记录按会话用户隔离。关闭测试开关后，测试会话立即失去访问权限。结束测试会删除该会话的密钥与记录；过期测试数据在后续访问 session 或创建测试会话时清理。普通邮箱账号不受清理影响。--guest-preview 提供不注入登录态的本地模拟服务。

## Source layout

The tracked dist/ HTML, CSS, JavaScript and brand assets are authored frontend source. Do not delete them as disposable build output. scripts/build.mjs embeds these assets into the generated, ignored dist/server/index.js Worker. This GitHub repository does not automatically deploy changes to the existing Sites publication.
