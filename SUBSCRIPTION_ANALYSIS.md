# Sistema de Suscripciones — Análisis y Casos Pendientes (IMPLEMENTACIÓN)

## Arquitectura Actual

### Componentes principales

| Capa | Archivo | Rol |
|------|---------|-----|
| **Frontend** | `SubPlanCard.jsx` | UI de selección de planes. Cualquier plan diferente al actual llama a `/subscriptions/checkout` y redirige al usuario a Stripe Checkout. |
| **Router** | `routes/subscriptions.js` | Endpoints: `/me`, `/features`, `/can-create-link`, `/cancel`, `/checkout`, `/checkout/confirm`. |
| **Service** | `services/subscription.js` | Lógica de negocio: crea checkout sessions, cancela suscripciones, sincroniza desde Stripe, valida permisos (`assertActivePlan`, `canCreateLink`). |
| **Model** | `models/subscription.js` | Operaciones Prisma: `upsertForUser`, `getByUserId`, `getByStripeSubscriptionId`, `incrementUsage`, `syncUserPlanSnapshot`. |
| **Webhook** | `controllers/stripeWebhook.js` | Procesa: `customer.subscription.{created,updated,deleted}`, `checkout.session.completed`, `invoice.payment_failed`. |
| **DB** | `schema.prisma` → tabla `subscription` | Almacena: `plan_id`, `status`, `current_period_start/end`, `cancel_at_period_end`, `canceled_at`, `stripe_*`. |

### Flujo actual de checkout

1. Frontend llama `POST /subscriptions/checkout` con `{ planId }`.
2. `createCheckoutSession` crea una sesión de Stripe Checkout en modo `subscription`.
3. Stripe redirige al usuario a su UI para pagar.
4. Tras el pago, Stripe dispara webhooks que actualizan la DB vía `customer.subscription.*`.
5. Frontend llama `GET /subscriptions/me` para reflejar el nuevo estado.

---

## ✅ Caso 1: Cambio de plan (upgrade/downgrade) — IMPLEMENTADO

### Estado previo

El cambio de plan creaba una **nueva sesión de Stripe Checkout**. No había control de proration.

### ✅ Solución implementada

1. **Nuevo endpoint `PATCH /subscriptions/switch`** en `routes/subscriptions.js`
2. **Nuevo método `SubscriptionService.switchPlan()`** en `services/subscription.js`:
   - Para **upgrade** (cambio entre planes pagos): usa `stripe.subscriptions.update()` con `proration_behavior` configurable.
   - Para **downgrade a free**: cancela la Stripe subscription con efecto diferido (`invoice_now=false`, `prorate=false`) y aplica el plan local.
   - Para **downgrade entre planes pagos**: usa `proration_behavior="none"` para cambio al fin de periodo.
   - Sincroniza la DB local tras el cambio.
3. **Frontend actualizado** en `SubPlanCard.jsx`:
   - Si el usuario tiene suscripción activa → usa `/switch` (cambio inmediato, sin salir de la app).
   - Si no tiene suscripción activa → usa `/checkout` (Stripe Checkout, para reactivación).

### Cómo usarlo (frontend)

```
// Upgrade inmediato (se cobra diferencia proporcional)
PATCH /subscriptions/switch
{ "planId": "pro", "prorationBehavior": "create_prorations" }

// Downgrade al fin de periodo (sin cargo inmediato)
PATCH /subscriptions/switch
{ "planId": "basic", "prorationBehavior": "none" }

// Downgrade a free (cancelación diferida)
PATCH /subscriptions/switch
{ "planId": "free", "prorationBehavior": "none" }
```

---

## ✅ Caso 2: Cancelación con efecto al fin de período — IMPLEMENTADO + REFACTOR

### Estado previo ( BUG CRÍTICO )

`cancelSubscription` llamaba a `stripe.subscriptions.cancel(id)` **sin parámetros** → cancelación inmediata. La UI decía "hasta el fin del periodo" pero el backend no lo hacía.

### ✅ Solución implementada (2 fixes)

**Fix 1:** Parámetros de cancelación diferida en `stripe.subscriptions.cancel`:
```js
await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
  invoice_now: false,  // no facturar el resto del periodo
  prorate: false,      // sin proration por cancelación anticipada
});
```

**Fix 2 (crítico):** El código **no cambiaba el `plan_id` a "free" inmediatamente**. Antes, `cancelSubscription` hacía `planId: "free"` + `status: "active"` + un nuevo `current_period_end` de 30 días, lo que significaba que el usuario perdía el plan pagado **de inmediato** a pesar de lo que decía la UI.

Ahora, `cancelSubscription` mantiene el `plan_id` actual, `status`, y `current_period_end` originales, solo marcando `cancel_at_period_end: true`. El downgrade a free ocurre cuando Stripe envía `customer.subscription.deleted` al final del período (el webhook lo rebaja a free).

**Fix 3:** `assertActivePlan` ya **no** lanza 403 para usuarios con `cancel_at_period_end=true`. Ellos conservan acceso a los features hasta el fin de periodo.

**Fix 4:** Webhook `customer.subscription.deleted` ahora rebaja el `plan_id` a `"free"` y limpia los campos `stripe_*` (customer, subscription, price) cuando la suscripción es eliminada.

### Archivos modificados
- `apps/api/services/subscription.js` → `cancelSubscription()`, `switchPlan()`, `assertActivePlan()`
- `apps/api/controllers/stripeWebhook.js` → caso `customer.subscription.deleted`

---

## ✅ Caso 7: Portal de facturación de Stripe — IMPLEMENTADO

### Estado previo

No existía. El usuario no podía gestionar método de pago, facturas o historial.

### ✅ Solución implementada

1. **Endpoint `POST /subscriptions/billing-portal`** en `routes/subscriptions.js`
2. **Método `createBillingPortalSession()`** en `services/subscription.js`
3. **Botón "Gestionar facturación"** añadido en `Settings.jsx`

---

## Casos adicionales que deberías contemplar (PENDIENTES)

| # | Caso | Estado actual | Recomendación |
|---|------|--------------|---------------|
| 1 | **Reactivation tras cancelación programada** | Frontend llama `/subscriptions/checkout` con el `planId` actual. Stripe reutiliza el customer y crea una nueva suscripción. | Si existe `cancel_at_period_end=true`, primero llamar a `stripe.subscriptions.update(id, { cancel_at_period_end: false })` antes del checkout. |
| 2 | **Expiración de trial** | No hay manejo de `trial`. | OK actualmente, observar si se añade trial. |
| 3 | **Fallos de pago recurrente** | Webhook pone `status=past_due`. | Añadir: notificación al usuario, reintentos automáticos, o cancelación tras N fallos. |
| 4 | **Cancelación inmediata vs diferida** | UI solo ofrece cancelación programada. | Añadir toggle: "Cancelar al final del periodo" vs "Cancelar ahora". |
| 5 | **Downgrade con grace period de features** | No contemplado. | Usar `subscription_schedule` de Stripe para mantener features viejas hasta el fin de periodo. |
| 6 | **Webhook: `customer.subscription.deleted`** | ✅ **Corregido:** rebaja `plan_id` a `free` y limpia campos `stripe_*`. | Verificado en `stripeWebhook.js`. |
