// Заглушка для p-limit
export default function pLimit(concurrency) {
  return function limit(fn) {
    return function (...args) {
      return fn(...args);
    };
  };
}
