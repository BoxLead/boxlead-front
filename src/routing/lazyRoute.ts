import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { loadChunk, type ChunkLoader } from "./chunkRetry";

export type RouteModule<K extends string> = Record<K, ComponentType>;

export type LazyRoute = LazyExoticComponent<ComponentType> & { preload: () => Promise<void> };

export function lazyRoute<K extends string>(load: ChunkLoader<RouteModule<K>>, name: K): LazyRoute {
  let pending: Promise<{ default: ComponentType }> | null = null;
  const loader = () => {
    pending ??= loadChunk(load).then((module) => ({ default: module[name] }));
    return pending;
  };
  const component = lazy(loader) as LazyRoute;
  component.preload = () => loader().then(() => undefined, () => undefined);
  return component;
}
