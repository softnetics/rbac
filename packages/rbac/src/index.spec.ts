import { afterEach, describe, expect, it, vi } from "vitest";

import { createIdentity, createPermissionsGroup, createPolicy } from ".";

describe("rbac", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const policy1 = createPolicy({
    name: "hmp",
    permissions: {
      inventory: ["read", "write"],
      dashboard: ["read", "create"],
    },
  });
  const policy2 = createPolicy({
    name: "road",
    permissions: {
      inventory: ["read", "write"],
      dashboard: ["read", "create"],
    },
  });

  const group1 = createPermissionsGroup({
    name: "hmp",
    policies: [policy1],
    groups: {
      admin: ["hmp.inventory.write", "hmp.inventory.read"],
    },
  });

  const group2 = createPermissionsGroup({
    name: "road",
    policies: [policy1, policy2],
    groups: {
      admin: ["road.inventory.write", "road.inventory.read"],
      creator: ["hmp.dashboard.read", "road.inventory.read"],
    },
  });

  it("enforce should be defined", ({ expect }) => {
    const id = createIdentity({
      permissionGroups: { group1, group2 },
    });
    expect(id.enforce).toBeDefined();
  });

  describe("with mock store", () => {
    const policy1 = createPolicy({
      name: "hmp",
      permissions: {
        inventory: ["read", "write"],
        dashboard: ["read", "create"],
      },
    });

    const policy2 = createPolicy({
      name: "road",
      permissions: {
        inventory: ["read", "write"],
        dashboard: ["read", "create"],
      },
    });

    const group1 = createPermissionsGroup({
      name: "hmp",
      policies: [policy1],
      groups: {
        admin: [
          "hmp.inventory.write",
          "hmp.inventory.read",
          "hmp.dashboard.read",
          "hmp.dashboard.create",
        ],
        creator: ["hmp.dashboard.read", "hmp.inventory.read"],
      },
    });

    const group2 = createPermissionsGroup({
      name: "road",
      policies: [policy1, policy2],
      groups: {
        admin: [
          "road.inventory.write",
          "road.inventory.read",
          "road.dashboard.read",
          "road.dashboard.create",
        ],
        creator: ["hmp.dashboard.read", "road.inventory.read"],
      },
    });

    const id = createIdentity({
      permissionGroups: { group1, group2 },
    });

    describe("admin", () => {
      it("should have all permissions", async ({ expect }) => {
        expect(
          await id.enforce(
            ["hmp.admin", "hmp.creator", "road.admin", "road.creator"],
            [
              "road.dashboard.read",
              "road.dashboard.create",
              "road.inventory.read",
              "road.inventory.write",
              "hmp.inventory.write",
              "hmp.inventory.read",
              "hmp.dashboard.read",
              "hmp.dashboard.create",
            ]
          )
        ).toMatchObject({ allGranted: true });
      });
    });

    describe("user", () => {
      it("should have user permissions", async ({ expect }) => {
        expect(
          await id.enforce(
            ["hmp.creator", "road.creator"],
            ["hmp.inventory.read", "road.inventory.read", "hmp.dashboard.read"]
          )
        ).toMatchObject({ allGranted: true });
      });

      describe("should not have some permissions", async () => {
        it("some of permissions");
        expect(
          await id.enforce(
            ["road.creator", "hmp.creator"],
            [
              "road.dashboard.read",
              "road.dashboard.create",
              "road.inventory.write",
              "hmp.inventory.read",
              "hmp.dashboard.create",
            ]
          )
        ).toMatchObject({ allGranted: false });
        expect(
          await id.enforce(["hmp.admin"], ["road.dashboard.read"])
        ).toMatchObject({
          allGranted: false,
        });
      });
    });
  });

  describe("wildcard", () => {
    const policy1 = createPolicy({
      name: "hmp",
      permissions: {
        inventory: ["read", "write"],
        dashboard: ["read", "create"],
      },
    });

    const policy2 = createPolicy({
      name: "road",
      permissions: {
        inventory: ["read", "write"],
        dashboard: ["read", "create"],
      },
    });

    const group1 = createPermissionsGroup({
      name: "hmp",
      policies: [policy1, policy2],
      groups: {
        admin: ["hmp.*", "road.dashboard.*"],
      },
    });

    const id = createIdentity({
      permissionGroups: { group1 },
    });

    it("should have permissions", async ({ expect }) => {
      expect(
        await id.enforce(
          ["hmp.admin"],
          [
            "hmp.inventory.read",
            "hmp.inventory.write",
            "hmp.dashboard.read",
            "hmp.dashboard.create",
            "road.dashboard.read",
            "road.dashboard.create",
          ]
        )
      ).toMatchObject({ allGranted: true });
    });

    it("should not have permissions", async ({ expect }) => {
      expect(
        await id.enforce(
          ["hmp.admin"],
          [
            "hmp.inventory.read",
            "hmp.inventory.write",
            "hmp.dashboard.read",
            "hmp.dashboard.create",
            "road.inventory.read",
            "road.inventory.write",
          ]
        )
      ).toMatchObject({ allGranted: false });
    });
  });
});
