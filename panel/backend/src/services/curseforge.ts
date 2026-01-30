import config from '../config/index.js';

const CURSEFORGE_API_BASE = 'https://api.curseforge.com';
let HYTALE_GAME_ID = 6399; // Default, will be verified on init

const apiKey = config.curseforge?.apiKey || null;

// Find and cache Hytale game ID on startup
async function findHytaleGameId(): Promise<void> {
  if (!apiKey) return;

  try {
    const response = await fetch(`${CURSEFORGE_API_BASE}/v1/games`, {
      headers: { 'x-api-key': apiKey, Accept: 'application/json' }
    });

    if (!response.ok) return;

    const data = (await response.json()) as {
      data: Array<{ id: number; name: string; slug: string }>;
    };
    const hytale = data.data.find((g) => g.slug === 'hytale' || g.name.toLowerCase() === 'hytale');

    if (hytale) {
      HYTALE_GAME_ID = hytale.id;
    }
  } catch {
    // Silently use default game ID
  }
}

// Initialize on module load
findHytaleGameId();

export interface ModVersion {
  id: string;
  version: string;
  downloads: number;
  gameVersion: string;
  releaseDate: string;
  fileSize: number;
  fileName: string;
}

export interface ModProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  classification: string;
  author: string;
  downloads: number;
  rating: number;
  iconUrl: string | null;
  versions: ModVersion[];
  latestVersion: ModVersion | null;
  createdAt: string;
  updatedAt: string;
  allowDistribution: boolean;
}

export interface SearchParams {
  query?: string;
  classification?: string;
  classId?: number;
  categoryId?: number;
  gameVersion?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
}

export interface SearchResult {
  success: boolean;
  projects: ModProject[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  error?: string;
}

export interface ProjectResult {
  success: boolean;
  project?: ModProject;
  error?: string;
}

export interface Classification {
  id: string;
  name: string;
  classId: number;
}

export interface ClassificationsResult {
  success: boolean;
  classifications: Classification[];
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  buffer?: Buffer;
  fileName?: string | null;
  error?: string;
}

// CurseForge API response types
interface CFFile {
  id: number;
  modId: number;
  displayName: string;
  fileName: string;
  releaseType: number; // 1=Release, 2=Beta, 3=Alpha
  fileStatus: number;
  fileDate: string;
  fileLength: number;
  downloadCount: number;
  downloadUrl: string | null;
  gameVersions: string[];
  isAvailable: boolean;
}

interface CFMod {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  summary: string;
  downloadCount: number;
  thumbsUpCount: number;
  rating: number | null;
  dateCreated: string;
  dateModified: string;
  dateReleased: string;
  allowModDistribution: boolean | null;
  classId: number;
  primaryCategoryId: number;
  categories: Array<{
    id: number;
    gameId: number;
    name: string;
    slug: string;
    classId: number;
  }>;
  authors: Array<{
    id: number;
    name: string;
    url: string;
  }>;
  logo: {
    id: number;
    modId: number;
    title: string;
    thumbnailUrl: string;
    url: string;
  } | null;
  latestFiles: CFFile[];
  latestFilesIndexes: Array<{
    gameVersion: string;
    fileId: number;
    filename: string;
    releaseType: number;
  }>;
}

interface CFCategory {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  isClass: boolean;
  classId: number;
}

interface CFSearchResponse {
  data: CFMod[];
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
}

export function isConfigured(): boolean {
  return !!apiKey;
}

export interface VerifyResult {
  configured: boolean;
  valid: boolean;
  error?: string;
}

export async function verifyApiKey(): Promise<VerifyResult> {
  if (!apiKey) {
    return { configured: false, valid: false, error: 'API key not configured' };
  }

  try {
    // Use the games list endpoint - works with any valid API key
    const response = await fetch(`${CURSEFORGE_API_BASE}/v1/games`, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 403) {
        throw new Error('Invalid API key or insufficient permissions');
      }
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
    }

    return { configured: true, valid: true };
  } catch (e) {
    return { configured: true, valid: false, error: (e as Error).message };
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!apiKey) {
    throw new Error('CurseForge API key not configured');
  }

  const url = `${CURSEFORGE_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    Accept: 'application/json'
  };

  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...((options.headers as Record<string, string>) || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error: { message?: string };
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(error.message || errorText);
  }

  return response.json() as Promise<T>;
}

function mapClassIdToClassification(classId: number): string {
  // CurseForge Hytale class IDs (approximate mapping)
  // 6945 = Packs, 6946 = Plugins, 6947 = Bootstrap
  switch (classId) {
    case 6945:
      return 'PACK';
    case 6946:
      return 'PLUGIN';
    case 6947:
      return 'BOOTSTRAP';
    default:
      return 'PLUGIN';
  }
}

function transformFile(file: CFFile): ModVersion {
  return {
    id: String(file.id),
    version: file.displayName || file.fileName.replace(/\.jar$|\.zip$/i, ''),
    downloads: file.downloadCount,
    gameVersion: file.gameVersions?.[0] || '',
    releaseDate: file.fileDate,
    fileSize: file.fileLength,
    fileName: file.fileName
  };
}

function transformMod(mod: CFMod): ModProject {
  const versions = mod.latestFiles?.map(transformFile) || [];
  const latestFile = mod.latestFiles?.[0];

  return {
    id: String(mod.id),
    slug: mod.slug,
    title: mod.name,
    description: mod.summary,
    shortDescription: mod.summary.substring(0, 200),
    classification: mapClassIdToClassification(mod.classId),
    author: mod.authors?.[0]?.name || 'Unknown',
    downloads: mod.downloadCount,
    rating: mod.rating || mod.thumbsUpCount || 0,
    iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url || null,
    versions,
    latestVersion: latestFile ? transformFile(latestFile) : null,
    createdAt: mod.dateCreated,
    updatedAt: mod.dateModified,
    allowDistribution: mod.allowModDistribution !== false
  };
}

// Map sortBy param to CurseForge sortField enum
function mapSortField(sortBy: string): number {
  const mapping: Record<string, number> = {
    relevance: 1, // Featured
    popularity: 2,
    downloads: 6, // TotalDownloads
    updated: 3, // LastUpdated
    newest: 11, // ReleasedDate
    rating: 12,
    name: 4
  };
  return mapping[sortBy] || 6; // Default to downloads
}

export async function searchProjects(params: SearchParams = {}): Promise<SearchResult> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('gameId', String(HYTALE_GAME_ID));

    if (params.query) queryParams.append('searchFilter', params.query);
    if (params.classId) queryParams.append('classId', String(params.classId));
    if (params.categoryId) queryParams.append('categoryId', String(params.categoryId));
    if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);

    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 50); // CF max is 50
    queryParams.append('index', String((page - 1) * pageSize));
    queryParams.append('pageSize', String(pageSize));

    if (params.sortBy) {
      queryParams.append('sortField', String(mapSortField(params.sortBy)));
      queryParams.append('sortOrder', 'desc');
    }

    const endpoint = `/v1/mods/search?${queryParams.toString()}`;
    const response = await request<CFSearchResponse>(endpoint);

    return {
      success: true,
      projects: response.data.map(transformMod),
      total: response.pagination.totalCount,
      page: Math.floor(response.pagination.index / pageSize) + 1,
      pageSize: response.pagination.pageSize,
      hasMore: response.pagination.index + response.pagination.resultCount < response.pagination.totalCount
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      projects: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false
    };
  }
}

export async function getProject(projectId: string): Promise<ProjectResult> {
  try {
    const response = await request<{ data: CFMod }>(`/v1/mods/${projectId}`);
    return { success: true, project: transformMod(response.data) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getCategories(): Promise<ClassificationsResult> {
  try {
    const response = await request<{ data: CFCategory[] }>(`/v1/categories?gameId=${HYTALE_GAME_ID}&classesOnly=true`);

    const classifications = response.data.map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      classId: cat.id
    }));

    return { success: true, classifications };
  } catch (e) {
    return { success: false, error: (e as Error).message, classifications: [] };
  }
}

export async function getModFiles(modId: string): Promise<{ success: boolean; files: ModVersion[]; error?: string }> {
  try {
    const response = await request<{ data: CFFile[] }>(`/v1/mods/${modId}/files`);
    return {
      success: true,
      files: response.data.filter((f) => f.isAvailable).map(transformFile)
    };
  } catch (e) {
    return { success: false, error: (e as Error).message, files: [] };
  }
}

export async function downloadVersion(modId: string, fileId: string): Promise<DownloadResult> {
  try {
    if (!apiKey) {
      throw new Error('CurseForge API key not configured');
    }

    // Get the download URL from CurseForge API
    const urlResponse = await request<{ data: string }>(`/v1/mods/${modId}/files/${fileId}/download-url`);

    if (!urlResponse.data) {
      // Some mods don't allow API distribution
      throw new Error('This mod does not allow distribution via API. Download manually from CurseForge.');
    }

    // Download the file
    const response = await fetch(urlResponse.data);

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL or content-disposition
    let fileName: string | null = null;
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }

    if (!fileName) {
      // Extract from URL
      const urlPath = new URL(urlResponse.data).pathname;
      fileName = urlPath.split('/').pop() || null;
    }

    return { success: true, buffer, fileName };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
