import { writable } from 'svelte/store';
import type { InstalledMod, ModProject, ModUpdate } from '$lib/types';

export type ModView = 'installed' | 'browse' | 'updates';
export type ModProvider = 'modtale' | 'curseforge';

export const installedMods = writable<InstalledMod[]>([]);
export const searchResults = writable<ModProject[]>([]);
export const availableUpdates = writable<ModUpdate[]>([]);
export const currentView = writable<ModView>('installed');
export const currentPage = writable<number>(1);
export const hasMore = writable<boolean>(false);
export const total = writable<number>(0);
export interface ApiStatus {
  configured: boolean;
  valid: boolean;
  error?: string;
}

export const modtaleStatus = writable<ApiStatus>({
  configured: false,
  valid: false
});
export const curseforgeStatus = writable<ApiStatus>({
  configured: false,
  valid: false
});
export const apiConfigured = writable<boolean>(false); // Legacy - based on modtale
export const cfApiConfigured = writable<boolean>(false); // Legacy - based on curseforge
export const currentProvider = writable<ModProvider>('modtale');
export const isModsLoading = writable<boolean>(false);
