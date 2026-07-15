# Layer 1 — Verdict Attestation + On-Chain Enforcement (спека на ревью)

> Цель: превратить «мы логируем вердикты» в **«чейн не даёт исполнить сделку, пока подписанное риск-проверенное решение не верифицируется»** + настоящий **Verdict Explorer** (клик по строке → конкретный tx на Mantlescan). Это тот примитив, на котором победители (Stax / Argus / Conatus) выиграли.
>
> **Ничего из этого не задеплоено и не изменено.** Документ для твоего решения. Деплой контракта + правки Rust-бэкенда + mainnet — за тобой.

---

## 0. Что реально есть сейчас (ground truth, проверено по коду)

| Компонент | Факт |
|---|---|
| `contracts/src/ERC8004Registry.sol` | Только `registerAgent` + `addReputation(agentId, scoreDelta)` (**onlyOwner**) + маппинг `agentReputation`. **Нет** хранилища вердиктов, **нет** блокировки само-рейтинга, `addReputation` не привязан on-chain к PnL. |
| Реальный деплой (`broadcast/run-latest.json`) | Registry `0xEb27…8a66`, Liquidator `0x19A5…217c`. **Совпадает с фронтом и `onchain.rs` (рантайм).** |
| `erc8004.rs::addresses` + README | **Устаревшие** `0x1150…` / `0x30daC0…`. Мёртвый код/доки → почистить. |
| `decisions` в телеметрии | `{ sym, verdict, reason(score), time }` из `[JUDGE]`-логов. **txHash на строку отсутствует** → сейчас честный per-row линк невозможен. |

**Вывод:** для настоящего Verdict Explorer нужен (а) on-chain стор вердикта → tx-хэш, (б) проброс хэша в телеметрию, (в) клик на фронте. Для «enforcement» — контракт-гейт перед свапом.

---

## 1. Два уровня амбиции (можно взять только A, потом B)

### A. Verdict Attestation (проще, честный Verdict Explorer) — «records you can verify» (Conatus)
Пишем каждый вердикт как компактную запись on-chain, получаем tx-хэш на строку.

```solidity
// DecisionAttestor.sol (новый; или расширить ERC8004Registry)
struct Verdict {
    uint256 agentId;
    bytes32 marketHash;   // keccak256(pair)
    int256  score;        // детерминированный судейский скор (масштаб 1e4)
    uint8   action;       // 0=HOLD 1=BUY 2=SELL 3=REJECT
    uint64  ts;
    bytes32 inputsHash;   // keccak256(canonical JSON входов 15 факторов) -> пере-считываемо (OFT PDR-стиль)
}
event VerdictRecorded(uint256 indexed agentId, bytes32 indexed marketHash, int256 score, uint8 action, bytes32 inputsHash);

function recordVerdict(Verdict calldata v) external onlyAgent(v.agentId) { emit VerdictRecorded(...); }
```
- **Улучшение над Conatus:** `inputsHash` = `keccak256` каноничных входов → любой пере-считает скор и проверит, что он не подкручен (OFT Sentinel PDR-стиль). У Conatus такого пере-счёта входов нет.
- **Стоимость:** только event (без storage) — копейки на Mantle. Storage-массив по желанию.

**Backend:** `mantle-chain` шлёт `recordVerdict`, возвращает `txHash`; `swarm-engine` вешает `txHash` на каждую `[JUDGE]`-запись.
**Телеметрия:** `DecisionEntry += txHash?: string; inputsHash?: string; score?: number`.
**Фронт:** строка `Decision Journal` → кликабельна, если есть `txHash` (→ `mantlescan.xyz/tx/…`); показать `inputsHash` + «recompute». Так `Decision Journal` честно становится **Verdict Explorer**.

### B. On-Chain Enforcement (жирнее) — «chain won't let it misbehave» (Stax + Argus)
Контракт-гейт: свап не проходит без валидного подписанного вердикта в пределах риск-лимита.

```solidity
// DecisionVerifier.sol
function executeIfVerified(
    Verdict calldata v,
    bytes calldata agentSig,     // EIP-712 подпись контроллера агента
    uint256 userRiskBound,
    bytes calldata swapCalldata
) external {
    require(_recoverSigner(v) == agentControllers[v.agentId], "bad sig");   // Stax
    require(v.score <= int256(userRiskBound), "risk exceeds bound");         // Stax
    require(block.timestamp <= v.ts + TTL, "expired");                       // Stax
    // Argus-усиление: пере-вывести риск-метрику из оракула+пула самим,
    // чтобы даже наш агент не форсил плохую сделку:
    require(_recheckRiskFromOracle(v.marketHash) <= userRiskBound, "stale/forged risk");
    _record(v);
    _dexRouter.call(swapCalldata);   // только теперь исполняем
}
```
- **Мутация/усиление:** совмещаем подпись (Stax) + независимый пере-счёт риска из оракула (Argus) в одном гейте — у победителей это было порознь.
- Это же — slash-триггер для **$OUROBOROS** (Layer 5): revert/нарушение лимита = событие для слэша бонда.

---

## 2. Влияние (blast radius) — что трогаем
- **Новый контракт** `DecisionAttestor.sol` (A) / `DecisionVerifier.sol` (B) + деплой-скрипт + тест.
- **Rust:** `mantle-chain` (новый вызов + возврат txHash), `swarm-engine` (проброс хэша в лог/IPC). ⚠️ бьёт по горячему пути роя — прогнать impact-анализ и тесты.
- **Телеметрия:** `useTelemetry.ts` `DecisionEntry` + маппер на строке ~267.
- **Фронт:** `App.tsx` карточка `Decision Journal` → кликабельные строки.
- **Честность:** привести копию HowItWorks в соответствие (либо после реализации A — оставить как есть, уже правда).

## 3. Рекомендуемый порядок
1. **A сначала** — дешево (event-only), честно закрывает Verdict Explorer и снимает оверклейм HowItWorks.
2. Почистить мёртвые `0x1150…` адреса (README + `erc8004.rs::addresses`).
3. **B потом** — реальный энфорсер (жирный спринт, mainnet-деплой, impact-анализ роя обязателен).
4. **$OUROBOROS** цепляем к B (slash на нарушение лимита).

## 4. Открытые вопросы к тебе
- Расширяем существующий `ERC8004Registry` (одна identity+reputation+verdicts) или отдельный `DecisionAttestor`? (склоняюсь к отдельному — не рискуем задеплоенным NFT).
- Пишем вердикт **на каждый** цикл судьи или только на EXECUTED/REJECTED (газ vs полнота лога)?
- Копию HowifWorks смягчить сейчас или ждём реализации A?
