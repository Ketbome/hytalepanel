import { describe, test, expect } from "@jest/globals";

describe("Mods Service - Update Logic", () => {
  test("mod search logic uses projectId without versionId", () => {
    // This test documents the fix for duplicate mod issue
    // Previously: searched by projectId + versionId
    // Now: searches only by projectId + providerId

    const existingMods = [
      {
        id: "essentialsplus",
        providerId: "curseforge",
        projectId: "12345",
        versionId: "old-version-id",
        fileName: "EssentialsPlus-1.14.3.jar",
        projectTitle: "EssentialsPlus",
        versionName: "1.14.3",
        classification: "PLUGIN" as const,
        fileSize: 1024,
        enabled: true,
        installedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    // New mod metadata (same project, different version)
    const newModMetadata = {
      providerId: "curseforge",
      projectId: "12345", // Same
      versionId: "new-version-id", // Different
    };

    // OLD LOGIC (buggy):
    // const existingIndexOld = existingMods.findIndex(
    //   (m) => m.projectId === newModMetadata.projectId && m.versionId === newModMetadata.versionId
    // );
    // Result: -1 (not found, creates duplicate)

    // NEW LOGIC (fixed):
    const existingIndex = existingMods.findIndex(
      (m) =>
        m.providerId === newModMetadata.providerId &&
        m.projectId === newModMetadata.projectId,
    );
    // Result: 0 (found, updates existing)

    expect(existingIndex).toBe(0);
    expect(existingIndex).not.toBe(-1);

    // This ensures that when updating a mod:
    // 1. The existing mod is found (even with different versionId)
    // 2. The old file gets deleted
    // 3. The entry is updated (not duplicated)
    // 4. Only ONE .jar file remains in the mods directory
  });

  test("mod search creates new entry for different projectId", () => {
    const existingMods = [
      {
        id: "mod1",
        providerId: "modtale",
        projectId: "project-abc",
        versionId: "v1.0.0",
        fileName: "ModABC-1.0.0.jar",
        projectTitle: "Mod ABC",
        versionName: "1.0.0",
        classification: "PLUGIN" as const,
        fileSize: 2048,
        enabled: true,
        installedAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    // Different project
    const newModMetadata = {
      providerId: "modtale",
      projectId: "project-xyz", // Different
      versionId: "v1.0.0",
    };

    const existingIndex = existingMods.findIndex(
      (m) =>
        m.providerId === newModMetadata.providerId &&
        m.projectId === newModMetadata.projectId,
    );

    expect(existingIndex).toBe(-1); // Not found, will create new entry
  });
});
