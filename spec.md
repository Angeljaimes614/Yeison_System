# Financial Module Restructuring Specification

## 1. Overview
This specification outlines the restructuring of the ERP system to implement a unified **Finance Module**. The goal is to strictly separate **Operational Capital** from **Accumulated Profit** and to categorize all financial movements correctly (Asset Conversion vs. Expense vs. Equity).

## 2. Backend Changes

### 2.1. Entity Updates

#### `Capital` Entity
Current state: `id`, `totalCapital`, `operativePlante`, `accumulatedProfit`.
**Changes:**
- `operativePlante`: Represents **Cash in COP** available for operations.
- `accumulatedProfit`: Represents **Net Retained Earnings** (Gross Profit - Expenses - Profit Withdrawals).
- `totalRealValue`: (Computed) `operativePlante` + `InventoryValue` (sum of all currencies * avg cost).

#### `FinancialTransaction` Entity (New or Refactored `Expense`)
We will repurpose the `Expense` entity into a broader `FinancialTransaction` or keep `Expense` for operational expenses and add a `CapitalMovement` entity.
**Decision:** Create `CapitalMovement` entity for Injections/Withdrawals to keep strict typing, and keep `Expense` for operational costs.

**New Entity: `CapitalMovement`**
- `id`: UUID
- `type`: ENUM ('INJECTION', 'WITHDRAWAL_PROFIT', 'WITHDRAWAL_CAPITAL')
- `amount`: Decimal
- `description`: String
- `date`: Date
- `userId`: UUID (Who performed it)

### 2.2. Logic Implementation (`FinanceService`)

#### A. Operating Expenses (Gastos)
- **Input:** Amount, Concept.
- **Action:**
  1. Deduct `amount` from `Capital.operativePlante` (Cash goes out).
  2. Deduct `amount` from `Capital.accumulatedProfit` (Profit reduces).
  3. Create `Expense` record.

#### B. Capital Injection (Inyección)
- **Input:** Amount, Source.
- **Action:**
  1. Add `amount` to `Capital.operativePlante` (Cash comes in).
  2. Add `amount` to `Capital.totalCapital` (Equity increases).
  3. **DO NOT** touch `accumulatedProfit`.
  4. Create `CapitalMovement` record (Type: INJECTION).

#### C. Profit Withdrawal (Retiro de Utilidad)
- **Input:** Amount.
- **Validation:** `amount` <= `Capital.accumulatedProfit`.
- **Action:**
  1. Deduct `amount` from `Capital.operativePlante` (Cash goes out).
  2. Deduct `amount` from `Capital.accumulatedProfit` (Profit decreases).
  3. Create `CapitalMovement` record (Type: WITHDRAWAL_PROFIT).

#### D. Sales (Ventas) - *Already implemented but verifying logic*
- **Action:**
  1. Calculate `GrossProfit` = `(SalePrice - AvgCost) * Qty`.
  2. Add `GrossProfit` to `Capital.accumulatedProfit`.
  3. Add `TotalSaleAmount` to `Capital.operativePlante`.

## 3. Frontend Changes

### 3.1. New Module: `Finance` (`/finance`)
Replaces the separate `Capital` and `Expenses` pages.

**Sections:**
1.  **Financial Overview (Cards):**
    *   **Capital en Caja (COP):** `operativePlante`.
    *   **Valor Inventario:** Sum of (Qty * AvgCost).
    *   **Utilidad Neta Acumulada:** `accumulatedProfit`.
    *   **Patrimonio Total:** Caja + Inventario.

2.  **Actions (Forms):**
    *   **Registrar Gasto Operativo:** (Arriendo, Nómina, Servicios).
    *   **Inyectar Capital:** (Socio Aporta).
    *   **Retirar Utilidad:** (Socio Retira).

3.  **History (Table):**
    *   Unified table showing Expenses and Capital Movements.

### 3.2. Dashboard Update
- Update the main Dashboard to show "Utilidad Neta" instead of just raw totals.
- Visual distinction between "Money we have" (Assets) and "Money we earned" (Profit).

## 4. Migration Plan
1.  **Database:** Create `CapitalMovement` entity.
2.  **Backend:** Implement `FinanceService` with the new logic methods.
3.  **Frontend:** Create `Finance` page and connect to new endpoints.
4.  **Cleanup:** Remove old `Expenses` and `Capital` standalone routes.
