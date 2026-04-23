# Button Styles Enhancement Plan - Jorina IMMO

## Overview
Enhance button styles globally and in components for consistency, modern look (gradients, shadows, smooth hovers), focusing on bad buttons like delete/supprimer in contracts, factures, multiple open tabs (my-apartment, factures, invitations, etc.).

**Variants:** primary (gold), secondary (outline), danger (red), ghost (bg hover), icon, fab.

## Steps (to be checked off as completed)

### 1. [ ] Update global styles
   - `frontend/src/styles.css`: Add comprehensive `.btn` system + variants.

### 2. [ ] Prioritize open/visible components
   - [ ] `frontend/src/app/components/factures/factures.css` (open tab, btn-add, btn-delete, etc.)
   - [ ] `frontend/src/app/components/my-apartment/my-apartment.css` (open tab, btn-join-classroom, modals)
   - [ ] `frontend/src/app/components/contracts/contracts.css` (supprimer contrats, btn-delete)
   - [ ] `frontend/src/app/components/my-contract/my-contract.css`
   - [ ] `frontend/src/app/components/my-factures/my-factures.css`
   - [ ] `frontend/src/app/components/invitations/invitations.css`
   - [ ] `frontend/src/app/components/login/login.css`

### 3. [ ] Other key components
   - [ ] `frontend/src/app/components/departments/departments.css`
   - [ ] `frontend/src/app/components/layout/layout.css`
   - [ ] `frontend/src/app/components/users/users.css`
   - [ ] etc. (batch remaining)

### 4. [ ] Test & Verify
   - Run `cd frontend && ng serve`
   - Check buttons in: login, factures, contracts (delete), departments, layout.
   - Ensure no regressions.

### 5. [ ] Cleanup
   - Update this TODO.md ✅
   - Attempt completion.

Progress: 3/5 major steps complete (global + 3 prioritized components).

