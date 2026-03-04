# Tasks for Weighted Average Inventory Implementation

- [ ] **Backend: Inventory Entity & Migration**
    - [ ] Create `GlobalInventory` entity (currencyId, totalQuantity, totalCostCOP, averageCost).
    - [ ] Create migration script to initialize global inventory from existing branch inventories (if any).

- [ ] **Backend: Purchase Logic Update**
    - [ ] Modify `PurchasesService.create`:
        - [ ] Fetch Global Inventory for currency.
        - [ ] Calculate new weighted average cost.
        - [ ] Update `GlobalInventory`.
        - [ ] Update `Capital` (Deduct Cash).

- [ ] **Backend: Sale Logic Update**
    - [ ] Modify `SalesService.create`:
        - [ ] Fetch Global Inventory for currency.
        - [ ] Calculate COGS using `averageCost`.
        - [ ] Calculate Profit = SalePrice - COGS.
        - [ ] Update `GlobalInventory` (Reduce Qty & Total Cost).
        - [ ] Update `Capital` (Add Cash & Profit).

- [ ] **Backend: Direct Operations (Optional/Future)**
    - [ ] Add `operationType` field to `Purchase` and `Sale` DTOs (INVENTARIO vs DIRECTA).

- [ ] **Frontend: Dashboard Update**
    - [ ] Display Global Inventory `averageCost` on Dashboard cards (e.g., "Costo Promedio: $3.850").
