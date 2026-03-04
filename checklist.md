# Financial Logic Implementation Checklist

## Backend (NestJS)

- [ ] **Database & Entities**
    - [ ] Create `CapitalMovement` entity.
    - [ ] Update `Capital` entity (ensure fields exist).
    - [ ] Re-enable `Expenses` module (add `category` field?).

- [ ] **Finance Service (Core Logic)**
    - [ ] `registerExpense`:
        - [ ] Deduct `amount` from `Capital.operativePlante` (Cash).
        - [ ] Deduct `amount` from `Capital.accumulatedProfit` (Profit).
        - [ ] Create `Expense` record.
    - [ ] `injectCapital`:
        - [ ] Add `amount` to `Capital.operativePlante` (Cash).
        - [ ] Add `amount` to `Capital.totalCapital` (Equity).
        - [ ] Create `CapitalMovement` (Type: INJECTION).
    - [ ] `withdrawProfit`:
        - [ ] Deduct `amount` from `Capital.operativePlante` (Cash).
        - [ ] Deduct `amount` from `Capital.accumulatedProfit` (Profit).
        - [ ] Create `CapitalMovement` (Type: WITHDRAWAL_PROFIT).

## Frontend (React)

- [ ] **Finance Page (`Finance.tsx`)**
    - [ ] **Overview Section:**
        - [ ] Card: Capital Operativo (Cash).
        - [ ] Card: Utilidad Neta (Profit).
        - [ ] Card: Valor Inventario.
    - [ ] **Actions Section (Tabs):**
        - [ ] Tab: Registrar Gasto (Form).
        - [ ] Tab: Inyectar Capital (Form).
        - [ ] Tab: Retirar Utilidad (Form).
    - [ ] **History Section:**
        - [ ] Table showing all movements.

- [ ] **Dashboard Update**
    - [ ] Ensure Main Dashboard reflects strict financial metrics.

## Validation

- [ ] **Full Cycle Test:**
    1.  Inject 10M -> Capital 10M, Profit 0.
    2.  Buy 100 USDT (at 3800) -> Capital 9.62M, Inventory 100 USDT, Profit 0.
    3.  Sell 100 USDT (at 4000) -> Capital 10.02M, Inventory 0, Profit 20k.
    4.  Pay Expense (5k) -> Capital 10.015M, Profit 15k.
    5.  Withdraw Profit (10k) -> Capital 10.005M, Profit 5k.
