# Currency Exchange (Conversion) Specification

## 1. Overview
Implement a new **Exchange Module** to handle internal currency conversions (e.g., swapping USD for EUR). This operation transfers value (cost) from one inventory to another without generating profit or affecting Operational Cash (Capital).

## 2. Database Schema

### 2.1. New Entity: `Exchange`
- `id`: UUID
- `sourceCurrencyId`: UUID (Currency OUT)
- `targetCurrencyId`: UUID (Currency IN)
- `sourceAmount`: Decimal (Amount OUT)
- `targetAmount`: Decimal (Amount IN)
- `exchangeRate`: Decimal (Calculated: targetAmount / sourceAmount or manual)
- `costTransferredCOP`: Decimal (Calculated from Source WAC)
- `date`: Timestamp
- `userId`: UUID

## 3. Logic Implementation (`ExchangeService`)

### 3.1. Conversion Process
1.  **Validate Source Inventory:**
    *   Check if `GlobalInventory` for `sourceCurrency` has enough `sourceAmount`.
    *   Get `sourceAvgCost` (WAC) from Source Inventory.

2.  **Calculate Transfer Value:**
    *   `ValueToTransfer` (COP) = `sourceAmount` * `sourceAvgCost`.
    *   *Note:* This is the cost basis being moved. No profit is realized.

3.  **Update Source Inventory (Deduct):**
    *   `SourceQty` -= `sourceAmount`.
    *   `SourceTotalCost` -= `ValueToTransfer`.
    *   *Source AvgCost remains unchanged.*

4.  **Update Target Inventory (Add):**
    *   `TargetQty` += `targetAmount`.
    *   `TargetTotalCost` += `ValueToTransfer`.
    *   **Recalculate Target WAC:** `TargetTotalCost / TargetQty`.

5.  **Record Transaction:**
    *   Save `Exchange` entity.

## 4. Frontend Changes

### 4.1. New Page: `Exchange` (or Tab in Operations)
- **Form:**
    - Select Source Currency (Drop-down).
    - Input Source Amount.
    - Select Target Currency.
    - Input Target Amount (or Rate).
    - Display: "Cost Transfer Value" (Read-only, for info).
- **History:** Table of past exchanges.

## 5. Tasks
- [ ] Create `Exchange` entity.
- [ ] Create `ExchangeModule`, `ExchangeService`, `ExchangeController`.
- [ ] Implement WAC transfer logic in `InventoryService` (helper method).
- [ ] Frontend UI for conversion.
