# Weighted Average Inventory Specification

## 1. Overview
Implement a **Weighted Average Cost (WAC)** system for global inventory management. This ensures that the cost of goods sold (COGS) and profit margins are calculated accurately based on the accumulated cost of inventory, rather than a fixed or daily rate.

## 2. Database Schema

### 2.1. `Inventory` Entity (Update)
The existing `Inventory` entity (or a new one if current is per-branch) must be **Global** (branchId can be null or ignored for global tracking).

**Fields:**
- `currencyId`: Relation to Currency.
- `currentBalance` (quantity_total): Decimal. Total units of currency.
- `totalAccumulatedCost` (costo_total_acumulado): Decimal. Total COP spent to acquire current inventory.
- `averageCost` (promedio_actual): Decimal. `totalAccumulatedCost / currentBalance`.

## 3. Logic Implementation

### 3.1. Purchase (Compra)
**Trigger:** When a purchase is registered (Type: INVENTARIO).
**Logic:**
1.  Get current Global Inventory for the currency.
2.  `NewBalance` = `OldBalance` + `PurchaseQuantity`.
3.  `NewTotalCost` = `OldTotalCost` + `PurchaseTotalCOP`.
4.  `NewAverageCost` = `NewTotalCost` / `NewBalance`.
5.  **Save:** Update `currentBalance`, `totalAccumulatedCost`, `averageCost`.
6.  **Capital:** Deduct `PurchaseTotalCOP` from Operational Cash.

### 3.2. Sale (Venta)
**Trigger:** When a sale is registered (Type: INVENTARIO).
**Logic:**
1.  Get current Global Inventory.
2.  Use `averageCost` as the unit cost.
3.  `CostOfSale` = `SaleQuantity` * `averageCost`.
4.  `Profit` = `SaleTotalCOP` - `CostOfSale`.
5.  `NewBalance` = `OldBalance` - `SaleQuantity`.
6.  `NewTotalCost` = `OldTotalCost` - `CostOfSale`.
    *   *Note: Average Cost does NOT change on sale.*
7.  **Save:** Update `currentBalance`, `totalAccumulatedCost`.
8.  **Capital:** Add `SaleTotalCOP` to Operational Cash.
9.  **Profit:** Add `Profit` to Accumulated Profit.

### 3.3. Direct Operation (Operación Directa)
**Trigger:** Purchase/Sale with Type: DIRECTA.
**Logic:**
- Does **NOT** touch Global Inventory `currentBalance` or `averageCost`.
- **Profit:** Calculated directly (`SalePrice - PurchasePrice`) * Qty.
- **Capital:** Updates Cash and Profit directly.

## 4. Edge Cases
- **Zero Inventory:** If `currentBalance` becomes 0, reset `totalAccumulatedCost` and `averageCost` to 0.
- **Negative Inventory:** Prevent sales if `currentBalance < SaleQuantity` (unless allowed by config, but math breaks).

## 5. Migration
- Existing inventory records need to be initialized with a starting `totalAccumulatedCost` based on a manual rate or current market rate, otherwise `averageCost` will be 0.
