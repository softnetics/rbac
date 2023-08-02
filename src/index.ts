export type Permissions = { [key: string]: readonly string[] }
export type ResourceNameType<TPermission extends Permissions> = keyof TPermission extends string
  ? keyof TPermission
  : never

// each key of resource is a resource name
export type PermissionType<TPermission extends Permissions> = {
  [k in keyof TPermission]: k extends string ? `${k}.${TPermission[k][number]}` | `${k}.*` : never
}[keyof TPermission]

export type PermissionUnionType<TPermission extends Permissions> =
  | readonly PermissionType<TPermission>[]
  | '*'

export type RoleType<TKey extends string, TPermission extends Permissions> = Record<
  TKey,
  PermissionUnionType<TPermission>
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
  const table: Record<string, Record<string, boolean>> = {}
  const allPerm: Record<string, Set<string>> = {}

  const identityList = Object.keys(table) as TRole[]
  const allPermissions: AllPermissionType<TPolicies>[] = []

  policies.forEach((policy) => {
    Object.keys(policy.roles).forEach((role) => {
      const key = `${policy.name}.${role}`
      allPerm[key] = new Set()
      const permissions = policy.roles[role as TRoleKey]
      if (permissions === '*') {
        Object.keys(policy.permissions).forEach((permission) => {
          policy.permissions[permission].forEach((p) => {
            allPerm[key].add(`${policy.name}.${permission}.${p}`)
          })
        })
      } else {
        permissions.forEach((permissions) => {
          if (permissions.endsWith('.*')) {
            policy.permissions[permissions.replace('.*', '')].forEach((p) => {
              allPerm[key].add(`${policy.name}.${permissions.replace('.*', '')}.${p}`)
            })
            return
          }
          allPerm[key].add(`${policy.name}.${permissions}`)
        })
      }
    })
  })

  Object.keys(identities).forEach((role) => {
    table[role] = {}
    identities[role as TRole].forEach((policy) => {
      Object.keys(policy).forEach((_role) => {
        const permissions = allPerm[policy]
        permissions.forEach((permission) => {
          table[role][permission] = true
        })
      })
    })
  })

  const enforce = (identity: TRole, permissions: readonly AllPermissionType<TPolicies>[]) => {
    return permissions.every((permission) => {
      return table[identity] !== undefined && table[identity][permission] === true
    })
  }

  return { identities: identityList, allPermissions, enforce }
}
