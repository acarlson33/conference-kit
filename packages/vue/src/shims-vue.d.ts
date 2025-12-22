declare module "vue" {
  export type Ref<T> = { value: T };
  export function ref<T>(value: T): Ref<T>;
  export function computed<T>(getter: () => T): Ref<T>;
  export function watch<T>(
    source: () => T,
    cb: (next: T, prev: T) => void
  ): void;
  export function onMounted(cb: () => void): void;
  export function onUnmounted(cb: () => void): void;
}
