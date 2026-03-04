# Transaction Reversal Specification

## 1. Overview
Implement a strict **Reversal System** for purchases and sales. Direct editing or deletion of transactions that affect inventory is prohibited to maintain audit trails and inventory integrity.

## 2. Database Changes

### 2.1. Update `Purchase` and `Sale` Entities
- Add `status`: ENUM ('COMPLETED', 'PENDING', 'REVERSED').
- Add `reversedAt`: Timestamp (nullable).
- Add `reversedById`: User ID (nullable).
- Add `reversalReason`: String (nullable).

## 3. Logic Implementation

### 3.1. Reverse Purchase (`POST /purchases/:id/reverse`)
**Logic:**
1.  Check if purchase is already `REVERSED`. If so, throw error.
2.  Get original `quantity` and `totalCost`.
3.  **Inventory Adjustment:**
    *   Deduct `quantity` from Global Inventory.
    *   Deduct `totalCost` from Global Inventory Total Cost.
    *   *Recalculate Average Cost.*
    *   *Constraint:* Ensure Global Inventory >= Quantity to reverse (though reversal implies correcting a past error, technically we just undo the math. If inventory is now lower than what we bought, it might go negative, which is acceptable for correction or needs validation).
4.  **Capital Adjustment:**
    *   Add `paidAmount` back to `OperationalCapital` (Cash refund).
5.  **Status Update:**
    *   Set Purchase `status` = `REVERSED`.
    *   Set `reversedAt` = NOW.

### 3.2. Reverse Sale (`POST /sales/:id/reverse`)
**Logic:**
1.  Check if sale is `REVERSED`.
2.  Get original `quantity` and calculated `costOfSale` (need to store this or recalculate? Storing `costOfSale` in Sale entity would be safer for exact reversal, otherwise we use current Average Cost which might be different).
    *   *Critical Decision:* If we didn't store `costOfSale` originally, we might introduce drift. **Action:** Add `costBasis` or `costOfSale` to `Sale` entity to ensure exact reversal of value.
3.  **Inventory Adjustment:**
    *   Add `quantity` back to Global Inventory.
    *   Add `originalCostOfSale` back to Global Inventory Total Cost.
    *   *Recalculate Average Cost.*
4.  **Capital Adjustment:**
    *   Deduct `totalPesos` (Revenue) from `OperationalCapital`.
    *   Deduct `profit` from `AccumulatedProfit`.
5.  **Status Update:**
    *   Set Sale `status` = `REVERSED`.

## 4. Frontend Changes
- **Reports/History:**
    - Show "Reversar" button next to valid transactions.
    - Show `REVERSED` status visually (e.g., strike-through or red badge).
- **Confirmation Modal:**
    - "Are you sure? This will reverse inventory and capital."
    - Input: Reason for reversal.

## 5. Tasks
- [ ] Add `status`, `reversalInfo` columns to Purchase/Sale entities.
- [ ] Add `costOfSale` to Sale entity (for accurate profit reversal).
- [ ] Implement `reverse` endpoint in Purchases Service.
- [ ] Implement `reverse` endpoint in Sales Service.
- [ ] Frontend integration.
