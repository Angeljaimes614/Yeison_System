# Payment Registration System Specification

## 1. Overview
Implement a system to register partial or full payments (Abonos) for pending Purchases and Sales. This ensures debts are tracked and paid off correctly, updating Operational Capital (Cash) accordingly.

## 2. Database Schema

### 2.1. New Entity: `Payment`
- `id`: UUID
- `purchaseId`: UUID (Nullable, if paying a purchase)
- `saleId`: UUID (Nullable, if collecting a sale)
- `amount`: Decimal (Payment amount in COP)
- `paymentMethod`: String ('cash', 'transfer')
- `date`: Timestamp
- `createdById`: UUID (User who registered the payment)

### 2.2. Updates to `Purchase` and `Sale`
- No new fields needed, `paidAmount` and `pendingBalance` are already there.
- Logic update: When a `Payment` is created, update the parent transaction's `paidAmount` and `pendingBalance`.

## 3. Logic Implementation (`PaymentsService`)

### 3.1. Register Payment (`POST /payments`)
**Input:**
- `transactionType`: 'PURCHASE' | 'SALE'
- `transactionId`: UUID
- `amount`: Decimal
- `paymentMethod`: String
- `userId`: UUID

**Logic:**
1.  **Validate Transaction:**
    *   Find Purchase or Sale by ID.
    *   Check if `pendingBalance` >= `amount`. (Allow overpayment? Ideally no, throw error if amount > debt).

2.  **Update Capital (Cash Flow):**
    *   If **SALE (Cobro):** Add `amount` to `OperationalCapital` (Cash In).
    *   If **PURCHASE (Pago):** Deduct `amount` from `OperationalCapital` (Cash Out).

3.  **Update Transaction Balance:**
    *   `NewPaidAmount` = `OldPaidAmount` + `amount`.
    *   `NewPendingBalance` = `Total` - `NewPaidAmount`.
    *   If `NewPendingBalance` <= 0, set status = 'COMPLETED' (if it was pending).

4.  **Record Payment:**
    *   Save `Payment` entity for audit trail.

## 4. Frontend Changes

### 4.1. Reports Page Update
- **Action Column:** Add "Abonar" button if `pendingBalance > 0` and status is not `REVERSED`.
- **Modal/Prompt:**
    - Input: Amount to pay.
    - Input: Payment Method (Cash/Transfer).
- **Display:** Show progress bar or "Pagado: X / Total: Y" in tooltip.

## 5. Tasks
- [ ] Create `Payment` entity.
- [ ] Create `PaymentsModule` (Service + Controller).
- [ ] Implement `registerPayment` logic.
- [ ] Update Frontend Reports to include "Abonar" button.
