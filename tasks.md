# Tasks for Financial Restructuring

- [ ] **Backend: Database & Entities**
    - [ ] Create `CapitalMovement` entity (id, type, amount, description, date, userId).
    - [ ] Update `Capital` entity logic (ensure `accumulatedProfit` is strictly managed).
    - [ ] Re-enable `Expenses` module (but controlled by Finance logic).

- [ ] **Backend: Finance Service Logic**
    - [ ] Implement `registerExpense`: Deduct from Cash AND Profit.
    - [ ] Implement `injectCapital`: Add to Cash AND Equity (Capital).
    - [ ] Implement `withdrawProfit`: Deduct from Cash AND Profit.
    - [ ] Implement `withdrawCapital`: Deduct from Cash AND Equity.
    - [ ] Create API endpoints for these actions.

- [ ] **Frontend: Finance Module**
    - [ ] Create `Finance.tsx` page.
    - [ ] Implement "Overview" section (Financial Cards).
    - [ ] Implement "Actions" section (Tabs for Gasto, Inyección, Retiro).
    - [ ] Implement "History" section (Table).

- [ ] **Frontend: Dashboard Update**
    - [ ] Update main Dashboard to show Financial Health (Net Profit) clearly.
    - [ ] Ensure "Total en COP" reflects `operativePlante`.

- [ ] **Cleanup**
    - [ ] Remove old `Capital.tsx` and `Expenses.tsx` from routing.
    - [ ] Verify all calculations with a full cycle test (Inject -> Buy -> Sell -> Expense -> Withdraw).
