export type Permissions = { [key: string]: readonly string[] }
export type ResourceNameType<TPermission extends Permissions> = keyof TPermission extends string
  ? keyof TPermission
  : never

// each key of resource is a resource name
export type PermissionType<TPermission extends Permissions> = {
  [k in keyof TPermission]: k extends string ? `${k}.${TPermission[k][number]}` : never
}[keyof TPermission]

export type RoleType<TKey extends string, TPermission extends Permissions> = Record<
  TKey,
  readonly PermissionType<TPermission>[]
>

export type RolePermissionType<TPermission extends Permissions> =
  `${ResourceNameType<TPermission>}.${TPermission[ResourceNameType<TPermission>][number]}`

export interface Roles<TPermission extends Permissions> {
  [key: string]: readonly RolePermissionType<TPermission>[]
}

export type IamPolicyType<
  TPermission extends Permissions,
  TName extends string,
  TRoleKey extends string,
> = {
  name: TName
  permissions: TPermission
  roles: RoleType<TRoleKey, TPermission>
}

export type AllPolicyType<TPolicies extends readonly IamPolicyType<Permissions, string, string>[]> =
  TPolicies extends readonly [infer TPolicy, ...infer Rest]
    ? TPolicy extends IamPolicyType<Permissions, infer N, string>
      ? Rest extends IamPolicyType<Permissions, string, string>[]
        ?
            | {
                [k in keyof TPolicy['roles']]: `${N}.${k extends string ? k : ''}`
              }[keyof TPolicy['roles']]
            | AllPolicyType<Rest>
        : {
            [k in keyof TPolicy['roles']]: `${N}.${k extends string ? k : ''}`
          }[keyof TPolicy['roles']]
      : never
    : never

export type AllPermissionType<
  TPolicies extends readonly IamPolicyType<Permissions, string, string>[],
> = TPolicies extends readonly [infer TPolicy, ...infer Rest]
  ? TPolicy extends IamPolicyType<Permissions, infer N, string>
    ? Rest extends IamPolicyType<Permissions, string, string>[]
      ?
          | {
              [k in keyof TPolicy['permissions']]: `${N}.${k extends string
                ? k
                : ''}.${TPolicy['permissions'][k][number]}`
            }[keyof TPolicy['permissions']]
          | AllPermissionType<Rest>
      : {
          [k in keyof TPolicy['permissions']]: `${N}.${k extends string ? k : ''}`
        }[keyof TPolicy['permissions']]
    : never
  : never

export function createPolicy<
  const TPermission extends Permissions,
  TName extends string,
  TRoleKey extends string,
>({
  name,
  permissions,
  roles,
}: {
  name: TName
  permissions: TPermission
  roles: RoleType<TRoleKey, TPermission>
}): IamPolicyType<TPermission, TName, TRoleKey> {
  return {
    name,
    permissions,
    roles,
  } as const
}

//create role from many resource groups
export function createIdentity<
  TPermissions extends Permissions,
  TName extends string,
  TRoleKey extends string,
  const TPolicies extends readonly IamPolicyType<TPermissions, TName, TRoleKey>[],
  TRole extends string,
>({
  identities,
  policies,
}: {
  policies: TPolicies
  identities: Record<TRole, readonly AllPolicyType<TPolicies>[]>
}) {
  const table: Record<string, Set<string>> = {}
  const allPerm: Record<string, Set<string>> = {}

  policies.forEach((policy) => {
    Object.keys(policy.roles).forEach((role) => {
      const key = `${policy.name}.${role}`
      allPerm[key] = new Set()
      const permissions = policy.roles[role as TRoleKey]
      permissions.forEach((permission) => {
        allPerm[key].add(`${policy.name}.${permission}`)
      })
    })
  })

  Object.keys(identities).forEach((role) => {
    table[role] = new Set()
    identities[role as TRole].forEach((policy) => {
      Object.keys(policy).forEach((_role) => {
        const permissions = allPerm[policy]
        permissions.forEach((permission) => {
          table[role].add(permission)
        })
      })
    })
  })

  const enforce = (identity: TRole, permissions: readonly AllPermissionType<TPolicies>[]) => {
    return permissions.every((permission) => {
      return identity in table && table[identity].has(permission)
    })
  }

  return { enforce }
}
