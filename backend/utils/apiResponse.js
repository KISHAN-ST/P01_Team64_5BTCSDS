/**
 * Every successful response in this API has the same shape:
 *   { success: true, message, data, meta? }
 * Every failure has:
 *   { success: false, message, errors? }
 */
const ok = (res, { message = 'OK', data = null, meta, status = 200 } = {}) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

const created = (res, { message = 'Created', data = null } = {}) =>
  ok(res, { message, data, status: 201 });

module.exports = { ok, created };
