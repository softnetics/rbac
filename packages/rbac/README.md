# rbac

O(1) type safe role based access control

## Usage

create a policy

```ts
const policy = createPolicy({
  name: 'todo',
  permissions: {
    todo: ['create', 'read', 'update', 'delete'],
    comment: ['create', 'read', 'update'],
  },
  roles: {
    viewer: ['todo.read', 'comment.read'],
    editor: ['todo.create', 'todo.update', 'comment.create', 'comment.update'],
  },
})
```

permissions are defined as a map of resource to actions
roles are defined as a map of role to permissions

you also can use * to match all resources and actions

```ts
createPolicy({
  name: 'todo',
  permissions: {
    todo: ['create', 'read', 'update', 'delete'],
    comment: ['create', 'read', 'delete'],
  },
  roles: {
    viewer: ['todo.read', 'comment.read'],
    editor: ['todo.*', 'comment.delete'],
    admin: '*',
  },
})
```

create a identity

```ts
const identity = createIdentity({
  policies: [policy],
  identities: {
    student: ['todo.viewer'],
    teacher: ['todo.editor', 'todo.viewer'],
  },
})
```

identities are defined as a map of identity to roles

enforce a permission

```ts
identity.enforce('student', ['todo.todo.read']) // true
identity.enforce('student', ['todo.todo.create']) // false
```
