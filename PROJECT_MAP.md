# PROJECT MAP — Mantle AI Swarm (Ouroboros)

> Полная карта проекта на 2026-08-04. Для бережного переноса контекста в любой новый инструмент
> (Claude Desktop и т.п.). Парный файл: `NEXT_PHASES.md` — всё обсуждённое, но не сделанное.

## Что это

Автономный мульти-агентный AI-трейдинг рой на Mantle L2 (chain 5000). Top 30 финалист
The Turing Test Hackathon 2026 (трек Trading & Strategy, из 576 заявок; трек не выиграли).
После хакатона развёрнут в сторону **Accountability Layer** — слой подотчётности AI-агентов,
который чейн принуждает (наш моат: ни один финалист не построил permissionless fraud-proof + slash).

**Ось продукта:** «Автономный фонд, которому чейн не даёт сжульничать.» LLM спорит — решает
детерминированный код, подпись проверяет контракт, репутация растёт из реального PnL.

## Структура репозитория

```
mantle-turing-ai-swarm/
├── Cargo.toml            # workspace: 12 крейтов (x402-* Gemini НЕ входят в workspace)
├── crates/
│   ├── ouroboros-brain   # LLM-мозг: 6-модельный debate pool + 2 судьи (8 моделей / 7 вендоров,
│   │                     #   guard-тест в config.rs), judge.rs = детерминированный 15-факторный скор
│   ├── titan-core        # entry.rs = 8 риск-гейтов G0-G7 (⚠️ дефолты распущены, см. NEXT_PHASES),
│   │                     #   auto_ramp.rs = 5 фаз SEED→APEX (поз. 10/15/20/25/30%, kill 3-8%/день)
│   ├── hive-intel        # 40+ когнитивных модулей, ML, DQS, benchmark
│   ├── mantle-chain      # Alloy: dex.rs (Merchant Moe/Agni), onchain.rs (v2-адреса, calldata-блоб
│   │                     #   вердиктов magic 0xa100), attestor.rs + verifier.rs (НОВОЕ, для новых
│   │                     #   контрактов; verifier EIP-712 typehash кросс-проверен с Solidity)
│   ├── swarm-engine      # main.rs = оркестратор + /telemetry HTTP; uptime/cycle IN-MEMORY
│   ├── turing-*          # consensus / risk / oracle / memory / sniper / liquidator
│   └── core-ipc          # zero-copy IPC
├── contracts/            # Foundry
│   ├── src/ERC8004Registry.sol      # ЗАДЕПЛОЕН v2 (addReputation-only, вердикты НЕ хранит)
│   ├── src/TuringFlashLiquidator.sol# ЗАДЕПЛОЕН v2
│   ├── src/DecisionAttestor.sol     # НОВОЕ, НЕ задеплоено: hash-chain вердиктов + inputsHash +
│   │                                #   settler-репутация с блоком само-оценки (9 тестов)
│   ├── src/DecisionVerifier.sol     # НОВОЕ, НЕ задеплоено: EIP-712 гейт (sig+risk+expiry+nonce+
│   │                                #   oracle re-check) + challengeVerdict fraud-proof (10 тестов)
│   ├── src/OuroborosBond.sol        # НОВОЕ, НЕ задеплоено: stake/slash/challenger-reward (7 тестов)
│   ├── src/AgentSessionKeys.sol     # НОВОЕ, НЕ задеплоено: bounded autonomy + co-pilot, approval
│   │                                #   привязан к verdictHash (14 тестов)
│   └── script/DeployAttestor.s.sol + DeployVerifier.s.sol  # готовы, НЕ бродкастились
├── dashboard/            # React/Vite/TS. Root на Vercel. rem-скейл ~10px, отступы табами
│   ├── api/chat.js       # Vercel serverless → OpenRouter НАПРЯМУЮ (работает без бэкенда! проверено)
│   ├── api/keepalive.js
│   └── src/
│       ├── App.tsx       # главная: hero → 3 steps → ACCOUNTABILITY LAYER (новая секция) →
│       │                 #   under-hood → bento-grid (chat первым) → footer
│       ├── App.css / index.css
│       ├── hooks/useTelemetry.ts   # поллер + offlineStreak (>=3 → ENGINE OFFLINE + заметка);
│       │                           #   VITE_TELEMETRY_URL переключает бэкенд БЕЗ правки кода
│       └── components/   # SwarmChat (звезда), HowItWorks, Mission/Retail/Institutions/Docs/
│                         #   Roadmap (SectionPage-шелл), MenuOverlay, TimelineWave, шейдеры
├── PIPELINE.md / README.md          # README ещё хакатонный (см. NEXT_PHASES: продуктовый README)
├── WINNERS_BATTLE_PLAN.md           # разбор 6 победителей + слои 0-6 + статус построенного
├── FINALISTS_DEEP_ANALYSIS.md       # глубокие досье победителей (брифинг для другой AI)
├── LAYER1_VERIFIER_SPEC.md          # спека + RUNBOOK ДЕПЛОЯ (§5) — пошаговый
└── PROJECT_MAP.md / NEXT_PHASES.md  # этот файл + журнал незакрытого
```

## Деплой-топология

| Компонент | Где | Статус | Заметки |
|---|---|---|---|
| Frontend | Vercel `mantle-ai-swarm.vercel.app` | ✅ live | git-integration: пуш в main → автосборка (`tsc -b && vite build`) |
| Backend | Render `mantle-swarm-engine.onrender.com` | ❌ **SUSPENDED** | переезжает на новый сервер; фронт показывает ENGINE OFFLINE + честную заметку |
| /api/chat | Vercel serverless | ✅ live | OpenRouter напрямую, от бэкенда НЕ зависит (проверено curl'ом) |
| Контракты v2 | Mantle mainnet | ✅ live, Sourcify-verified | см. адреса ниже |
| Новые контракты (4) | — | 🟡 built+tested, НЕ задеплоены | runbook в LAYER1_VERIFIER_SPEC.md §5 |

## Ключевые адреса (Mantle mainnet, chain 5000)

- ERC8004Registry v2: `0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66`
- TuringFlashLiquidator v2: `0x19A53120FE1f0147f28fE83c2922A402AC98217c`
- Agent wallet (deployer/owner): `0xF02332A7d92C86631Ea30d49D9778994B9277c79` (Agent NFT #1)
- СТАРЫЙ v1 registry (не использовать): `0x1150…0008` — остался только в README:171 с пометкой v1
- Live swap proof tx: `0x9d42da158f733787f61456391265855146e48a6dd5dd58d9d484170ca217dded`

## Тесты (всё зелёное на 2026-08-04)

- Rust workspace: **568 passed / 0 failed**
- Contracts (Foundry): **45/45** (Attestor 9, Verifier 10, Bond 6+1 e2e, SessionKeys 14, старые 6+9... суммарно 45)
- Frontend: `tsc --noEmit` чисто, `vite build` чисто

## Известные ловушки (ОБЯЗАТЕЛЬНО знать при работе)

1. **`contracts/test/X402.t.sol` (untracked, Gemini) ломает `forge` компиляцию** (импортит
   несуществующий src/X402FlashLiquidator.sol). Чтобы гонять тесты: временно `mv` в scratchpad,
   потом вернуть байт-в-байт (1826 байт). НЕ редактировать, НЕ удалять — чужая работа.
2. **x402-* крейты и dashboard/lusion-дампы untracked** — работа Gemini/эксперименты, не трогать,
   в workspace не входят, пушем не уедут.
3. **uptime/cycle бэкенда in-memory** → любой рестарт обнуляет. Старая хиро-метрика (300h) умерла
   вместе с Render — новый отсчёт начнётся на новом сервере.
4. Линтер/форматтер трогает файлы между чтениями → для правок App.tsx/CSS надёжнее python-скрипты
   c assert count==1, чем Edit по точной строке.
5. **Пуш = деплой Vercel** (Render отвязан/мёртв — теперь пуш безопасен). Правило пользователя:
   наружу (push/деплой/гисты) — только по явной команде.
6. Коммиты — соло от пользователя, БЕЗ Co-Authored-By.
7. «4,500 транзакций» — мягкий клейм (большинство = 0-value self-tx heartbeats). НЕ показывать
   Mantlescan кошелька в записях/демо. Опираться на: 17 реальных свопов Merchant Moe, verified
   контракты, 300h/10k циклов (историческое), 17,800+ вердиктов → 17 сделок (селективность).

## Контакты / внешнее

- Mantle контакт: **Claire Wang @Clairewang0x** (сменила Стеллу 15.07). Тёплый ответ 03.08:
  ждёт 60-сек обзор (текст готов — см. NEXT_PHASES §1), проверяет внутренние заметки судей,
  открытых программ под нашу стадию сейчас нет (перепроверяет), следить за X Mantle.
- Гранты Mantle: public grants до $20k MNT (mantle.xyz/grants), Scouts = nomination-only (закрыт),
  Flagship Buildathon = rolling для pre-product.
- DoraHacks BUIDL: dorahacks.io/buidl/45176. GitHub: Triarchy-Labs/mantle-turing-ai-swarm.
- Соцсети: X @mod_minimal (личный; Triarchy-аккаунта нет — брендинг-гэп), контакт в меню — личный gmail.
