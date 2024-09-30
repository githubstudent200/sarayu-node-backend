/**
 * The asyncHandler function is a higher-order function that wraps an asynchronous function and handles
 * any errors that may occur during its execution.
 * @param fn - The `fn` parameter in the `asyncHandler` function is a function that represents the
 * asynchronous route handler function in an Express application. This function takes `req` (request),
 * `res` (response), and `next` (next middleware function) as parameters and is expected to perform
 * some asynchronous
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
