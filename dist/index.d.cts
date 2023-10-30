type Permissions = {
    [key: string]: readonly string[];
};
type ResourceNameType<TPermission extends Permissions> = keyof TPermission extends string ? keyof TPermission : never;
type PermissionType<TPermission extends Permissions> = {
    [k in keyof TPermission]: k extends string ? `${k}.${TPermission[k][number]}` | `${k}.*` : never;
}[keyof TPermission];
type PermissionUnionType<TPermission extends Permissions> = readonly PermissionType<TPermission>[] | '*';
type RoleType<TKey extends string, TPermission extends Permissions> = Record<TKey, PermissionUnionType<TPermission>>;
type RolePermissionType<TPermission extends Permissions> = `${ResourceNameType<TPermission>}.${TPermission[ResourceNameType<TPermission>][number]}`;
interface Roles<TPermission extends Permissions> {
    [key: string]: readonly RolePermissionType<TPermission>[];
}
type IamPolicyType<TPermission extends Permissions, TName extends string, TRoleKey extends string> = {
    name: TName;
    permissions: TPermission;
    roles: RoleType<TRoleKey, TPermission>;
};
type AllPolicyType<TPolicies extends readonly IamPolicyType<Permissions, string, string>[]> = TPolicies extends readonly [infer TPolicy, ...infer Rest] ? TPolicy extends IamPolicyType<Permissions, infer N, string> ? Rest extends IamPolicyType<Permissions, string, string>[] ? {
    [k in keyof TPolicy['roles']]: `${N}.${k extends string ? k : ''}`;
}[keyof TPolicy['roles']] | AllPolicyType<Rest> : {
    [k in keyof TPolicy['roles']]: `${N}.${k extends string ? k : ''}`;
}[keyof TPolicy['roles']] : never : never;
type AllPermissionType<TPolicies extends readonly IamPolicyType<Permissions, string, string>[]> = TPolicies extends readonly [infer TPolicy, ...infer Rest] ? TPolicy extends IamPolicyType<Permissions, infer N, string> ? Rest extends IamPolicyType<Permissions, string, string>[] ? {
    [k in keyof TPolicy['permissions']]: `${N}.${k extends string ? k : ''}.${TPolicy['permissions'][k][number]}`;
}[keyof TPolicy['permissions']] | AllPermissionType<Rest> : {
    [k in keyof TPolicy['permissions']]: `${N}.${k extends string ? k : ''}`;
}[keyof TPolicy['permissions']] : never : never;
declare function createPolicy<const TPermission extends Permissions, TName extends string, TRoleKey extends string>({ name, permissions, roles, }: {
    name: TName;
    permissions: TPermission;
    roles: RoleType<TRoleKey, TPermission>;
}): IamPolicyType<TPermission, TName, TRoleKey>;
declare function createIdentity<TPermissions extends Permissions, TName extends string, TRoleKey extends string, const TPolicies extends readonly IamPolicyType<TPermissions, TName, TRoleKey>[], TRole extends string>({ identities, policies, }: {
    policies: TPolicies;
    identities: Record<TRole, readonly AllPolicyType<TPolicies>[]>;
}): {
    identities: TRole[];
    allPermissions: AllPermissionType<TPolicies>[];
    enforce: (identity: TRole, permissions: readonly AllPermissionType<TPolicies>[]) => boolean;
};

export { AllPermissionType, AllPolicyType, IamPolicyType, PermissionType, PermissionUnionType, Permissions, ResourceNameType, RolePermissionType, RoleType, Roles, createIdentity, createPolicy };
