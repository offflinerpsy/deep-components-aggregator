# AdminJS — Order user comment visibility

Change: Enabled display of `Order.meta` on AdminJS order show page by removing `components: { show: false }` override in `src/admin/index.mjs`.

Why: To surface the user-submitted comment (stored under `orders.meta.comment`) directly in the order detail view.

How to verify (UI):
- Open /admin and login.
- Navigate: Orders → pick an order with a known user comment (e.g., ORD-B99DD8).
- Open Show view; field `meta` should render JSON and include the comment, e.g.:
  ```json
  { "comment": "Арбузы есть? Почем?", ... }
  ```

How to verify (API/DB):
- DB: `SELECT order_code, meta FROM orders WHERE order_code='ORD-B99DD8';`
- Ensure `meta` contains `{"comment":"Арбузы есть? Почем?"...}`

Notes:
- This is a minimal change. For a more user-friendly label later, we can add a virtual `user_comment` property extracted from `meta.comment`.
