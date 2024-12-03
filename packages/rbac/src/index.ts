import * as R from "remeda";
export type MaybePromise<T> = T | Promise<T>;

export interface Policy {
  readonly name: string;
  readonly permissions: {
    readonly [key: string]: readonly string[];
  };
}

export type PermissionFromPolicy<TPolicy extends Policy> = {
  [TPermissionKey in keyof TPolicy["permissions"]]: TPermissionKey extends string
    ? `${TPolicy["name"]}.${TPermissionKey}.${TPolicy["permissions"][TPermissionKey][number]}`
    : never;
}[keyof TPolicy["permissions"]];

export type Permissions<TPolicies extends readonly Policy[]> = {
  [TPolicy in keyof TPolicies]: PermissionFromPolicy<TPolicies[TPolicy]>;
}[keyof TPolicies];

export type PermissionsWithWildcard<TPolicies extends readonly Policy[]> =
  | {
      [TPolicy in keyof TPolicies]: PermissionWildCardFromPolicy<
        TPolicies[TPolicy]
      >;
    }[keyof TPolicies]
  | Permissions<TPolicies>;

export type PermissionWildCardFromPolicy<TPolicy extends Policy> =
  | {
      [TPermissionKey in keyof TPolicy["permissions"]]: TPermissionKey extends string
        ? `${TPolicy["name"]}.${TPermissionKey}.*`
        : never;
    }[keyof TPolicy["permissions"]]
  | `${TPolicy["name"]}.*`;

export type PermissionsGroups<
  TPermissionsGroups extends readonly PermissionsGroup<any>[]
> = TPermissionsGroups extends [infer TPermissionsGroup, ...infer TRest]
  ?
      | PermissionsGroupPermissionsType<
          Extract<TPermissionsGroup, PermissionsGroup<any>>
        >
      | PermissionsGroups<Extract<TRest, readonly PermissionsGroup<any>[]>>
  : never;

export type PermissionsGroupPermissionsType<
  TPermissionsGroup extends PermissionsGroup<any>
> = {
  [TPermissionsGroupName in keyof TPermissionsGroup["groups"]]: `${TPermissionsGroup["name"]}.${Extract<
    TPermissionsGroupName,
    string
  >}`;
}[keyof TPermissionsGroup["groups"]];

export type PoliciesFormPermissionsGroup<
  TPermissionsGroup extends PermissionsGroup<any>
> = TPermissionsGroup extends PermissionsGroup<infer TPolicies>
  ? TPolicies
  : never;

export type PermissionsGroupsName<
  TPermissionsGroup extends PermissionsGroup<any>
> = PermissionsGroupName<TPermissionsGroup>;

export type PermissionsGroupName<
  TPermissionsGroup extends PermissionsGroup<any>
> = TPermissionsGroup extends TPermissionsGroup
  ? `${TPermissionsGroup["name"]}.${Extract<
      keyof TPermissionsGroup["groups"],
      string
    >}`
  : never;

export interface CreateIdentityArgs<
  TPermissionsGroup extends Record<string, PermissionsGroup<any>>
> {
  /**
   * list of permssions groups
   * */
  permissionGroups: TPermissionsGroup;
}

export interface PermissionsGroup<
  TPolicies extends readonly Policy[],
  TName extends string = string,
  TKeys extends string = string
> {
  readonly name: TName;
  readonly policies: TPolicies;
  readonly groups: Record<TKeys, readonly PermissionsWithWildcard<TPolicies>[]>;
}

export function createPolicy<const TPolicy extends Policy>(args: TPolicy) {
  return args;
}

export function createPermissionsGroup<
  const TPolicies extends Policy[],
  const TName extends string,
  const TKeys extends string
>(args: PermissionsGroup<TPolicies, TName, TKeys>) {
  return args;
}

export function createIdentity<
  const TPermissionsGroups extends Record<string, PermissionsGroup<any>>
>({
  permissionGroups: permissionGroupsArg,
}: CreateIdentityArgs<TPermissionsGroups>) {
  const getPolicies = (): Record<
    string,
    { permissions: Record<string, string[]> }
  > => {
    const ununiquePermissionGroupsArg = Object.values(
      permissionGroupsArg
    ).flatMap((g) => g.policies);

    const permissionGroupNames = new Set<string>();
    const distinctPermissionGroups: Record<
      string,
      { permissions: Record<string, string[]> }
    > = {};

    for (const permissionGroup of ununiquePermissionGroupsArg) {
      if (!permissionGroupNames.has(permissionGroup.name)) {
        distinctPermissionGroups[permissionGroup.name] = permissionGroup;
      }
    }
    return distinctPermissionGroups;
  };

  const policies = getPolicies();

  function permissionExtractor(p: string) {
    const permission = p.split(".");
    if (permission.length === 3 && permission[2] !== "*") {
      return [permission];
    }

    if (permission.length === 3) {
      const [name, resourceName] = permission;
      const actions = policies[name].permissions[resourceName];
      return actions.map((action: string) => [name, resourceName, action]);
    }

    // if (permission.length === 2)
    const [name] = permission;
    const resources = Object.entries(policies[name].permissions).flatMap(
      ([v, k]) => k.map((action) => [name, v, action])
    );
    return resources;
  }

  const permissionsToGroup = R.pipe(
    R.values(permissionGroupsArg) as PermissionsGroup<Policy[]>[],
    R.flatMap((g) =>
      R.flatMap(R.entries(g.groups), ([groupsName, permissions]) =>
        R.flatMap(permissions as string[], (p) =>
          R.flatMap(permissionExtractor(p), (v) => ({
            name: g.name,
            groupsName,
            policyName: v[0],
            resourceName: v[1],
            action: v[2],
          }))
        )
      )
    ),
    R.groupBy((v) => v.policyName),
    R.mapValues((v) =>
      R.pipe(
        v,
        R.groupBy((v) => v.resourceName),
        R.mapValues((v) =>
          R.pipe(
            v,
            R.groupBy((v) => v.action),
            R.mapValues((v) => R.map(v, (v) => `${v.name}.${v.groupsName}`))
          )
        )
      )
    )
  );

  const allPermissions = R.pipe(
    R.values(permissionGroupsArg) as PermissionsGroup<Policy[]>[],
    R.flatMap((g) =>
      R.pipe(
        g.policies,
        R.flatMap((policy) =>
          R.flatMap(R.entries(policy.permissions), ([resourceName, actions]) =>
            R.map(actions, (action) => `${g.name}.${resourceName}.${action}`)
          )
        )
      )
    )
  ) as Permissions<
    PoliciesFormPermissionsGroup<TPermissionsGroups[keyof TPermissionsGroups]>
  >[];

  const allGroups = R.flatMap(R.values(permissionGroupsArg), (v) =>
    R.flatMap(R.keys(v.groups), (g) => `${v.name}.${g}`)
  ) as PermissionsGroupsName<TPermissionsGroups[keyof TPermissionsGroups]>[];

  async function enforce(
    permissionGroups: PermissionsGroupsName<
      TPermissionsGroups[keyof TPermissionsGroups]
    >[],
    permissions: Permissions<
      PoliciesFormPermissionsGroup<TPermissionsGroups[keyof TPermissionsGroups]>
    >[]
  ) {
    const grantedPermissions = permissions.map((p) => {
      const [name, resourceName, action] = p.split(".");
      const groups = permissionsToGroup?.[name]?.[resourceName]?.[action] ?? [];
      return groups.some((g) => permissionGroups.includes(g as any));
    });

    return {
      allGranted:
        permissionGroups.length !== 0 &&
        grantedPermissions.every((granted) => granted),
      grantedPermissions,
    };
  }

  return {
    enforce,
    allPermissions,
    allGroups,
    permissionsToGroup,
    permissionExtractor,
  };
}
