export function createLifecycleScope(baseContext = {}) {
  const controller = new AbortController();
  const callbacks = [];
  let disposed = false;

  const context = {
    ...baseContext,
    signal: controller.signal,
    onCleanup(callback) {
      if (typeof callback !== "function") {
        throw new TypeError("onCleanup() requires a function");
      }

      if (disposed) {
        callback();
        return () => {};
      }

      callbacks.push(callback);

      return () => {
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      };
    }
  };

  return {
    context,
    get disposed() {
      return disposed;
    },
    async dispose() {
      if (disposed) return;

      disposed = true;
      controller.abort();

      const errors = [];

      for (const callback of callbacks.splice(0).reverse()) {
        try {
          await callback();
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length === 1) {
        throw errors[0];
      }

      if (errors.length > 1) {
        throw new AggregateError(
          errors,
          "Multiple VeloDom lifecycle cleanup callbacks failed"
        );
      }
    }
  };
}
